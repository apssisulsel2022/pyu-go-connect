# ⚡ PHASE 1: EMERGENCY STABILIZATION - EXECUTION GUIDE
## Week 1 (5 Working Days) - 22 Hours - 2 Developers
### April 15-19, 2026

---

## 🎯 PHASE 1 OBJECTIVE

**Fix 5 critical security & data integrity issues before any production use.**

After Phase 1 completion:
✅ 0 critical vulnerabilities remaining  
✅ Payment system secure  
✅ Data integrity guaranteed  
✅ Ready for staging environment tests  

---

## 📋 PHASE 1 TASKS: THE 5 CRITICAL FIXES

### Task 1: Move Session Token to HttpOnly Cookie
- **Severity:** 🔴 CRITICAL - XSS vulnerability
- **Effort:** 2 hours
- **Owner:** Backend Developer 1
- **Status:** NOT STARTED

**What:** Move authentication token from localStorage (vulnerable to XSS) to HttpOnly cookies (safe)

**Why:** Anyone with XSS vulnerability can steal localStorage token and take over account

**How:**
1. Update `src/services/AuthService.ts`
2. Configure Supabase to auto-set HttpOnly cookies
3. Add `credentials: 'include'` to all fetch calls
4. Remove localStorage auth token code
5. Test with security tests

**Success Criteria:**
- [ ] No token in localStorage
- [ ] No token visible in DevTools
- [ ] API calls work with cookie
- [ ] XSS cannot steal token
- [ ] Tests pass: `npm run test -- auth.cookie.test.ts`

**Reference:** [COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md](COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md#task-111-move-session-token-to-httponly-cookie)

---

### Task 2: Add JWT Validation Middleware
- **Severity:** 🔴 CRITICAL - Unauthorized access
- **Effort:** 2 hours
- **Owner:** Backend Developer 1
- **Status:** NOT STARTED

**What:** Validate JWT tokens on every protected API endpoint

**Why:** Currently APIs don't check if user is authenticated - anyone can call them

**How:**
1. Create `src/middleware/authMiddleware.ts`
2. Verify JWT signature with Supabase
3. Extract user info from token
4. Apply middleware to all `/api/protected` routes
5. Test with invalid tokens

**Success Criteria:**
- [ ] Valid token accepted
- [ ] Expired token rejected
- [ ] Invalid token rejected
- [ ] No token rejected
- [ ] Tests pass: `npm run test -- auth.validation.test.ts`

**Reference:** [COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md](COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md#task-112-add-jwt-validation-middleware)

---

### Task 3: Implement Rate Limiting
- **Severity:** 🔴 CRITICAL - DDoS vulnerability
- **Effort:** 2 hours
- **Owner:** Backend Developer 1
- **Status:** NOT STARTED

**What:** Limit API requests to prevent DDoS attacks

**Why:** Without rate limiting, attacker can crash system with 10k requests/second

**How:**
1. Install `express-rate-limit`
2. Create `src/middleware/rateLimit.ts`
3. Set limits: General (100/15min), Auth (5/15min), Payment (10/1min)
4. Apply to routes: `/auth/login`, `/payment/checkout`, `/api/*`
5. Test with load testing

**Success Criteria:**
- [ ] Requests within limit pass
- [ ] Requests over limit get 429 status
- [ ] Rate limit resets properly
- [ ] Load test passes: `npx artillery run load-tests/rate-limit.yml`

**Reference:** [COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md](COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md#task-113-implement-rate-limiting)

---

### Task 4: Fix Wallet Balance Race Condition
- **Severity:** 🔴 CRITICAL - Financial fraud risk
- **Effort:** 2 hours
- **Owner:** Backend Developer 2
- **Status:** NOT STARTED

**What:** Prevent concurrent balance updates from causing incorrect totals

**Why:** Two simultaneous withdrawals both succeed, user loses money (financial fraud)

**How:**
1. Create migration: `supabase/migrations/20260415000001_fix_wallet_race.sql`
2. Create RPC `update_wallet_balance()` with atomic lock
3. Update `src/services/WalletService.ts` to use RPC
4. Add transaction validation
5. Test with concurrent requests

**Success Criteria:**
- [ ] Concurrent request 1: balance -= 100 ✅
- [ ] Concurrent request 2: balance -= 100 ✅
- [ ] Final balance: -200 ✅ (not -100)
- [ ] Tests pass: `npm run test -- wallet.concurrent.test.ts`

**SQL File Provided:** [DATABASE_SCHEMA_SQL_FIXES.md](DATABASE_SCHEMA_SQL_FIXES.md#fix-1-wallet-balance-race-condition)

**TypeScript Changes Provided:** See roadmap section

---

### Task 5: Fix Shuttle Seat Overbooking
- **Severity:** 🔴 CRITICAL - Data integrity & customer disputes
- **Effort:** 3 hours
- **Owner:** Backend Developer 2
- **Status:** NOT STARTED

**What:** Prevent multiple users from booking the same shuttle seat

**Why:** 12 seats, but 15 users book → all 15 get confirmations, then disputes

**How:**
1. Create migration: `supabase/migrations/20260415000002_fix_seat_overbooking.sql`
2. Create `shuttle_schedule_seats` table (one row per seat)
3. Create RPC `create_shuttle_booking_safe()` with atomic lock
4. Update `src/services/ShuttleService.ts` to use RPC
5. Test with concurrent bookings

**Success Criteria:**
- [ ] 1st booking of 12 seats: SUCCESS ✅
- [ ] 13th concurrent booking: FAIL ❌ (no seats)
- [ ] Tests pass: `npm run test -- shuttle.overbooking.test.ts`

**SQL File Provided:** [DATABASE_SCHEMA_SQL_FIXES.md](DATABASE_SCHEMA_SQL_FIXES.md#fix-2-shuttle-seat-overbooking)

---

### Task 6: Fix Payment Webhook No Retry
- **Severity:** 🔴 CRITICAL - Revenue loss
- **Effort:** 4 hours
- **Owner:** Backend Developer 2
- **Status:** NOT STARTED

**What:** Automatically retry failed payment webhooks from Midtrans

**Why:** Payment succeeds but confirmation lost → wallet never updated → revenue lost

**How:**
1. Create migration: `supabase/migrations/20260415000003_add_webhook_retry.sql`
2. Create `webhook_events` table for retry tracking
3. Update `supabase/functions/payment-webhook/index.ts`
4. Implement exponential backoff retry (1, 2, 4, 8, 16 min)
5. Test with network failures

**Success Criteria:**
- [ ] Webhook received and stored
- [ ] First attempt fails
- [ ] Automatically retried after 1 min
- [ ] Succeeds on 2nd attempt ✅
- [ ] Tests pass: `npm run test -- payment.webhook.test.ts`

**SQL File Provided:** [DATABASE_SCHEMA_SQL_FIXES.md](DATABASE_SCHEMA_SQL_FIXES.md#fix-3-payment-webhook-retry)

---

## 📅 PHASE 1 SCHEDULE

### DAY 1 (Monday)
**Morning (2-3 hours):**
- Team kickoff meeting (30 min)
- Assign tasks to 2 developers
- Setup development environment
- Create feature branches

**Afternoon (3-4 hours):**
- Task 1: Start moving session token to HttpOnly (Backend Dev 1)
- Task 4: Start wallet race condition fix (Backend Dev 2)

**EOD Checklist:**
- [ ] Feature branches created
- [ ] Code commits started
- [ ] No blocking issues

---

### DAY 2 (Tuesday)
**Morning (3-4 hours):**
- Task 1: Complete & test session token fix (Backend Dev 1)
- Task 4: Complete & test wallet fix (Backend Dev 2)
- Code review for both

**Afternoon (3-4 hours):**
- Task 2: Start JWT validation middleware (Backend Dev 1)
- Task 5: Start shuttle overbooking fix (Backend Dev 2)

**EOD Checklist:**
- [ ] Task 1 completed & tested
- [ ] Task 4 completed & tested
- [ ] Code reviewed
- [ ] Tests passing

---

### DAY 3 (Wednesday)
**Morning (3-4 hours):**
- Task 2: Complete JWT validation (Backend Dev 1)
- Task 5: Continue shuttle overbooking (Backend Dev 2)
- Code review for Task 2

**Afternoon (3-4 hours):**
- Task 3: Start rate limiting (Backend Dev 1)
- Task 5: Complete shuttle overbooking (Backend Dev 2)

**EOD Checklist:**
- [ ] Task 2 completed & tested
- [ ] Task 5 completed & tested
- [ ] Code reviewed

---

### DAY 4 (Thursday)
**Morning (3-4 hours):**
- Task 3: Complete rate limiting (Backend Dev 1)
- Task 6: Start payment webhook retry (Backend Dev 2)
- Code review for Task 3

**Afternoon (3-4 hours):**
- Deploy all fixes to staging
- Run full test suite
- Security audit on changes

**EOD Checklist:**
- [ ] Task 3 completed & tested
- [ ] All 5 tasks in staging
- [ ] Full test suite passing

---

### DAY 5 (Friday)
**Morning (4-5 hours):**
- Task 6: Complete & test payment webhook (Backend Dev 2)
- Code review for Task 6
- Run security penetration testing

**Afternoon (3-4 hours):**
- Load testing with 1000 concurrent users
- Performance baseline measurement
- Tech lead final sign-off
- Document completion

**EOD Checklist:**
- [ ] Task 6 completed & tested
- [ ] All Phase 1 tests passing
- [ ] Security audit passed
- [ ] Load test successful
- [ ] Tech lead approval
- [ ] Ready for Phase 2

---

## 🧪 TESTING CHECKLIST

### Unit Tests (All Must Pass)
- [ ] `npm run test -- auth.cookie.test.ts`
- [ ] `npm run test -- auth.validation.test.ts`
- [ ] `npm run test -- rate.limit.test.ts`
- [ ] `npm run test -- wallet.concurrent.test.ts`
- [ ] `npm run test -- shuttle.overbooking.test.ts`
- [ ] `npm run test -- payment.webhook.test.ts`

### Integration Tests
- [ ] Auth flow: login → token → API call → success
- [ ] Wallet: concurrent withdrawals → correct balance
- [ ] Shuttle: 15 concurrent bookings → 12 success, 3 fail
- [ ] Payment: webhook fail → retry → success

### Security Tests
- [ ] XSS attack cannot steal token
- [ ] Invalid JWT rejected
- [ ] Rate limit blocks 10k req/sec
- [ ] Wallet RLS enforced
- [ ] Shuttle booking authorization verified

### Load Tests
- [ ] 100 concurrent users: 0 errors
- [ ] 500 concurrent users: 0 errors
- [ ] 1000 concurrent users: < 5% errors
- [ ] Wallet operations: 100 concurrent → all correct
- [ ] Shuttle bookings: 50 concurrent → no overbooking

---

## 📊 PHASE 1 SUCCESS CRITERIA

**Must Have All 5 Criteria to Pass Phase 1:**

1. ✅ **Security Hardening Complete**
   - Session token in HttpOnly cookie ✓
   - JWT validation on all endpoints ✓
   - Rate limiting active ✓
   - All security tests passing ✓

2. ✅ **Data Integrity Fixed**
   - Wallet race condition resolved ✓
   - Shuttle overbooking prevented ✓
   - All concurrent tests passing ✓

3. ✅ **Payment System Working**
   - Webhook retry implemented ✓
   - Payment flow tested ✓
   - 100 concurrent transactions succeed ✓

4. ✅ **All Tests Passing**
   - Unit tests: 100% pass ✓
   - Integration tests: 100% pass ✓
   - Security tests: 100% pass ✓
   - Load tests: < 5% error rate ✓

5. ✅ **Tech Lead Approval**
   - Code reviewed and approved ✓
   - Architecture validated ✓
   - Performance acceptable ✓
   - Ready for Phase 2 ✓

---

## 🔗 REFERENCE MATERIALS

### Code Examples & SQL
- [DATABASE_SCHEMA_SQL_FIXES.md](DATABASE_SCHEMA_SQL_FIXES.md) - All SQL migrations ready to use
- [COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md](COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md) - Detailed code examples

### Testing Guidance
- [INTEGRATION_BEST_PRACTICES.md](INTEGRATION_BEST_PRACTICES.md) - Testing patterns

### File Locations
- TypeScript files: `src/services/`, `src/middleware/`
- SQL migrations: `supabase/migrations/`
- Tests: `src/**/*.test.ts`
- Edge functions: `supabase/functions/`

---

## 🚨 CRITICAL RULES FOR PHASE 1

1. **NO** changes to Phase 2/3 code
2. **ALL** changes require tests
3. **ALL** code needs review before merge
4. **NO** skipping security tests
5. **NO** deploying to production before Phase 1 complete
6. **ONLY** execute against staging environment

---

## 🎯 DAILY STANDUP FORMAT

**Every morning at [TIME] - 15 minutes**

**Questions:**
1. "What did you complete yesterday?"
2. "What do you plan to complete today?"
3. "What blockers do you have?"
4. "Any risks or issues?"

**Example Answer:**
- Completed: Task 1 (session token to HttpOnly, all tests passing)
- Today: Task 2 (JWT validation middleware, targeting 4pm completion)
- Blockers: None
- Risks: Need code review today

---

## ✅ GO-LIVE CHECKLIST

**Before declaring Phase 1 COMPLETE:**

- [ ] All 5 tasks completed
- [ ] All code committed to git
- [ ] All tests passing (0 failures)
- [ ] Code reviewed and approved
- [ ] Security audit passed
- [ ] Load test successful
- [ ] Deployed to staging
- [ ] Tech lead sign-off obtained
- [ ] Team briefing on Phase 2 completed
- [ ] Ready to proceed to Phase 2

---

## 🎊 AFTER PHASE 1: NEXT STEPS

Once Phase 1 is complete and approved:

1. **Celebrate** 🎉 (you fixed 5 critical issues!)
2. **Prepare** for Phase 2 (8 major issues)
3. **Brief** team on Phase 2 tasks
4. **Start** Phase 2 Day 1 (Monday Week 2)

**Timeline:** Week 2-3 (10 days) for Phase 2

---

## 📞 NEED HELP?

- **SQL questions?** → See [DATABASE_SCHEMA_SQL_FIXES.md](DATABASE_SCHEMA_SQL_FIXES.md)
- **Code questions?** → See [COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md](COMPREHENSIVE_IMPLEMENTATION_ROADMAP.md)
- **Testing questions?** → See [INTEGRATION_BEST_PRACTICES.md](INTEGRATION_BEST_PRACTICES.md)
- **Blocked?** → Escalate to tech lead immediately

---

**PHASE 1: READY TO EXECUTE**

**Start:** Monday, April 15, 2026  
**End:** Friday, April 19, 2026  
**Duration:** 5 days (22 hours total)  
**Team:** 2 backend developers  
**Goal:** Fix 5 critical issues, eliminate all 🔴 CRITICAL vulnerabilities  

**LET'S GO! 🚀**
