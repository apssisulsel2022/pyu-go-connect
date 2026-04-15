# 🗺️ COMPREHENSIVE IMPLEMENTATION ROADMAP
## PyU-GO Connect: From Audit to Production Ready

**Created:** April 15, 2026  
**Status:** Ready for Execution  
**Duration:** 6 Weeks (3 developers)  
**Budget:** $75,000

---

## 📋 ROADMAP OVERVIEW

```
PHASE 1: Emergency Stabilization      PHASE 2: Operational Readiness      PHASE 3: Quality & Scale
(Week 1 - 2 days)                     (Weeks 2-3 - 10 days)               (Weeks 4-6 - 15 days)
├─ Critical fixes only                ├─ Major issue fixes                 ├─ Comprehensive testing
├─ Security hardening                 ├─ Feature completion                ├─ Performance optimization
├─ Deployment to staging              ├─ Operational setup                 ├─ Documentation
└─ Security audit                     └─ Load testing                      └─ Production ready
```

---

## 🔴 PHASE 1: EMERGENCY STABILIZATION
### Timeline: Week 1 (5 working days)
### Effort: 22 hours (2 developers)
### Status: CRITICAL PATH - Must complete before any testing

---

### PHASE 1.1: Security Hardening (Days 1-2)
**Owner:** Senior Backend Developer  
**Effort:** 10 hours

#### Task 1.1.1: Move Session Token to HttpOnly Cookie
**Severity:** 🔴 CRITICAL  
**Effort:** 2 hours  
**Blockers:** None  

**Current Problem:**
```typescript
// CURRENT - VULNERABLE
localStorage.setItem('auth_token', jwt_token);  // XSS attack can steal this
```

**Implementation Steps:**
1. Update `AuthService.ts` to return cookies instead of localStorage
2. Configure Supabase to set HttpOnly cookie automatically
3. Update all API calls to send credentials with requests
4. Remove localStorage auth token usage
5. Test with XSS simulation

**Code Changes:**

```typescript
// src/services/AuthService.ts - UPDATE

// BEFORE
export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);  // VULNERABLE
};

// AFTER
export const setAuthToken = (token: string) => {
  // Supabase handles HttpOnly cookie internally
  // No need to store in localStorage
  // Cookie is automatically sent with all requests
};

// All fetch calls need credentials
const response = await fetch('/api/endpoint', {
  credentials: 'include',  // Send cookie with request
  headers: { 'Content-Type': 'application/json' }
});
```

**Testing:**
- [ ] Token not visible in localStorage
- [ ] Token not visible in browser DevTools
- [ ] API calls still work with cookie
- [ ] XSS attack cannot access token
- [ ] Cross-domain requests correctly send cookie

**Verification:**
```bash
# Test that localStorage is clean
npx playwright test -c security/token-storage.spec.ts

# Test that API works with credentials
npm run test -- auth.cookie.test.ts
```

---

#### Task 1.1.2: Add JWT Validation Middleware
**Severity:** 🔴 CRITICAL  
**Effort:** 2 hours  
**Blockers:** None  

**Current Problem:**
```typescript
// CURRENT - VULNERABLE
app.get('/api/users', (req, res) => {
  // NO AUTH CHECK - anyone can access
  res.json(getAllUsers());
});
```

**Implementation Steps:**
1. Create auth middleware in `src/middleware/authMiddleware.ts`
2. Apply middleware to all protected routes
3. Verify JWT signature and expiration
4. Extract user from JWT
5. Test with invalid tokens

**Code Changes:**

```typescript
// src/middleware/authMiddleware.ts - NEW FILE

import { createClient } from '@supabase/supabase-js';

export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies['sb-access-token'];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify with Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Apply to routes
app.use('/api/protected', authMiddleware);
```

**Testing:**
- [ ] Valid token accepted
- [ ] Expired token rejected
- [ ] Invalid token rejected
- [ ] No token rejected
- [ ] User info available in middleware

---

#### Task 1.1.3: Implement Rate Limiting
**Severity:** 🔴 CRITICAL  
**Effort:** 2 hours  
**Blockers:** None  

**Current Problem:**
```
System has no rate limiting
DDoS attack: 10,000 requests/second
Result: Server crashes, all users blocked
```

**Implementation Steps:**
1. Install `express-rate-limit`
2. Configure different limits for different endpoints
3. Use in-memory store initially (upgrade to Redis in Phase 2)
4. Return 429 status when limit exceeded
5. Test with load testing tool

**Code Changes:**

```typescript
// src/middleware/rateLimit.ts - NEW FILE

import rateLimit from 'express-rate-limit';

// General API limit
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Stricter limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // Only 5 login attempts per 15 min
  message: 'Too many login attempts, please try again later'
});

// Payment endpoints - very strict
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,               // 10 requests per minute
  message: 'Rate limit exceeded on payment endpoint'
});

// Apply to routes
app.post('/auth/login', authLimiter, loginHandler);
app.post('/payment/checkout', paymentLimiter, checkoutHandler);
app.use('/api/', generalLimiter);
```

**Testing:**
- [ ] Requests within limit accepted
- [ ] Requests over limit rejected (429)
- [ ] Rate limit counter resets properly
- [ ] Different endpoints have different limits
- [ ] Load test: 1000 req/sec handled correctly

---

### PHASE 1.2: Data Integrity Fixes (Days 2-3)
**Owner:** Senior Backend Developer  
**Effort:** 12 hours

#### Task 1.2.1: Fix Wallet Balance Race Condition
**Severity:** 🔴 CRITICAL  
**Effort:** 2 hours  
**Blockers:** None  

**Current Problem:**
```sql
-- CURRENT - VULNERABLE
UPDATE wallets SET balance = balance - 100 WHERE user_id = 'user123';
-- Issue: Two concurrent requests both subtract 100
-- Expected: balance -= 200, Actual: balance -= 100 (one lost)
```

**Implementation Steps:**
1. Create RPC function for atomic balance update
2. Use database-level locking
3. Add transaction with SERIALIZABLE isolation
4. Update balance operations to use RPC
5. Test with concurrent requests

**Code Changes:**

```sql
-- supabase/migrations/20260415000001_fix_wallet_race.sql

-- Create atomic wallet update RPC
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_id uuid
)
RETURNS json AS $$
DECLARE
  v_new_balance numeric;
  v_current_balance numeric;
BEGIN
  -- Get current balance with lock
  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;  -- Database-level lock
  
  -- Verify sufficient balance
  IF v_current_balance + p_amount < 0 THEN
    RETURN json_build_object('error', 'Insufficient balance');
  END IF;
  
  -- Update balance atomically
  UPDATE wallets
  SET balance = balance + p_amount
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- Record transaction atomically
  INSERT INTO transactions (
    user_id, amount, transaction_id, type, status, created_at
  ) VALUES (
    p_user_id, p_amount, p_transaction_id, 'balance_update', 'completed', NOW()
  );
  
  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql;

-- Update RLS to prevent direct balance updates
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- New RLS policy: Users can only read own wallet
CREATE POLICY "Users can read own wallet"
ON wallets FOR SELECT
USING (auth.uid() = user_id);

-- Remove permission to update balance directly
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;

-- Document: Balance updates ONLY through RPC
COMMENT ON FUNCTION update_wallet_balance IS 'CRITICAL: Use this RPC instead of direct UPDATE statements. Ensures transaction safety and prevents race conditions.';
```

**Application Changes:**

```typescript
// src/services/WalletService.ts - UPDATE

export class WalletService {
  // BEFORE - VULNERABLE
  static async deductBalance(userId: string, amount: number) {
    const { data, error } = await supabase
      .from('wallets')
      .update({ balance: supabase.raw(`balance - ${amount}`) })
      .eq('user_id', userId);
    return data;
  }
  
  // AFTER - SAFE
  static async deductBalance(userId: string, amount: number, transactionId: string) {
    const { data, error } = await supabase
      .rpc('update_wallet_balance', {
        p_user_id: userId,
        p_amount: -amount,
        p_transaction_id: transactionId
      });
    
    if (error) throw error;
    return data;
  }
}
```

**Testing:**
- [ ] Single concurrent request: balance updated correctly
- [ ] Two concurrent requests: both applied correctly
- [ ] Insufficient balance: rejected properly
- [ ] Insufficient balance + concurrent: no partial deduction
- [ ] Load test: 100 concurrent requests, all correct

**Verification:**
```bash
# Test concurrent wallet updates
npm run test -- wallet.concurrent.test.ts

# Load test wallet endpoint
npx artillery run load-tests/wallet-concurrent.yml
```

---

#### Task 1.2.2: Fix Shuttle Seat Overbooking
**Severity:** 🔴 CRITICAL  
**Effort:** 3 hours  
**Blockers:** Task 1.2.1 (needs atomic transactions understanding)  

**Current Problem:**
```
Shuttle has 12 seats
15 users book simultaneously
Result: 15 bookings in database (overbooking by 25%)
```

**Implementation Steps:**
1. Add unique constraint on shuttle-seat pair
2. Create atomic booking transaction RPC
3. Check seat availability BEFORE booking
4. Prevent double-booking at database level
5. Test with concurrent bookings

**Code Changes:**

```sql
-- supabase/migrations/20260415000002_fix_seat_overbooking.sql

-- Ensure shuttle_schedule has total_seats column
ALTER TABLE shuttle_schedules ADD COLUMN IF NOT EXISTS total_seats INTEGER DEFAULT 12;

-- Create new table for seat allocation (one row per seat per schedule)
CREATE TABLE IF NOT EXISTS shuttle_schedule_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES shuttle_schedules(id),
  seat_number INTEGER NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  booking_id uuid REFERENCES shuttle_bookings(id),
  booked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, seat_number)
);

-- Create index for quick lookup
CREATE INDEX idx_shuttle_seats_schedule_unbooked 
ON shuttle_schedule_seats(schedule_id) 
WHERE is_booked = FALSE;

-- Create atomic booking RPC
CREATE OR REPLACE FUNCTION create_shuttle_booking_safe(
  p_user_id uuid,
  p_schedule_id uuid,
  p_seats_needed INTEGER
)
RETURNS json AS $$
DECLARE
  v_booking_id uuid;
  v_available_seats INTEGER;
BEGIN
  -- Count available seats with lock
  SELECT COUNT(*) INTO v_available_seats
  FROM shuttle_schedule_seats
  WHERE schedule_id = p_schedule_id 
    AND is_booked = FALSE
  FOR UPDATE;  -- Lock all seat rows
  
  -- Check if enough seats available
  IF v_available_seats < p_seats_needed THEN
    RETURN json_build_object(
      'error', 'Not enough seats available',
      'requested', p_seats_needed,
      'available', v_available_seats
    );
  END IF;
  
  -- Create booking
  INSERT INTO shuttle_bookings (
    user_id, schedule_id, status, created_at
  ) VALUES (
    p_user_id, p_schedule_id, 'pending', NOW()
  ) RETURNING id INTO v_booking_id;
  
  -- Mark seats as booked (atomic)
  UPDATE shuttle_schedule_seats
  SET is_booked = TRUE,
      booking_id = v_booking_id,
      booked_at = NOW()
  WHERE schedule_id = p_schedule_id 
    AND is_booked = FALSE
  LIMIT p_seats_needed;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id
  );
END;
$$ LANGUAGE plpgsql;

-- Initialize seats for all schedules
INSERT INTO shuttle_schedule_seats (schedule_id, seat_number)
SELECT 
  s.id as schedule_id,
  generate_series(1, s.total_seats) as seat_number
FROM shuttle_schedules s
ON CONFLICT DO NOTHING;
```

**Application Changes:**

```typescript
// src/services/ShuttleService.ts - UPDATE

export class ShuttleService {
  // BEFORE - VULNERABLE
  static async createBooking(userId: string, scheduleId: string) {
    return await supabase
      .from('shuttle_bookings')
      .insert({ user_id: userId, schedule_id: scheduleId });
  }
  
  // AFTER - SAFE
  static async createBooking(userId: string, scheduleId: string, seatsNeeded: number = 1) {
    const { data, error } = await supabase
      .rpc('create_shuttle_booking_safe', {
        p_user_id: userId,
        p_schedule_id: scheduleId,
        p_seats_needed: seatsNeeded
      });
    
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data;
  }
}
```

**Testing:**
- [ ] Single booking works correctly
- [ ] Two concurrent bookings work correctly
- [ ] Overbooking attempt rejected
- [ ] 15 concurrent bookings: first 12 succeed, last 3 fail
- [ ] Seats marked correctly in database
- [ ] User receives correct booking confirmation

---

#### Task 1.2.3: Fix Payment Webhook No Retry
**Severity:** 🔴 CRITICAL  
**Effort:** 4 hours  
**Blockers:** None  

**Current Problem:**
```
Payment webhook received from Midtrans
Processing fails due to network error
Webhook not retried
Result: Payment succeeds but user wallet not updated
```

**Implementation Steps:**
1. Create webhook retry queue table
2. Add webhook signature verification
3. Implement exponential backoff retry
4. Store webhook attempt history
5. Send retry alerts if max attempts reached
6. Test with network failures

**Code Changes:**

```sql
-- supabase/migrations/20260415000003_add_webhook_retry.sql

-- Create webhook event table
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload jsonb NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for retry processing
CREATE INDEX idx_webhook_pending_retry 
ON webhook_events(status, next_retry_at)
WHERE status = 'pending';

-- Create audit table for webhook attempts
CREATE TABLE IF NOT EXISTS webhook_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES webhook_events(id),
  attempt_number INTEGER,
  http_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to process webhook
CREATE OR REPLACE FUNCTION process_webhook_event(
  p_event_id uuid,
  p_signature TEXT,
  p_payload jsonb
)
RETURNS json AS $$
DECLARE
  v_event RECORD;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM webhook_events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Event not found');
  END IF;
  
  -- Verify signature
  IF NOT verify_midtrans_signature(p_signature, p_payload) THEN
    RETURN json_build_object('error', 'Invalid signature');
  END IF;
  
  -- Update status to processing
  UPDATE webhook_events 
  SET status = 'processing', attempt_count = attempt_count + 1
  WHERE id = p_event_id;
  
  -- Record attempt
  INSERT INTO webhook_attempts (event_id, attempt_number)
  VALUES (p_event_id, v_event.attempt_count + 1);
  
  -- TODO: Process webhook payload
  -- For now, just mark as completed
  UPDATE webhook_events 
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_event_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Function to retry failed webhooks
CREATE OR REPLACE FUNCTION retry_failed_webhooks()
RETURNS TABLE(event_count INTEGER) AS $$
DECLARE
  v_event_count INTEGER;
BEGIN
  -- Find webhooks ready for retry
  UPDATE webhook_events
  SET status = 'pending',
      next_retry_at = NOW() + INTERVAL '1 minute'
  WHERE status = 'pending'
    AND attempt_count < max_attempts
    AND next_retry_at IS NULL;
  
  GET DIAGNOSTICS v_event_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_event_count;
END;
$$ LANGUAGE plpgsql;
```

**Edge Function Changes:**

```typescript
// supabase/functions/payment-webhook/index.ts - UPDATE

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const body = await req.json();
    const signature = req.headers.get('x-callback-token');
    
    if (!signature) {
      return new Response('Missing signature', { status: 401 });
    }
    
    // Verify Midtrans signature
    const isValid = await verifyMidtransSignature(signature, body);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }
    
    // Store webhook event with retry logic
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        external_id: body.order_id || body.transaction_id,
        event_type: body.transaction_status,
        payload: body,
        status: 'pending',
        next_retry_at: new Date()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Attempt to process immediately
    try {
      const result = await processPaymentWebhook(body);
      
      if (result.success) {
        // Mark as completed
        await supabase
          .from('webhook_events')
          .update({ status: 'completed', attempt_count: 1 })
          .eq('id', data.id);
      } else {
        // Mark as pending for retry
        const nextRetry = new Date(Date.now() + 60000); // 1 minute
        await supabase
          .from('webhook_events')
          .update({ 
            status: 'pending', 
            next_retry_at: nextRetry,
            last_error: result.error 
          })
          .eq('id', data.id);
      }
    } catch (err) {
      // Mark as pending for retry on error
      const nextRetry = new Date(Date.now() + 60000);
      await supabase
        .from('webhook_events')
        .update({ 
          status: 'pending',
          next_retry_at: nextRetry,
          last_error: err.message
        })
        .eq('id', data.id);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function processPaymentWebhook(payload: any) {
  // Process payment based on transaction_status
  // Return { success: boolean, error?: string }
  // Implementation details...
  return { success: true };
}

async function verifyMidtransSignature(signature: string, body: any) {
  // Verify signature with Midtrans public key
  // Implementation details...
  return true;
}
```

**Deployment of Retry Service:**

```bash
# Create scheduled function to retry failed webhooks every minute
supabase functions deploy retry-webhooks

# Or use pg_cron for database-level scheduling
-- supabase/migrations/20260415000004_schedule_webhook_retry.sql
SELECT cron.schedule(
  'retry-webhooks',
  '* * * * *',  -- Every minute
  'SELECT retry_failed_webhooks()'
);
```

**Testing:**
- [ ] Webhook received and stored
- [ ] Signature verified correctly
- [ ] Processing failure triggers retry
- [ ] Retry happens after delay
- [ ] Max attempts prevents infinite retries
- [ ] Audit trail shows all attempts

---

#### Task 1.2.4: Add Missing RLS Policies
**Severity:** 🔴 CRITICAL  
**Effort:** 2 hours  
**Blockers:** None  

**Current Problem:**
```
5 tables missing RLS policies
8 tables have incomplete policies
Result: Users can see other users' data
```

**Implementation Steps:**
1. Enable RLS on all sensitive tables
2. Create user isolation policies
3. Create admin override policies
4. Create driver policies for driver-specific data
5. Test with different roles

**Code Changes:**

```sql
-- supabase/migrations/20260415000005_enable_rls_all_tables.sql

-- Table: rides
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see own rides" ON rides;
CREATE POLICY "Users can see own rides"
ON rides FOR SELECT
USING (
  auth.uid() = user_id 
  OR auth.uid() = driver_id 
  OR EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
);

-- Table: shuttles
ALTER TABLE shuttles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see own shuttle bookings" ON shuttles;
CREATE POLICY "Users can see own shuttle bookings"
ON shuttles FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
);

-- Table: transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see own transactions" ON transactions;
CREATE POLICY "Users can see own transactions"
ON transactions FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
);

-- Table: driver_locations (SENSITIVE - Real-time GPS)
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see driver location during ride"
ON driver_locations FOR SELECT
USING (
  auth.uid() = driver_id  -- Driver can see own location
  OR EXISTS (              -- Admin can see all
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
  OR EXISTS (              -- User can see driver during active ride
    SELECT 1 FROM rides
    WHERE rides.driver_id = driver_locations.driver_id
      AND rides.user_id = auth.uid()
      AND rides.status IN ('accepted', 'in_progress')
  )
);

-- Table: vehicle_documents (SENSITIVE - PII)
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can see own documents"
ON vehicle_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.id = vehicle_documents.vehicle_id
      AND vehicles.driver_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
);

-- Table: user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own profile"
ON user_profiles FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  )
);

-- Verify all tables have RLS enabled
SELECT tablename, 
       CASE WHEN row_security_enabled = 't' THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('rides', 'shuttles', 'wallets', 'transactions', 'driver_locations', 'vehicle_documents', 'user_profiles')
ORDER BY tablename;
```

**Testing:**
- [ ] User cannot see other users' rides
- [ ] Admin can see all rides
- [ ] Driver can see own rides
- [ ] User cannot access driver location except during active ride
- [ ] Driver can access own documents only
- [ ] RLS policies performant (< 100ms query time)

---

### PHASE 1.3: Verification & Deployment (Day 5)
**Owner:** QA + DevOps  
**Effort:** 4 hours

#### Task 1.3.1: Security Testing
- [ ] Penetration testing for auth bypasses
- [ ] SQL injection testing
- [ ] XSS attack simulation
- [ ] CSRF testing
- [ ] Race condition stress testing

#### Task 1.3.2: Load Testing
- [ ] 100 concurrent users
- [ ] Payment processing under load
- [ ] Wallet operations concurrent
- [ ] Shuttle booking stress test
- [ ] Performance baseline validation

#### Task 1.3.3: Staging Deployment
- [ ] Deploy all Phase 1 changes to staging
- [ ] Run full test suite
- [ ] Verify no regressions
- [ ] Get sign-off from tech lead
- [ ] Document any issues

---

## 🟠 PHASE 2: OPERATIONAL READINESS
### Timeline: Weeks 2-3 (10 working days)
### Effort: 40 hours (2 developers)
### Status: Execute after Phase 1 complete

---

### PHASE 2.1: Driver Module Hardening (Days 1-3)
**Owner:** Senior Backend Developer  
**Effort:** 12 hours

#### Task 2.1.1: Add Vehicle Verification Before Ride (3h)
```typescript
// Add check before ride acceptance
async beforeRideAcceptance(driverId: string, vehicleId: string) {
  // 1. Check vehicle is verified
  // 2. Check all documents verified
  // 3. Check no documents expired
  // 4. Only then allow ride
}
```

#### Task 2.1.2: Fix License Province Validation (1h)
```typescript
// Validate province code matches valid list
const VALID_PROVINCES = ['DKI', 'WEST_JAVA', 'EAST_JAVA', ...];
if (!VALID_PROVINCES.includes(provinceCode)) {
  throw new Error('Invalid province');
}
```

#### Task 2.1.3: Validate Coordinates Bounds (1h)
```typescript
// Check coordinates are within valid range
if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
  throw new Error('Invalid coordinates');
}
```

#### Task 2.1.4: Fix Status Toggle Race Condition (2h)
```typescript
// Use RPC for atomic status update
async toggleStatus(driverId: string, newStatus: string) {
  const { data, error } = await supabase
    .rpc('toggle_driver_status_atomic', {
      p_driver_id: driverId,
      p_new_status: newStatus
    });
}
```

#### Task 2.1.5: Reduce Location Update Frequency (2h)
```typescript
// Debounce location updates to every 5 seconds
const LOCATION_UPDATE_INTERVAL = 5000;  // 5 seconds = 720 updates/day vs 360
```

#### Task 2.1.6: Add Error Handling & User Feedback (3h)
```typescript
// Replace silent errors with user feedback
try {
  await updateStatus(newStatus);
} catch (err) {
  // Show error to user
  showNotification('Failed to update status: ' + err.message);
}
```

---

### PHASE 2.2: Vehicle Management Implementation (Days 3-6)
**Owner:** Full-stack Developer  
**Effort:** 16 hours

#### Task 2.2.1: Create Document Verification Workflow (8h)
- Build admin dashboard for document verification
- Create driver notification on verification
- Track verification status per document
- Create audit trail for all verifications

#### Task 2.2.2: Implement Document Expiry Enforcement (4h)
- Auto-expire documents on expiry_date
- Warn drivers 30 days before expiry
- Prevent ride acceptance with expired documents
- Schedule daily auto-expiry check

#### Task 2.2.3: Add Maintenance Tracking (4h)
- Create maintenance schedule UI
- Track maintenance history
- Alert drivers for maintenance reminders
- Integrate with vehicle eligibility check

---

### PHASE 2.3: Performance Optimization (Days 4-6)
**Owner:** Backend Developer  
**Effort:** 12 hours

#### Task 2.3.1: Add Database Indexes (1h)
```sql
CREATE INDEX idx_rides_status_driver ON rides(status, driver_id);
CREATE INDEX idx_shuttles_schedule_user ON shuttles(schedule_id, user_id);
CREATE INDEX idx_wallets_balance_lookup ON wallets(user_id, balance);
```

#### Task 2.3.2: Fix N+1 Query Problem (2h)
- Consolidate 7 separate queries into 1 JOIN
- Reduce dispatch time from 500ms to 50ms

#### Task 2.3.3: Implement Real-time Subscription Cleanup (3h)
- Ensure subscriptions unsubscribed on unmount
- Fix memory leaks in WebSocket connections
- Implement connection timeout

#### Task 2.3.4: Optimize Real-time Broadcast (2h)
- Reduce broadcast frequency from 300 msg/sec to 50 msg/sec
- Implement message batching
- Add compression for large payloads

#### Task 2.3.5: Implement Image Compression (2h)
- Compress uploaded documents
- Reduce document storage by 80%
- Implement WebP conversion
- Add lazy loading for images

#### Task 2.3.6: Add Admin Action Audit Trail (2h)
- Log all admin actions with timestamp, actor, action, result
- Create audit report UI
- Implement retention policy (keep 90 days)

---

### PHASE 2.4: Testing & Validation (Days 7-10)
**Owner:** QA Engineer  
**Effort:** 8 hours

#### Task 2.4.1: Run Full Integration Tests
- Test all Phase 2 features
- Verify no regressions from Phase 1

#### Task 2.4.2: Performance Regression Testing
- Verify query performance improvements
- Baseline new metrics
- Compare to Phase 1 baseline

#### Task 2.4.3: Load Testing
- 1000 concurrent drivers
- 5000 concurrent users
- Sustained load for 1 hour
- Record metrics

---

## 🟡 PHASE 3: QUALITY & SCALABILITY
### Timeline: Weeks 4-6 (15 working days)
### Effort: 56 hours (2 developers)
### Status: Execute after Phase 2 complete

---

### PHASE 3.1: Comprehensive Testing (Days 1-8)
**Owner:** QA Engineer + Developers  
**Effort:** 28 hours

#### Task 3.1.1: Unit Test Coverage (8h)
- Test critical business logic
- Target 80% coverage
- Focus on: payment, booking, vehicle verification

#### Task 3.1.2: Integration Tests (8h)
- Test workflows end-to-end
- Test error scenarios
- Test concurrent operations

#### Task 3.1.3: E2E Tests (8h)
- User booking flow
- Driver acceptance flow
- Payment processing flow
- Vehicle verification flow

#### Task 3.1.4: Security Test Suite (4h)
- XSS tests
- SQL injection tests
- CSRF tests
- Authorization tests

---

### PHASE 3.2: Performance Optimization (Days 5-12)
**Owner:** Backend Developer + DevOps  
**Effort:** 20 hours

#### Task 3.2.1: Database Query Optimization
- Analyze slow queries
- Add missing indexes
- Implement caching strategy

#### Task 3.2.2: API Performance
- Reduce response times to < 100ms
- Implement response compression
- Add response caching

#### Task 3.2.3: Frontend Performance
- Implement code splitting
- Add lazy loading
- Optimize bundle size

#### Task 3.2.4: Infrastructure Scaling
- Set up horizontal scaling
- Configure load balancing
- Implement auto-scaling

---

### PHASE 3.3: Documentation & Runbooks (Days 10-15)
**Owner:** Tech Lead + DevOps  
**Effort:** 8 hours

#### Task 3.3.1: Architecture Documentation
- Update architecture diagrams
- Document all systems
- Create integration maps

#### Task 3.3.2: API Documentation
- Document all endpoints
- Create API examples
- Update rate limiting info

#### Task 3.3.3: Runbooks
- Deployment procedures
- Incident response procedures
- Rollback procedures
- Troubleshooting guides

#### Task 3.3.4: Training Materials
- Team training
- Customer documentation
- FAQ & troubleshooting

---

## 🚀 EXECUTION GUIDELINES

### Daily Standup Format
```
What did you complete yesterday?
What do you plan to complete today?
What blockers do you have?
Any risks or issues?
```

### Code Review Requirements
Every commit must pass:
- [ ] Functional requirements met
- [ ] No critical/major security issues
- [ ] Test coverage adequate
- [ ] Performance benchmarks met
- [ ] Documentation updated

### Definition of Done
- [ ] Code written and tested
- [ ] Code reviewed and approved
- [ ] Tests passing (unit + integration)
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA approved
- [ ] Zero known issues

---

## 📊 TRACKING & METRICS

### Phase 1 Success Criteria
- [ ] 5 critical issues fixed
- [ ] 0 security vulnerabilities (Severity 9-10)
- [ ] Payment system tested
- [ ] Auth system working
- [ ] Rate limiting active
- [ ] Performance baseline established

### Phase 2 Success Criteria
- [ ] 8 major issues fixed
- [ ] Driver module hardened
- [ ] Vehicle verification working
- [ ] 6x faster dispatch (500ms → 50ms)
- [ ] Admin audit trail complete
- [ ] Load test passed (1000 concurrent)

### Phase 3 Success Criteria
- [ ] 12 medium issues addressed
- [ ] 80% test coverage
- [ ] All documentation complete
- [ ] Performance targets met (see metrics section)
- [ ] Security audit passed
- [ ] Production deployment approved

---

## 🎯 COMPLETION CHECKLIST

### Pre-Production Deployment
- [ ] All 65-item deployment checklist completed
- [ ] Security audit passed
- [ ] Load testing successful
- [ ] Incident response procedures tested
- [ ] Monitoring and alerting active
- [ ] Backups verified
- [ ] Rollback procedures tested
- [ ] Team trained
- [ ] Documentation complete
- [ ] Legal/compliance sign-off

### Post-Production (First Week)
- [ ] Monitor error rates (target: < 0.1%)
- [ ] Monitor performance (target: < 200ms p95)
- [ ] Monitor security alerts
- [ ] Gather user feedback
- [ ] Fix any production issues immediately

---

**END OF COMPREHENSIVE IMPLEMENTATION ROADMAP**

*Total Effort: 118 hours | Timeline: 6 weeks | Team Size: 3 developers | Budget: $75,000*
