# PyU-Go-Connect: Integration Best Practices & Quick Reference

**Purpose:** Practical guide for developers implementing fixes and new features  
**Date:** April 15, 2026

---

## INTEGRATION PATTERNS TO FOLLOW

### 1. Atomic Database Operations

**✅ CORRECT:**
```typescript
// Use transaction wrapper for multi-step operations
const response = await supabase.rpc('create_booking_atomic', {
  user_id: userId,
  schedule_id: scheduleId,
  seats: [1, 2, 3],
  // RPC function handles: BEGIN...INSERT...UPDATE...COMMIT
});
```

**❌ INCORRECT:**
```typescript
// Multiple separate queries (not atomic)
await supabase.from('shuttle_bookings').insert({...});
await supabase.from('shuttle_seats').insert({...});  // Could fail!
await supabase.from('shuttle_schedules').update({...});
```

**Key Rule:** If operation involves multiple tables, use RPC or transaction

---

### 2. Data Consistency with Denormalization

**✅ CORRECT - Use Triggers:**
```sql
-- If denormalizing driver.full_name from profiles
CREATE OR REPLACE FUNCTION sync_profile_to_driver()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drivers SET full_name = NEW.full_name
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_update_sync AFTER UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_profile_to_driver();
```

**❌ INCORRECT - Manual Sync:**
```typescript
// Trying to sync manually in code
const profile = await supabase.from('profiles').select('*').eq('id', userId).single();
await supabase.from('drivers').update({full_name: profile.full_name}).eq('user_id', userId);
// But what if someone else updates drivers.full_name directly?
```

**Key Rule:** If data duplicated, use trigger to keep in sync

---

### 3. API Validation & Error Handling

**✅ CORRECT:**
```typescript
// Edge function: Validate input + handle errors gracefully
Deno.serve(async (req) => {
  try {
    // 1. Validate JWT
    const user = await validateAuth(req);
    if (!user) throw new Error('Unauthorized');
    
    // 2. Parse & validate input
    const body = await req.json();
    if (!body.amount || body.amount <= 0) {
      throw new ValidationError('Invalid amount');
    }
    
    // 3. Business logic with error handling
    const result = await processPayment(user.id, body.amount);
    
    // 4. Return success
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    // 5. Return appropriate error
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({error: error.message}), { status: 400 });
    }
    return new Response(JSON.stringify({error: 'Internal server error'}), { status: 500 });
  }
});
```

**❌ INCORRECT:**
```typescript
// No validation, no error handling
Deno.serve(async (req) => {
  const body = await req.json();
  const result = await processPayment(body.user_id, body.amount);
  return new Response(JSON.stringify(result));
});
```

**Key Rule:** Validate input + authenticate user + handle errors explicitly

---

### 4. Real-Time Subscriptions

**✅ CORRECT - Limited Scope:**
```typescript
// useDriverTracking.ts
export function useDriverTracking(riderLocation: LatLng, radiusKm: number) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  useEffect(() => {
    // Subscribe to ONLY available drivers within radius
    const channel = supabase
      .channel(`drivers-near-${riderLocation.lat}-${riderLocation.lng}`)
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "drivers",
          filter: `status=eq.available`  // Server-side filter!
        },
        (payload) => {
          const driver = payload.new as Driver;
          const distance = calculateDistance(riderLocation, {
            lat: driver.current_lat,
            lng: driver.current_lng
          });
          
          if (distance <= radiusKm) {
            // Client-side double-check
            setDrivers(prev => updateDriver(prev, driver));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderLocation, radiusKm]);
  
  return drivers;
}
```

**❌ INCORRECT - Global Subscription:**
```typescript
// Subscribes to ALL driver changes globally
const channel = supabase
  .channel("all-drivers")
  .on("postgres_changes", 
    { event: "*", schema: "public", table: "drivers" },
    (payload) => { setDrivers(prev => [...prev, payload.new]); }
  )
  .subscribe();
// Result: 300+ messages/sec, battery drain!
```

**Key Rule:** Always filter real-time subscriptions to relevant data

---

### 5. Payment Processing

**✅ CORRECT - Idempotent & Verifiable:**
```typescript
// Edge function: process-payment
Deno.serve(async (req) => {
  const { orderId, amount, paymentToken } = await req.json();
  
  // 1. Check if already processed (idempotency)
  const existing = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('external_order_id', orderId)
    .eq('status', 'completed')
    .maybeSingle();
  
  if (existing) {
    return new Response(JSON.stringify({
      status: 'already_completed',
      transaction: existing
    }), { status: 200 });
  }
  
  // 2. Process payment
  const result = await midtrans.charge({
    order_id: orderId,
    amount: amount,
    token: paymentToken
  });
  
  // 3. Verify amount matches
  if (result.amount !== amount) {
    throw new Error('Amount mismatch');
  }
  
  // 4. Save to database
  const { data, error } = await supabase
    .from('wallet_transactions')
    .insert({
      external_order_id: orderId,
      amount: amount,
      status: result.status,
      verified_at: new Date()
    })
    .select()
    .single();
  
  // 5. Return with 200/201 (not 202, no retry)
  return new Response(JSON.stringify({status: 'success', data}), { status: 200 });
});
```

**❌ INCORRECT - Not Idempotent:**
```typescript
// No idempotency check - same webhook processed twice = double charge!
const amount = await supabase
  .from('wallet_transactions')
  .insert({amount: 100000, status: 'completed'});

const result = await midtrans.charge({amount: 100000});
// If webhook arrives twice, both inserts succeed → 2x charge!
```

**Key Rule:** All payment operations must be idempotent

---

## COMMON PITFALLS TO AVOID

### 🚫 Pitfall 1: Stale State During Long Operations

**Problem:**
```typescript
// User sees old wallet balance while payment processing
const {wallet_balance} = await fetchUserWallet();  // Rp 100,000
await initiatePayment(50000);  // User wallet shows still Rp 100,000 for 5 seconds
// User might try to pay again thinking first failed
```

**Solution:**
```typescript
// Optimistic update
setWalletBalance(prev => prev - 50000);  // Update UI immediately
await initiatePayment(50000);
// If fails, roll back
.catch(error => {
  setWalletBalance(prev => prev + 50000);
  showError(error);
});
```

---

### 🚫 Pitfall 2: Unhandled Race Conditions

**Problem:**
```typescript
// User clicks "Accept Ride" twice
if (ride.status === 'pending') {
  await acceptRide(rideId);
}
// But if network slow, both clicks proceed → Driver accepts ride twice
```

**Solution:**
```typescript
// Use optimistic lock
const [ride, error] = await acceptRideAtomically(rideId, expectedStatus='pending');
if (error === 'CONFLICT') {
  // Someone else accepted it
  showError('Ride already accepted');
} else {
  // Safe: ride.status is now 'accepted'
}
```

---

### 🚫 Pitfall 3: Not Verifying Data Before Committing

**Problem:**
```typescript
// User enters fare that doesn't match calculated
const {fare} = await calculateFare(pickup, dropoff);
// User modifies form: fare = "5000000" (typed manually!)
await createRide({fare: userInputFare});
// Server doesn't verify, ride created with wrong fare
```

**Solution:**
```typescript
// Always verify server-side
const {fare} = await calculateFare(pickup, dropoff);
// User pays amount: userInputFare

if (Math.abs(fare - userInputFare) > 1000) {
  // More than Rp 1000 difference
  throw new Error('Fare mismatch, possible fraud');
}

// Then create ride with server-calculated fare
await createRide({fare: fare});  // Use server value, not user input!
```

---

### 🚫 Pitfall 4: Missing Cascade Delete Handling

**Problem:**
```sql
-- If user deleted without cascade delete:
DELETE FROM profiles WHERE user_id = 'X';
-- But drivers table still has:
SELECT * FROM drivers WHERE user_id = 'X';  -- Still exists (orphaned)!
```

**Solution:**
```sql
-- Use proper foreign key with cascade
ALTER TABLE drivers 
ADD CONSTRAINT fk_drivers_user 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;  -- Automatically delete drivers if user deleted

-- Or protect from deletion
ALTER TABLE drivers
ADD CONSTRAINT check_no_orphaned_drivers
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE RESTRICT;  -- Prevent deletion if drivers exist
```

---

### 🚫 Pitfall 5: Not Implementing Timeout on Long Operations

**Problem:**
```typescript
// User books shuttle, payment processing
await initiatePayment(amount);  // What if this never completes?
// User waits forever, then closes browser
// Payment could still go through later
// User has no ride, but was charged!
```

**Solution:**
```typescript
// Implement timeout
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout after 30s')), 30000)
);

try {
  const result = await Promise.race([
    initiatePayment(amount),
    timeoutPromise
  ]);
  showSuccess();
} catch (error) {
  if (error.message === 'Timeout after 30s') {
    showError('Payment taking longer than expected. Status: PENDING');
    // Show button to check status
    <button onClick={() => checkPaymentStatus()}>Check Status</button>
  }
}
```

---

### 🚫 Pitfall 6: Missing Input Sanitization

**Problem:**
```typescript
// User enters comment on ride review
const comment = userInput;  // "'; DROP TABLE rides; --"
await supabase.from('ride_ratings').insert({
  comment: comment  // Could inject SQL if not sanitized!
});
```

**Solution:**
```typescript
// Validate & sanitize all input
import { DOMPurify } from 'dompurify';

const cleanComment = DOMPurify.sanitize(userInput);
const limitedComment = cleanComment.substring(0, 500);  // Max 500 chars

// Server-side validation
if (!cleanComment || cleanComment.length === 0) {
  throw new Error('Comment cannot be empty');
}

await supabase.from('ride_ratings').insert({
  comment: limitedComment
});
```

---

### 🚫 Pitfall 7: Mixing Client & Server State

**Problem:**
```typescript
// Frontend duplicates business logic
const estimatedFare = calculateFareLocally(distance);
// But backend uses different calculation
const actualFare = calculateFareOnServer(distance);
// If different: User sees Rp 50,000, gets charged Rp 60,000
```

**Solution:**
```typescript
// Display server-calculated fare ONLY
const estimatedFare = await fetchFareFromServer(distance);
// Show: "Estimated fare: Rp 50,000"
// On completion, charge actual fare from server
// User understands: Final fare may vary

// If need local estimate (for UX), use SAME logic as server
```

---

## DEBUGGING INTEGRATION ISSUES

### Network Issues

```typescript
// Check network tab in DevTools
1. Request: Look at headers (Authorization: Bearer TOKEN)
2. Response: Check status (200, 400, 401, 500)
3. Body: Look at error message
4. Timing: How long did request take?

Common statuses:
- 401: No auth token, expired session → Re-login
- 403: Authenticated but no permission → Check RLS policy
- 409: Conflict (e.g., duplicate insert) → Race condition
- 429: Too many requests → Rate limited
- 500: Server error → Check backend logs
```

### Database Issues

```sql
-- Check RLS policy is working
-- Enable policy debugging:
SELECT * FROM pg_policies WHERE table_name = 'rides' AND command = 'SELECT';

-- Test policy manually:
SET "request.jwt.claims.sub" = 'user-123';
SELECT * FROM rides;  -- Should only see this user's rides

-- Check for N+1 queries
EXPLAIN ANALYZE
SELECT d.* FROM drivers d 
WHERE d.status = 'available'
LIMIT 1;
-- Look for: seq_scan → Need INDEX
-- Look for: bitmap index scan → Good
```

### Real-Time Issues

```typescript
// Check WebSocket connection
1. Open DevTools → Network → Filter: WS
2. Look for: wss://db.instance.com/realtime/v1
3. Status: Connected (Green)
4. If red: Connection failed
5. Check console for: "PostgreSQL changes failed"

// Debug channel subscription
const channel = supabase.channel('test');
channel
  .on('postgres_changes', {...}, (payload) => {
    console.log('Update received:', payload);
  })
  .subscribe(
    (status) => console.log('Channel status:', status)
  );
// Watch console: SUBSCRIBED → TIMED_OUT → CLOSED
```

---

## PERFORMANCE DEBUGGING

### Slow Query

```sql
-- Add EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT drivers.* FROM drivers
WHERE status = 'available'
  AND distance(current_location, ST_Point(?, ?)) < ?
ORDER BY rating DESC
LIMIT 10;

-- Look for:
-- "Seq Scan" → Need INDEX
-- "Index Scan" → Good, but slow?
-- "Index Skip Scan" → Excellent
-- "Total time: 5000ms" → Slow!

-- Add index:
CREATE INDEX idx_drivers_status_location 
ON drivers (status, current_location);
-- Re-run EXPLAIN ANALYZE → Should see "Index Scan" + faster time
```

### Slow API

```typescript
// Check edge function timing
console.time('auth');
const user = await validateAuth(req);
console.timeEnd('auth');  // auth: 50ms

console.time('query');
const data = await supabase.from('users').select('*');
console.timeEnd('query');  // query: 200ms

console.time('process');
const result = processData(data);
console.timeEnd('process');  // process: 10ms

// Total: 260ms (if any > 1000ms, investigate)
```

---

## TESTING CRITICAL FLOWS

### Test Payment Race Condition

```typescript
// Try to process 2 payments simultaneously
const userId = 'test-user-123';
const amount = 50000;

const [result1, result2] = await Promise.all([
  processPayment(userId, amount),  // Request 1
  processPayment(userId, amount)   // Request 2 (simultaneous)
]);

// Check: Only one should succeed or both should fail (no double charge)
console.assert(
  result1.status === 'success' && result2.status === 'duplicate' ||
  result1.status === 'duplicate' && result2.status === 'success' ||
  result1.status === 'failed' && result2.status === 'failed'
);
```

### Test Shuttle Overbooking

```typescript
// Try to book same seat with 2 concurrent requests
const scheduleId = 'shuttle-123';
const seatNumber = 5;

const [booking1, booking2] = await Promise.all([
  bookShuttleSeat(scheduleId, seatNumber, 'user1'),
  bookShuttleSeat(scheduleId, seatNumber, 'user2')
]);

// Check: Only one booking should succeed
console.assert(
  (booking1.status === 'success' && booking2.status === 'conflict') ||
  (booking1.status === 'conflict' && booking2.status === 'success')
);
```

### Test API Rate Limiting

```typescript
// Send 15 requests from same user (limit is 10)
for (let i = 0; i < 15; i++) {
  const response = await fetch('/api/calculate-fare', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${token}`},
    body: JSON.stringify({...})
  });
  
  console.log(`Request ${i}: ${response.status}`);
  // Requests 1-10: 200 OK
  // Requests 11-15: 429 Too Many Requests
}
```

---

## CHECKLIST: Before Submitting Code

- [ ] All API calls include `await` (no unhandled promises)
- [ ] All operations have error handling (try/catch or .catch())
- [ ] All state updates are immutable (not mutating directly)
- [ ] All sensitive data is validated server-side
- [ ] All database operations are atomic (use RLS + transactions)
- [ ] All async operations have timeout
- [ ] All real-time subscriptions have cleanup (unsubscribe)
- [ ] All external API calls have retry logic
- [ ] All user input is sanitized & validated
- [ ] All error messages are user-friendly (not technical)
- [ ] All performance-critical code is optimized (no N+1)
- [ ] All changes have test cases

---

## REFERENCE: Module Integration Map

```
✅ Correct Flow:    Auth → User/Driver → Ride/Shuttle → Payment → Wallet
❌ Avoid:          Direct DB access, skipping service layer
❌ Avoid:          Multiple API calls for one operation (use RPC)
✅ Do:             Use edge functions for complex logic
✅ Do:             Atomic transactions for multi-table operations
✅ Do:             Server-side verification before committing
```

---

**Questions?** Review the full SYSTEM_INTEGRATION_ANALYSIS.md for detailed context and diagrams.

