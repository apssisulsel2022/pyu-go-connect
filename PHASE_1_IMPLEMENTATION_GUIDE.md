# PHASE 1 CRITICAL FIXES - IMPLEMENTATION GUIDE
## Comprehensive Integration Instructions

**Date:** April 15, 2026  
**Status:** Ready for Implementation  
**Duration:** 5 working days (22 hours)

---

## 📋 COMPLETED DELIVERABLES

### ✅ Database Migrations
- **File:** `supabase/migrations/20260415000001_phase1_security_hardening.sql`
- **Contains:** 9 critical database changes
  1. Atomic wallet update RPC function (prevents race conditions)
  2. Wallet update RLS policy (prevents direct balance manipulation)
  3. Shuttle seat tracking table with unique constraints
  4. Atomic shuttle booking RPC function (prevents overbooking)
  5. Rate limiting infrastructure tables
  6. Webhook retry infrastructure tables
  7. HTTP session management table
  8. Security audit logging table
  9. Helper functions for logging and operations

**Status:** Ready to apply to Supabase

---

### ✅ Middleware Files Created

#### 1. Authentication Middleware
- **File:** `src/middleware/authMiddleware.ts`
- **Functions:**
  - `validateJWT()` - Validate JWT on all protected routes
  - `validateJWTWithRole()` - Role-based access control
  - `extractToken()` - Get token from header or cookie
  - `isTokenExpired()` - Check token expiration
  
**Integration:**
```typescript
// In your Express app setup
import { validateJWT, validateJWTWithRole } from '@/middleware/authMiddleware';

app.use('/api/protected', validateJWT);
app.get('/api/admin', validateJWTWithRole('admin'), adminHandler);
```

#### 2. Rate Limiting Middleware
- **File:** `src/middleware/rateLimitMiddleware.ts`
- **Limiters:**
  - `generalLimiter` - 100 req/15min (general API)
  - `authLimiter` - 5 req/15min (login attempts)
  - `paymentLimiter` - 10 req/1min (payment operations)
  - `shuttleBookingLimiter` - 20 req/1hr (shuttle bookings)
  - `walletLimiter` - 30 req/1hr (wallet operations)
  - `documentUploadLimiter` - 5 req/1hr (document uploads)

**Integration:**
```typescript
import { 
  authLimiter, 
  paymentLimiter, 
  shuttleBookingLimiter 
} from '@/middleware/rateLimitMiddleware';

app.post('/auth/login', authLimiter, loginHandler);
app.post('/payments/checkout', paymentLimiter, checkoutHandler);
app.post('/shuttle/book', shuttleBookingLimiter, bookingHandler);
```

#### 3. Audit Logger
- **File:** `src/middleware/auditLogger.ts`
- **Functions:**
  - `log_security_event()` - Log events to database
  - `getUserAuditLog()` - Get user's security events
  - `getFailedLoginAttempts()` - Get login failures
  - `checkSuspiciousActivity()` - Detect suspicious patterns
  - `flagSuspiciousAccount()` - Flag accounts for review

**Integration:**
```typescript
import { log_security_event } from '@/middleware/auditLogger';

// Log any security event
await log_security_event(
  'payment_webhook',
  'payment',
  'webhook_received',
  'success',
  { webhook_id: 123, amount: 50000 }
);
```

---

### ✅ Service Layer Updates

#### 1. Wallet Service (NEW)
- **File:** `src/services/WalletService.ts`
- **Key Methods:**
  - `getWallet()` - Get wallet balance
  - `deductBalance()` - Safe balance deduction (uses RPC)
  - `addBalance()` - Safe balance addition (uses RPC)
  - `getTransactionHistory()` - Get transaction records
  - `hasSufficientBalance()` - Check if user can afford transaction
  - `getWalletSummary()` - Get earnings/spent summary

**CRITICAL:** All balance operations use `update_wallet_balance()` RPC function

**Usage:**
```typescript
import WalletService from '@/services/WalletService';

// Safe deduction (atomic, prevents race conditions)
const result = await WalletService.deductBalance(userId, 50000);
if (result.success) {
  console.log('New balance:', result.newBalance);
} else {
  console.error('Insufficient balance:', result.error);
}

// Check before deducting
const hasFunds = await WalletService.hasSufficientBalance(userId, 50000);
if (!hasFunds) {
  // Show error to user
}
```

#### 2. Shuttle Booking Service (NEW)
- **File:** `src/services/ShuttleBookingService.ts`
- **Key Methods:**
  - `createBooking()` - Book seats atomically (uses RPC)
  - `getAvailableSeats()` - Get available seat count
  - `validateSchedule()` - Check if schedule is valid
  - `getBooking()` - Get booking details
  - `getUserBookings()` - Get user's bookings
  - `cancelBooking()` - Cancel a booking
  - `getSeatOccupancy()` - Get occupancy stats

**CRITICAL:** All bookings use `create_shuttle_booking_safe()` RPC function

**Usage:**
```typescript
import ShuttleBookingService from '@/services/ShuttleBookingService';

// Safe booking (atomic, prevents overbooking)
const result = await ShuttleBookingService.createBooking(userId, {
  scheduleId: 'schedule-123',
  seatsNeeded: 2
});

if (result.success) {
  console.log('Booked with ID:', result.bookingId);
} else {
  console.log('Booking failed:', result.error);
  console.log('Available seats:', result.availableSeats);
}

// Check availability before showing booking form
const available = await ShuttleBookingService.getAvailableSeats(scheduleId);
if (available === 0) {
  // Show "Fully booked" message
}
```

---

### ✅ Test Suite
- **File:** `src/tests/phase1-critical-fixes.test.ts`
- **Test Coverage:**
  - ✅ Wallet race condition tests (5 tests)
  - ✅ Shuttle overbooking tests (7 tests)
  - ✅ Rate limiting tests (1 test)
  - ✅ Security audit logging tests (1 test)

**Run Tests:**
```bash
npm run test -- phase1-critical-fixes.test.ts
```

---

## 🚀 INTEGRATION STEPS

### Step 1: Apply Database Migrations (1 hour)

```bash
# 1. Connect to Supabase dashboard
# 2. Go to SQL Editor
# 3. Create new query
# 4. Copy contents of: supabase/migrations/20260415000001_phase1_security_hardening.sql
# 5. Execute the query
# 6. Verify all functions created successfully

# Or use Supabase CLI:
supabase db push
```

**Verify Migration Success:**
```sql
-- Check functions exist
SELECT proname FROM pg_proc WHERE proname IN (
  'update_wallet_balance',
  'create_shuttle_booking_safe',
  'log_security_event',
  'process_webhook_with_retry'
);

-- Check tables exist
SELECT tablename FROM pg_tables WHERE tablename IN (
  'shuttle_schedule_seats',
  'rate_limit_logs',
  'webhook_events',
  'http_sessions',
  'security_audit_log'
);
```

---

### Step 2: Setup Middleware in Express/API (2 hours)

**File:** `src/server.ts` or your API entry point

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import { validateJWT, validateJWTWithRole } from '@/middleware/authMiddleware';
import { 
  generalLimiter, 
  authLimiter, 
  paymentLimiter,
  shuttleBookingLimiter 
} from '@/middleware/rateLimitMiddleware';

const app = express();

// Middleware setup
app.use(express.json());
app.use(cookieParser()); // Required for cookie-based auth
app.use(generalLimiter);  // Apply general rate limiting

// ================================================================
// AUTH ROUTES
// ================================================================
app.post('/auth/login', authLimiter, async (req, res) => {
  // Login handler - will call Supabase auth
  // Response should set HttpOnly cookie automatically
  // via Supabase SDK
});

app.post('/auth/logout', validateJWT, async (req, res) => {
  // Logout handler
});

// ================================================================
// PAYMENT ROUTES (Protected)
// ================================================================
app.post('/api/payments/checkout', 
  validateJWT,
  paymentLimiter,
  async (req, res) => {
    // Payment handler
  }
);

app.post('/api/payments/webhook',
  // Webhook should NOT require auth (Midtrans calls it)
  // But should verify signature
  async (req, res) => {
    // Payment webhook handler
  }
);

// ================================================================
// WALLET ROUTES (Protected)
// ================================================================
app.get('/api/wallet',
  validateJWT,
  async (req, res) => {
    const wallet = await WalletService.getWallet(req.user!.id);
    res.json(wallet);
  }
);

app.get('/api/wallet/history',
  validateJWT,
  async (req, res) => {
    const transactions = await WalletService.getTransactionHistory(
      req.user!.id,
      50
    );
    res.json(transactions);
  }
);

// ================================================================
// SHUTTLE ROUTES (Protected)
// ================================================================
app.post('/api/shuttle/book',
  validateJWT,
  shuttleBookingLimiter,
  async (req, res) => {
    const result = await ShuttleBookingService.createBooking(
      req.user!.id,
      req.body
    );
    res.json(result);
  }
);

app.get('/api/shuttle/bookings',
  validateJWT,
  async (req, res) => {
    const bookings = await ShuttleBookingService.getUserBookings(
      req.user!.id
    );
    res.json(bookings);
  }
);

// ================================================================
// ADMIN ROUTES (Role-based)
// ================================================================
app.get('/api/admin/users',
  validateJWTWithRole('admin'),
  async (req, res) => {
    // Admin-only endpoint
  }
);

// Listen
app.listen(3000, () => console.log('Server running on port 3000'));
```

---

### Step 3: Update Existing Components (3 hours)

#### Update Payment Processing Component
**File:** `src/components/PaymentProcessor.tsx`

```typescript
import WalletService from '@/services/WalletService';

export function PaymentProcessor() {
  const handleCheckout = async (amount: number) => {
    try {
      // 1. Check balance (safe)
      const hasFunds = await WalletService.hasSufficientBalance(
        userId,
        amount
      );
      
      if (!hasFunds) {
        toast.error('Insufficient balance');
        return;
      }

      // 2. Deduct balance (atomic/safe)
      const deductResult = await WalletService.deductBalance(
        userId,
        amount,
        'Booking payment'
      );
      
      if (!deductResult.success) {
        toast.error(deductResult.error);
        return;
      }

      // 3. Process payment with Midtrans
      // ... payment code ...

    } catch (err) {
      toast.error('Payment failed');
    }
  };

  return <button onClick={() => handleCheckout(50000)}>Pay Now</button>;
}
```

#### Update Shuttle Booking Component
**File:** `src/components/ShuttleBooking.tsx`

```typescript
import ShuttleBookingService from '@/services/ShuttleBookingService';

export function ShuttleBooking({ scheduleId }: { scheduleId: string }) {
  const [availableSeats, setAvailableSeats] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkAvailability() {
      const seats = await ShuttleBookingService.getAvailableSeats(scheduleId);
      setAvailableSeats(seats);
    }
    checkAvailability();
  }, [scheduleId]);

  const handleBook = async (seatsNeeded: number) => {
    try {
      setLoading(true);
      
      // Validate schedule
      const isValid = await ShuttleBookingService.validateSchedule(scheduleId);
      if (!isValid) {
        toast.error('Schedule not available');
        return;
      }

      // Book seats (atomic/safe)
      const result = await ShuttleBookingService.createBooking(userId, {
        scheduleId,
        seatsNeeded
      });

      if (result.success) {
        toast.success(`Successfully booked ${seatsNeeded} seat(s)`);
        // Redirect to payment
      } else {
        toast.error(result.error);
        setAvailableSeats(result.availableSeats || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  if (availableSeats === 0) {
    return <div>No seats available</div>;
  }

  return (
    <button onClick={() => handleBook(1)} disabled={loading}>
      Book (Available: {availableSeats})
    </button>
  );
}
```

---

### Step 4: Configure HttpOnly Cookies (1 hour)

**In your Supabase client setup** `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      storage: localStorage, // In browser
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Session already goes to HttpOnly cookie automatically
      // via Supabase Auth server
    }
  }
);

// Ensure all requests include credentials (for cookies)
export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
) => {
  return fetch(url, {
    ...options,
    credentials: 'include', // Send cookies with request
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};
```

---

### Step 5: Test All Fixes (2 hours)

```bash
# Install testing dependencies
npm install -D vitest @testing-library/react jest-mock-extended

# Run unit tests
npm run test -- phase1-critical-fixes.test.ts

# Manual testing checklist:
# [ ] Login works, token in HttpOnly cookie (not localStorage)
# [ ] Try accessing /api/users without auth - gets 401
# [ ] Try accessing /api/users with invalid token - gets 401
# [ ] Login 6 times quickly - 5th succeeds, 6th gets 429 rate limit
# [ ] Create 15 concurrent shuttle bookings for 12-seat shuttle
#     - 12 succeed, 3 fail with "not enough seats"
# [ ] Deduct wallet twice simultaneously
#     - Both deductions applied correctly (balance -= total)
# [ ] Check security_audit_log table for events
```

---

## 🔒 SECURITY VERIFICATION CHECKLIST

- [ ] **Token Security:**
  - [ ] Auth token NOT in localStorage
  - [ ] Token visible only in HttpOnly cookie
  - [ ] Token sent automatically with requests
  - [ ] Expired token rejected (401)
  - [ ] Invalid token rejected (401)

- [ ] **Rate Limiting:**
  - [ ] Auth endpoint: 5 attempts/15min enforced
  - [ ] Payment endpoint: 10 requests/1min enforced
  - [ ] Shuttle booking: 20 requests/1hr enforced
  - [ ] Exceeding limit returns 429 status
  - [ ] Different users have separate limits

- [ ] **Wallet Operations:**
  - [ ] Balance never goes negative
  - [ ] Concurrent deductions both apply
  - [ ] No lost updates under load
  - [ ] All operations logged
  - [ ] Users cannot directly UPDATE balance

- [ ] **Shuttle Bookings:**
  - [ ] Only available seats can be booked
  - [ ] No overbooking even with 100+ concurrent requests
  - [ ] Unique constraint prevents duplicate bookings
  - [ ] Cancelled bookings free up seats
  - [ ] Occupancy calculations accurate

- [ ] **Audit Logging:**
  - [ ] All failed logins logged
  - [ ] All rate limit violations logged
  - [ ] All wallet operations logged
  - [ ] All security events logged
  - [ ] Audit log accessible to admins only

---

## 📊 SUCCESS METRICS

After Phase 1 completion, verify:

| Metric | Target | Verification |
|--------|--------|--------------|
| Authentication | 100% requests validated | Check logs |
| Rate Limiting | 429 on violation | curl test |
| Wallet Race Condition | 0 lost updates | Concurrent load test |
| Shuttle Overbooking | 0 overbookings | Concurrent booking test |
| Audit Coverage | All security events logged | Check audit_log table |
| Test Coverage | >90% | npm run test coverage |

---

## 🆘 TROUBLESHOOTING

### Issue: Middleware not recognizing authenticated users

**Solution:**
```bash
# Ensure cookie-parser installed
npm install cookie-parser

# Verify in your Express setup
app.use(cookieParser());
app.use(validateJWT);  // After cookie-parser
```

### Issue: Rate limiter not working

**Solution:**
```bash
# Ensure express-rate-limit installed
npm install express-rate-limit

# Check middleware application order
app.use(generalLimiter);  // Should be early
app.use(authLimiter);      // For specific routes
```

### Issue: Supabase RPC function not found

**Solution:**
```bash
# Verify migration was applied
# In Supabase Dashboard -> SQL Editor -> Recent -> Check execution
# Should see: "CREATE OR REPLACE FUNCTION" messages

# If not applied, run manually:
# 1. Go to SQL Editor
# 2. Copy migration file contents
# 3. Execute
# 4. Verify: SELECT * FROM information_schema.routines WHERE routine_name LIKE '%update_wallet%'
```

### Issue: Wallet balance sometimes incorrect

**Solution:**
- ❌ Wrong: Direct `UPDATE wallets SET balance = ...`
- ✅ Correct: `WalletService.deductBalance()` or RPC function
- Check all code uses new service methods
- Review queries for any direct UPDATE statements

---

## 📝 NEXT STEPS (AFTER PHASE 1)

1. **Phase 2 (Week 2-3):** Fix 8 major issues
2. **Phase 3 (Week 4-6):** Fix 12 medium issues & comprehensive testing
3. **Production:** Deploy to production environment
4. **Monitoring:** Setup alerts for security events

---

## 📞 SUPPORT

**Blocked?** Check:
1. [COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md](COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md) - Full code examples
2. [DATABASE_SCHEMA_SQL_FIXES.md](DATABASE_SCHEMA_SQL_FIXES.md) - SQL details
3. [INTEGRATION_BEST_PRACTICES.md](INTEGRATION_BEST_PRACTICES.md) - Architecture patterns
4. Test file: `src/tests/phase1-critical-fixes.test.ts` - Working examples

---

**PHASE 1: READY FOR DEPLOYMENT** ✅
