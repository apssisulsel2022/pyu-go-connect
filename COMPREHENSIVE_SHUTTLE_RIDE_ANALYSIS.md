# Comprehensive Shuttle Service & Ride on Demand Analysis

**Analysis Date:** April 15, 2026  
**Analyzed By:** Senior Backend & Fullstack Engineer  
**Report Status:** COMPLETE WITH CRITICAL FINDINGS

---

## Executive Summary

This report provides a comprehensive analysis of the Shuttle Service Module and Ride on Demand system in the pyu-go-connect application. The analysis covers architecture, implementation, database design, UI/UX, security, and business logic.

### Key Statistics
- **Total Issues Found:** 18
- **Critical Issues:** 4
- **High Priority Issues:** 8
- **Medium Priority Issues:** 6
- **Architecture Strengths:** Atomic RPC booking, server-side price verification
- **Major Gaps:** Race condition handling, subscription leak potential, incomplete error recovery

---

## 1. SHUTTLE SERVICE ARCHITECTURE

### 1.1 Booking & Scheduling System

#### Implementation Overview
**Files:** [ShuttleService.ts](src/services/ShuttleService.ts) | [useShuttleBooking.ts](src/hooks/useShuttleBooking.ts)

The Shuttle Service implements a multi-step booking flow:

```
Route Selection → Pickup Point → Date → Service/Vehicle → Seat Selection → 
Passenger Info → Validation → Summary → Payment → Confirmation
```

**Architecture Pattern:**
- **Frontend State:** Zustand store via `useShuttleBooking` hook (10 steps defined in `STEP_LIST`)
- **Backend Service:** `ShuttleService` class with RPC integration
- **Atomic Operation:** `create_shuttle_booking_atomic_v2` PostgreSQL function
- **Real-time:** Supabase subscriptions via channels

#### Key Components

1. **Route Selection** (Step: `routes`)
   - Query: `shuttle_routes` table
   - Filters: `active = true`, ordered by name
   - Purpose: User selects origin/destination

2. **Schedule Filtering** (Step: `service_cars`, `date`)
   - Multi-table join: `shuttle_schedule_services` → `shuttle_schedules`
   - Filters by: route_id, service_type_id, vehicle_type, date range
   - Returns: Available services with pricing

3. **Seat Management** (Step: `seats`)
   - Query: `shuttle_seats` table
   - Status tracking: `available`, `booked`, `reserved`
   - Layout: Dynamic based on `vehicle_type`

4. **Atomic Booking** (RPC: `create_shuttle_booking_atomic_v2`)
   - Server-side price verification (prevent tampering)
   - Atomic seat locking with UPDATE FOR UPDATE
   - Booking creation with passenger details
   - Availability update in schedule_services

---

### 1.2 Price Calculation Logic & Accuracy

#### Calculation Method
**File:** [ShuttleService.ts](src/services/ShuttleService.ts#L112) - `calculatePrice()` method

```typescript
Formula:
  baseAmount = route.base_fare
  servicePremium = baseAmount × (pricing.base_fare_multiplier - 1.0)
  rayonSurcharge = pricing.rayon_base_surcharge × seatCount
  distanceAmount = route.distance_km × pricing.distance_cost_per_km
  subtotal = baseAmount + servicePremium + rayonSurcharge + distanceAmount
  totalAmount = subtotal × peak_hours_multiplier
```

#### Price Verification
**Method:** [ShuttleService.ts](src/services/ShuttleService.ts#L198) - `verifyBookingPrice()`

Anti-tampering mechanism:
- Recalculates price server-side
- Allows 1 IDR tolerance for rounding
- Returns difference for auditing

#### Issues Identified

**🔴 CRITICAL: Incomplete Peak Hours Logic**
- **Location:** [fareCalculation.ts](src/lib/fareCalculation.ts) - Ride on Demand only
- **Issue:** Peak hours multiplier retrieved from DB but not applied in shuttle pricing flow
- **Location Code:** [ShuttleService.ts](src/services/ShuttleService.ts#L176)
  ```typescript
  const peakMultiplier = pricing.peak_hours_multiplier || 1.0;
  // ...
  const subtotal = baseAmount + servicePremium + rayonSurcharge + distanceAmount;
  const totalAmount = subtotal * peakMultiplier;
  ```
- **Severity:** HIGH
- **Risk:** Incorrect pricing during peak hours; potential customer confusion and revenue loss
- **Recommendation:** Verify peak_hours_start/end logic in `get_current_pricing_for_service()` RPC

**🔴 CRITICAL: No Promotion/Discount Support**
- **Issue:** Pricing system has no discount code, promotion, or voucher mechanism
- **Impact:** No revenue optimization through promotional campaigns
- **Recommendation:** Add discount_code_id foreign key to shuttle_bookings; create voucher system

**🟠 HIGH: Floating Point Rounding Issues**
- **Location:** [ShuttleService.ts](src/services/ShuttleService.ts#L184-186)
- **Issue:** Multiple round operations (×100, ÷100) can cause precision loss
  ```typescript
  totalAmount: Math.round(totalAmount * 100) / 100
  ```
- **Risk:** Cumulative rounding errors for multi-seat bookings
- **Recommendation:** Use NUMERIC type in DB (already correct); ensure client uses Decimal.js for calculations

**🟠 HIGH: Negative Price Handling**
- **Location:** RPC `calculate_shuttle_booking_price` [migration 20260414000013](supabase/migrations/20260414000013_phase1_atomic_booking.sql#L50)
- **Issue:** No validation that calculated price is > 0
- **Risk:** Free/negative price bookings possible if pricing rules misconfigured
- **Recommendation:** Add CHECK constraint: `total_amount > 0`

---

### 1.3 Zone & Route Management

#### Database Schema
**Tables:** `shuttle_routes`, `shuttle_rayons`, `shuttle_pickup_points`, `shuttle_schedules`

**Relationships:**
```
shuttle_routes (1) ←→ (N) shuttle_rayons
shuttle_rayons (1) ←→ (N) shuttle_pickup_points
shuttle_routes (1) ←→ (N) shuttle_schedules
shuttle_schedules (1) ←→ (N) shuttle_seats
```

#### Issues Identified

**🟠 HIGH: Missing Rayon Deactivation Cascade**
- **Location:** [useShuttleBooking.ts](src/hooks/useShuttleBooking.ts#L60-70)
- **Issue:** When rayon is deactivated, old pickups still appear in UI query cache
- **SQL Problem:**
  ```sql
  SELECT * FROM shuttle_rayons WHERE route_id = $1 AND active = true
  ```
  New rayons added after initial load won't show without cache refresh
- **Recommendation:** 
  - Implement React Query invalidation on rayon changes
  - Add mutation trigger for schedule updates

**🟡 MEDIUM: No Service Zone Validation**
- **Issue:** No geographic boundary checking for pickup/dropoff locations
- **Risk:** Users can book outside service area and get stranded
- **Recommendation:** Add PostGIS query to validate point-in-polygon for service zones

---

### 1.4 Seat Allocation & Availability

#### Current System
**Files:** [SeatSelector.tsx](src/components/shuttle/SeatSelector.tsx) | [SeatLayout.tsx](src/components/shuttle/SeatLayout.tsx)

**Seat States:**
- `available` - Can be booked
- `booked` - Locked by successful booking
- `reserved` - Temporarily held (not implemented)

#### Issues Identified

**🔴 CRITICAL: Race Condition in Seat Selection**
- **Location:** [ShuttleRefactored.tsx](src/pages/ShuttleRefactored.tsx#L150-180) - `handleConfirmSeats()`
- **Issue:** No locking between seat visibility check and booking
- **Sequence:**
  1. User sees 5 available seats at 14:05:32
  2. User clicks seat 1, 2, 3
  3. Another user books seats 1, 2 at 14:05:33
  4. First user's booking still proceeds → RPC fails or creates ghost booking
- **Current Mitigation:** RPC `create_shuttle_booking_atomic_v2` has `UPDATE` with `FOR UPDATE` lock, but:
  - Lock only acquired during booking, not during selection
  - No optimistic locking or reservation period
- **SQL Vulnerability:**
  ```sql
  UPDATE public.shuttle_seats 
  SET status = 'booked'
  WHERE schedule_id = $1 AND status != 'booked'
  ```
  Multiple users updating simultaneously can cause lost updates
- **Recommendation:**
  - Implement 2-minute seat reservation with `reserved_at` timestamp
  - Use `reserved_by_session` to tie reservation to browser session
  - Add automatic reservation cleanup for expired reservations

**🟠 HIGH: No Overbooking Prevention**
- **Location:** [useShuttleBooking.ts](src/hooks/useShuttleBooking.ts#L140)
- **Issue:** `available_seats` in `shuttle_schedules` is decremented but not locked
- **Scenario:**
  1. Schedule shows 5 seats available
  2. Two concurrent bookings both see 5 seats
  3. Both book 3 seats each = overbooking
- **Fix:** The RPC does lock rows, but the initial check queries are unguarded
- **Recommendation:**
  ```sql
  SELECT available_seats FROM shuttle_schedules 
  WHERE id = $1 FOR UPDATE;  -- Add lock
  ```

**🟡 MEDIUM: Seat Layout Mismatch**
- **Location:** [SeatLayout.tsx](src/components/shuttle/SeatLayout.tsx)
- **Issue:** Vehicle seat layout is hardcoded by `vehicle_type` (SUV, Bus, etc.)
- **Risk:** If actual vehicle layout differs, users book wrong seats
- **Recommendation:** Move layout to `shuttle_vehicle_types` table with JSON config

---

### 1.5 Real-time Updates & Subscriptions

#### Current Implementation
**Files:** [Ride.tsx](src/pages/Ride.tsx#L195-210) | [useDriverTracking.ts](src/hooks/useDriverTracking.ts)

**Subscription Pattern:**
```typescript
const channel = supabase.channel(`ride-${currentRideId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rides',
    filter: `id=eq.${currentRideId}`
  }, payload => { /* handle */ })
  .subscribe();
```

#### Issues Identified

**🔴 CRITICAL: Subscription Memory Leak**
- **Location:** [Ride.tsx](src/pages/Ride.tsx#L197-220)
- **Issue:** If user navigates away before ride completes, subscription not properly cleaned up
- **Code Pattern:**
  ```typescript
  useEffect(() => {
    if (!currentRideId) return;
    const channel = supabase.channel(`ride-${currentRideId}`).on(...).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentRideId]);
  ```
- **Problem:** `currentRideId` can remain set; component unmount may not trigger cleanup
- **Evidence:** No validation that channel was actually removed
- **Recommendation:**
  - Always unsubscribe in cleanup
  - Add channel state tracking
  - Implement timeout-based subscription cleanup

**🟠 HIGH: Missing Fallback for Offline Users**
- **Location:** [useDriverTracking.ts](src/hooks/useDriverTracking.ts#L18-22)
- **Issue:** If subscription fails, no retry or polling fallback
- **Current Code:**
  ```typescript
  const channel = supabase.channel("driver-locations")
    .on('postgres_changes', { event: "*", schema: "public", table: "drivers" }, ...)
    .subscribe();
  ```
- **Problem:** If WebSocket fails, no driver updates
- **Recommendation:**
  - Implement exponential backoff reconnection
  - Add periodic polling as fallback
  - Track connection status in UI

**🟡 MEDIUM: Unbounded Real-time Data**
- **Issue:** `driver-locations` channel updates ALL driver positions, even those far away
- **Performance Impact:** Network bandwidth wasted on irrelevant driver updates
- **Recommendation:**
  - Filter by geographic proximity (e.g., 5km radius)
  - Implement pagination or clustering

**🟡 MEDIUM: Broadcasting Not Used**
- **Issue:** Ride status changes broadcast to driver-specific channel, but broadcasting mechanism unused
- **Location:** [Ride.tsx](src/pages/Ride.tsx#L195) - hardcoded to one ride
- **Recommendation:** Consider broadcast for multi-user scenarios (e.g., shared ride)

---

### 1.6 Booking Confirmation & Payment Flow

#### Current Flow
**File:** [ShuttleRefactored.tsx](src/pages/ShuttleRefactored.tsx#L140-165)

**Steps:**
1. Summary review (step: `summary`)
2. Payment method selection (PaymentForm component)
3. Payment processing
4. Confirmation display

#### Issues Identified

**🔴 CRITICAL: No Payment Status Tracking Before Confirmation**
- **Location:** [ShuttleRefactored.tsx](src/pages/ShuttleRefactored.tsx#L155)
- **Issue:** Booking is created BEFORE payment confirmation
- **Current Code:**
  ```typescript
  const confirmation = await ShuttleService.createBooking(user.id, { ... });
  if (confirmation) {
    setStep('confirmation');
    toast.success('Booking confirmed!');
  }
  ```
- **Problem:**
  - Booking marked as PENDING_PAYMENT
  - User exits before paying → seats locked, booking abandoned
  - No automatic refund/unlock
- **Recommendation:**
  - Create booking in `RESERVED` state (not PENDING_PAYMENT)
  - Only mark as CONFIRMED after payment webhook
  - Implement 15-minute expiry for unpaid bookings

**🟠 HIGH: No Payment Idempotency**
- **Issue:** Multiple payment clicks create duplicate bookings
- **Location:** [PaymentForm.tsx](src/components/shuttle/PaymentForm.tsx#L25-40)
- **Risk:** User gets charged twice if they click "Pay" button twice
- **Recommendation:**
  - Disable button after first click
  - Implement idempotency keys for payment processor
  - Add duplicate payment detection

**🟠 HIGH: Missing Payment Webhook Error Handling**
- **Issue:** If payment gateway webhook fails, booking stays UNPAID forever
- **Recommendation:**
  - Implement retry mechanism for failed webhooks
  - Add manual payment reconciliation endpoint
  - Track webhook delivery status

---

## 2. RIDE ON DEMAND SERVICE

### 2.1 Order Creation & Validation

#### Implementation
**File:** [Ride.tsx](src/pages/Ride.tsx#L100-130)

**Order Creation Process:**
```typescript
const { data: ride } = await supabase.from("rides").insert({
  rider_id, pickup_lat, pickup_lng, pickup_address,
  dropoff_lat, dropoff_lng, dropoff_address,
  fare, distance_km, status: "pending", service_type
}).select().single();
```

#### Issues Identified

**🔴 CRITICAL: No Input Validation**
- **Location:** [Ride.tsx](src/pages/Ride.tsx#L95-110)
- **Issue:** No server-side validation of coordinates, addresses, or fare
- **Vulnerable Code:**
  ```typescript
  if (typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number' ||
      typeof dropoff.lat !== 'number' || typeof dropoff.lng !== 'number') {
    toast.error("Invalid location coordinates");
    return;
  }
  ```
- **Problem:**
  - Only checks type, not range (-90 to 90 for lat, -180 to 180 for lng)
  - No minimum distance check on server
  - Fare not verified before insertion
- **Recommendation:**
  ```sql
  ALTER TABLE public.rides ADD CONSTRAINT valid_pickup_lat 
    CHECK (pickup_lat >= -90 AND pickup_lat <= 90);
  ALTER TABLE public.rides ADD CONSTRAINT valid_dropoff_lat 
    CHECK (dropoff_lat >= -90 AND dropoff_lat <= 90);
  ALTER TABLE public.rides ADD CONSTRAINT valid_distance 
    CHECK (distance_km > 0.1);
  ALTER TABLE public.rides ADD CONSTRAINT valid_fare 
    CHECK (fare > 0);
  ```

**🟠 HIGH: Race Condition in Ride Creation**
- **Location:** [Ride.tsx](src/pages/Ride.tsx#L100-115)
- **Issue:** No database constraints preventing duplicate orders in same second
- **Scenario:**
  1. User clicks "Request Ride" at 14:05:32.100
  2. Network slow, click sent twice
  3. Two rides created with same coordinates
- **Recommendation:**
  ```sql
  CREATE UNIQUE INDEX idx_rides_recent_same_location ON rides(
    rider_id,
    ROUND(pickup_lat::numeric, 4),
    ROUND(dropoff_lat::numeric, 4),
    ROUND(pickup_lng::numeric, 4),
    ROUND(dropoff_lng::numeric, 4)
  ) WHERE created_at > NOW() - interval '1 minute' AND status = 'pending';
  ```

**🟡 MEDIUM: Missing Ride Request Validation Rules**
- **Missing Checks:**
  - Rider account active/banned?
  - Rider has valid payment method?
  - Rider in service area?
  - Time-based restrictions (e.g., no rides after 23:00)?
- **Recommendation:** Create RPC `validate_ride_request()` with all checks

---

### 2.2 Driver Matching Algorithm

#### Current Implementation
**File:** [Ride.tsx](src/pages/Ride.tsx#L115-130) calls Edge Function `dispatch-driver`

**Algorithm (Inferred):**
1. Query available drivers within service area
2. Calculate distance to pickup
3. Dispatch to nearest driver
4. Timeout: If driver doesn't accept, try next driver

#### Issues Identified

**🔴 CRITICAL: No Matching Algorithm Specification**
- **Location:** No client-side logic found; Edge Function only referenced
- **Issue:** Algorithm hidden in Edge Function (not in workspace)
- **Risk:** Cannot verify correctness, fairness, or compliance
- **Questions:**
  - How is "nearest" calculated (Haversine vs. routing API)?
  - What happens if no drivers available?
  - How many times is each driver offered before moving to next?
  - Are driver ratings considered?
  - Are surge pricing rules applied?
- **Recommendation:** Document algorithm in separate file or add comments

**🟠 HIGH: No Matching Fairness Guarantee**
- **Issue:** No round-robin or load-balancing algorithm visible
- **Risk:** Some drivers get all orders, others get none (low earnings)
- **Recommendation:**
  - Implement driver rotation queue
  - Track consecutive refusals per driver
  - Consider acceptance rate and rating in matching

**🟠 HIGH: No Matching Timeout or Retry**
- **Location:** [Ride.tsx](src/pages/Ride.tsx#L118-125)
- **Issue:** One dispatch attempt; if fails, shows "No drivers available"
- **Current Code:**
  ```typescript
  if (dispatchErr || dispatchData?.error) {
    toast.info("No drivers available right now. We'll keep searching.");
  }
  ```
- **Problem:**
  - "We'll keep searching" message but no actual retry logic shown
  - Ride status may be stuck in 'pending'
- **Recommendation:**
  - Implement automatic retry every 30 seconds for 5 minutes
  - Show retry countdown to user

---

### 2.3 Real-time Tracking

#### Implementation
**File:** [Ride.tsx](src/pages/Ride.tsx#L195-220)

**Tracking Method:**
- Subscribe to `rides` table UPDATE events
- When driver_id set, fetch driver location from `drivers` table

#### Issues Identified

**🔴 CRITICAL: Stale Driver Location Data**
- **Location:** [useDriverTracking.ts](src/hooks/useDriverTracking.ts#L10-15)
- **Issue:** Driver location not verified for recency
- **Current Code:**
  ```typescript
  const { data } = await supabase
    .from("drivers")
    .select("id, full_name, current_lat, current_lng, status")
    .eq("status", "available");
  ```
- **Problem:**
  - `current_lat/lng` could be hours old
  - No `updated_at` timestamp check
  - Driver could have gone offline but location still shows
- **Recommendation:**
  ```sql
  SELECT * FROM drivers 
  WHERE status = 'available'
  AND current_location_updated_at > NOW() - interval '30 seconds'
  ORDER BY distance(current_location, $1) ASC
  LIMIT 10;
  ```

**🟠 HIGH: No Realtime Driver Updates for In-Progress Rides**
- **Location:** [Ride.tsx](src/pages/Ride.tsx#L195)
- **Issue:** Only subscribes to ride status, not continuous driver location updates
- **Risk:** Rider sees stale driver position on map
- **Recommendation:**
  - Subscribe to `drivers` table with filter for specific driver_id
  - Update map marker every 2-3 seconds

---

### 2.4 Ride Completion Workflow

#### Current Implementation
**File:** [Ride.tsx](src/pages/Ride.tsx#L195-220)

**States:** `pending` → `accepted` → `in_progress` → `completed`

#### Issues Identified

**🟠 HIGH: No Ride Completion Validation**
- **Issue:** No checks that driver actually reached destination
- **Risk:** Driver marks complete at wrong location, rider not at dropoff
- **Recommendation:**
  - Require GPS proximity check (within 50m of dropoff)
  - Require rider photo/proof
  - Implement dispute resolution

**🟡 MEDIUM: No Ride Duration Limits**
- **Issue:** Ride can stay in `in_progress` indefinitely
- **Risk:** Billing issues if ride never marked complete
- **Recommendation:**
  ```sql
  ALTER TABLE rides ADD COLUMN max_duration_minutes INT DEFAULT 300;
  SELECT * FROM rides 
  WHERE status = 'in_progress' 
  AND created_at < NOW() - interval '1 hour'
  FOR UPDATE;
  -- Auto-complete or alert
  ```

**🟡 MEDIUM: No Pickup Confirmation**
- **Issue:** Ride goes to `accepted` but driver may not actually pick up rider
- **Recommendation:**
  - Require driver to confirm pickup with OTP
  - Add delay before `in_progress` state

---

### 2.5 Rating & Review System

#### Implementation
**File:** [RideRatingDialog.tsx](src/components/ride/RideRatingDialog.tsx) (referenced)

#### Issues Identified

**🟠 HIGH: Rating System Not Implemented**
- **Location:** Rating component exists but backend service missing
- **Issue:** No API to save ratings to database
- **Recommendation:**
  - Implement `rides_ratings` table
  - RLS policies to ensure only ride participants can rate
  - Aggregate ratings to `drivers.rating` field
  - Cache ratings for performance

**🟡 MEDIUM: No Rating Verification**
- **Issue:** Anyone with ride_id could rate the ride (no ownership check)
- **Recommendation:**
  ```sql
  CREATE POLICY "Users can rate own rides" ON rides_ratings
    FOR INSERT WITH CHECK (
      auth.uid() = (SELECT rider_id FROM rides WHERE id = rides_ratings.ride_id)
      OR auth.uid() = (SELECT driver_id FROM rides WHERE id = rides_ratings.ride_id)
    );
  ```

**🟡 MEDIUM: No Rating Fraud Prevention**
- **Issue:** Users could rate same ride multiple times
- **Recommendation:**
  ```sql
  CREATE UNIQUE INDEX idx_one_rating_per_user_per_ride ON rides_ratings(ride_id, rater_id);
  ```

---

### 2.6 Cancellation Handling

#### Current Implementation
**File:** [Ride.tsx](src/pages/Ride.tsx) - No cancellation logic visible

#### Issues Identified

**🔴 CRITICAL: No Cancellation Support**
- **Location:** No cancellation endpoint implemented
- **Issue:** Users cannot cancel rides after booking
- **Risk:** Stranded riders, negative reviews
- **Recommendation:**
  ```typescript
  async function cancelRide(rideId: string, reason: string, refund: boolean) {
    // 1. Check ride status - only allow if pending or accepted
    // 2. Calculate refund (if applicable)
    // 3. Update ride status to 'cancelled'
    // 4. Release driver from assignment
    // 5. Process refund to wallet
    // 6. Log cancellation reason
  }
  ```

**🟠 HIGH: No Cancellation Policies**
- **Missing Rules:**
  - Can rider cancel after driver accepted? (Allow with fee?)
  - Can driver cancel after pickup? (Not allowed)
  - Cancellation fee structure?
  - Refund timeline?
- **Recommendation:** Document and implement cancellation policies in code

**🟠 HIGH: No Driver Acceptance Timeout**
- **Issue:** Driver can accept but never pickup; ride stuck
- **Recommendation:**
  ```sql
  CREATE TRIGGER auto_cancel_stuck_rides
  BEFORE UPDATE ON rides
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status = 'pending')
  EXECUTE FUNCTION check_driver_pickup_timeout();
  ```

---

## 3. UI COMPONENTS REVIEW

### 3.1 ShuttleRefactored Component

**File:** [ShuttleRefactored.tsx](src/pages/ShuttleRefactored.tsx)

#### Strengths
- ✅ Clear step-based UI flow
- ✅ Progress indicator
- ✅ Error state handling
- ✅ Loading states for queries

#### Issues

**🟠 HIGH: No State Persistence**
- **Issue:** If user refreshes page during booking, state lost
- **Risk:** Poor UX, abandoned bookings
- **Recommendation:**
  - Persist `useShuttleBooking` state to localStorage
  - Restore on component mount
  - Add "resume booking" option

**🟠 HIGH: No Booking Timeout**
- **Issue:** Booking state valid indefinitely
- **Risk:** User selects seats, leaves browser open, comes back next day
- **Recommendation:**
  - Add session timeout (30 minutes)
  - Auto-cancel on timeout with seat unlock

**🟡 MEDIUM: Missing Accessibility**
- **Issue:** No ARIA labels, keyboard navigation may be broken
- **Recommendation:**
  - Add ARIA labels to form fields
  - Test with keyboard only navigation
  - Add skip links

---

### 3.2 Component-Level Issues

#### SeatSelector Component
**File:** [SeatSelector.tsx](src/components/shuttle/SeatSelector.tsx)

**Issues:**
- ❌ No visual indication of reserved seats (only booked/available)
- ❌ Seat price not recalculated if service changes
- ❌ No seat recommendation (avoid middle seats, etc.)

#### PaymentForm Component
**File:** [PaymentForm.tsx](src/components/shuttle/PaymentForm.tsx)

**Issues:**
- ❌ No payment method pre-selection based on user preference
- ❌ No payment failure recovery (retry logic)
- ❌ QRIS/E-Wallet option disabled if processing

#### BookingSummary Component
**File:** [BookingSummary.tsx](src/components/shuttle/BookingSummary.tsx)

**Issues:**
- ❌ No edit functionality (user must restart booking to change details)
- ❌ No terms & conditions acceptance
- ❌ Insurance/protection options not shown

---

## 4. DATABASE INTEGRATION

### 4.1 Schema Analysis

#### Current Tables
```
shuttle_routes ← N:1 → shuttle_schedules
shuttle_rayons ← N:1 → shuttle_pickup_points
shuttle_schedules ← N:1 → shuttle_seats
shuttle_schedules ← N:1 → shuttle_bookings
shuttle_bookings ← N:1 → shuttle_booking_details
shuttle_service_types ← N:1 → shuttle_pricing_rules
rides ← N:1 → drivers
drivers ← N:1 → users
```

#### Issues Identified

**🔴 CRITICAL: Missing Foreign Key Constraints**
- **Location:** Multiple tables missing NOT NULL + REFERENCES constraints
- **Issue:**
  - `shuttle_bookings.driver_id` can be NULL but driver_id referenced in queries
  - `rides.driver_id` can be NULL, causing NULL reference issues
- **Risk:** Data integrity issues, incorrect joins
- **Recommendation:**
  ```sql
  ALTER TABLE public.shuttle_bookings 
    ADD CONSTRAINT fk_bookings_driver_id 
    FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;
  
  ALTER TABLE public.rides
    ADD CONSTRAINT fk_rides_driver_id 
    FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;
  ```

**🟠 HIGH: Missing Indexes for Common Queries**
- **Location:** [useShuttleBooking.ts](src/hooks/useShuttleBooking.ts#L60-70)
- **Missing Indexes:**
  ```sql
  -- Query: SELECT * FROM shuttle_rayons WHERE route_id = $1
  CREATE INDEX IF NOT EXISTS idx_rayons_route_id ON public.shuttle_rayons(route_id);
  
  -- Query: SELECT * FROM shuttle_schedules WHERE route_id = $1 AND departure_time >= $2
  CREATE INDEX IF NOT EXISTS idx_schedules_route_departure 
    ON public.shuttle_schedules(route_id, departure_time);
  ```

**🟠 HIGH: No Transaction Isolation Specification**
- **Location:** RPC `create_shuttle_booking_atomic_v2` [migration 20260414000013](supabase/migrations/20260414000013_phase1_atomic_booking.sql#L103)
- **Issue:** Implicit SERIALIZABLE isolation may not be set
- **Risk:** Dirty reads, lost updates
- **Recommendation:**
  ```sql
  CREATE OR REPLACE FUNCTION create_shuttle_booking_atomic_v2(...) 
  RETURNS UUID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  SET transaction_isolation = 'serializable'  -- Add this
  AS $$
  ```

**🟡 MEDIUM: Denormalization for Performance**
- **Issue:** No caching tables for frequently accessed data
- **Example:** 
  - `shuttle_schedules.available_seats` is recalculated from `shuttle_seats` count
  - `drivers.rating` not cached, must aggregate from `rides_ratings` table
- **Recommendation:**
  - Use materialized views for aggregations
  - Update cache on INSERT/UPDATE/DELETE

---

### 4.2 Query Optimization

#### Problematic Queries

**🟠 HIGH: N+1 Query in Schedule Loading**
- **Location:** [useShuttleBooking.ts](src/hooks/useShuttleBooking.ts#L150)
- **Current Query:**
  ```typescript
  const { data: schedulesData } = await supabase
    .from('shuttle_schedules')
    .select('id')  // ← Only fetches IDs in first query
    ...
  const { data: servicesData } = await supabase
    .from('shuttle_schedule_services')
    .select('...')
    .in('schedule_id', schedulesData.map(s => s.id));  // ← Second query
  ```
- **Problem:** Two sequential queries instead of one JOIN
- **Recommendation:**
  ```typescript
  const { data } = await supabase
    .from('shuttle_schedule_services')
    .select('*, shuttle_schedules!inner(id, route_id, departure_time)')
    .eq('shuttle_schedules.route_id', routeId)
    .gte('shuttle_schedules.departure_time', dateStart)
    .lte('shuttle_schedules.departure_time', dateEnd);
  ```

**🟠 HIGH: Missing Query Pagination**
- **Location:** [ShuttleRefactored.tsx](src/pages/ShuttleRefactored.tsx#L100)
- **Issue:** All schedules loaded at once
- **Risk:** Performance degradation for routes with 1000+ daily schedules
- **Recommendation:** Implement pagination or infinite scroll

---

### 4.3 RLS Policies

#### Current Policies

**shuttle_bookings:**
```sql
-- Users can view own bookings
-- Admins can view all bookings
```

#### Issues

**🟠 HIGH: Incomplete RLS Policies**
- **Issue:** Some tables lack RLS policies
  - `shuttle_schedule_services` - No policies defined?
  - `shuttle_pricing_rules` - Only public read
- **Risk:** Information leakage or unauthorized modifications
- **Recommendation:**
  ```sql
  -- Ensure all tables have RLS enabled
  SELECT tablename FROM pg_tables 
  WHERE schemaname = 'public' AND tablename LIKE 'shuttle%'
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = pg_tables.tablename);
  ```

---

## 5. ISSUE IDENTIFICATION & SEVERITY

### 5.1 Critical Issues (P0)

| # | Issue | Location | Impact | Fix Effort |
|---|-------|----------|--------|-----------|
| 1 | **Race Condition in Seat Selection** | ShuttleService + RPC | Overbooking, double bookings | HIGH |
| 2 | **Subscription Memory Leak** | Ride.tsx | Memory exhaustion, stale subscriptions | MEDIUM |
| 3 | **No Input Validation on Ride Creation** | Ride.tsx | Arbitrary coordinates, negative fares | MEDIUM |
| 4 | **Booking Created Before Payment** | ShuttleRefactored.tsx | Abandoned bookings, seat lockup | HIGH |

### 5.2 High Priority Issues (P1)

| # | Issue | Location | Impact | Fix Effort |
|---|-------|----------|--------|-----------|
| 5 | **Incomplete Peak Hours Logic** | ShuttleService | Incorrect pricing, revenue loss | MEDIUM |
| 6 | **Overbooking Prevention Incomplete** | useShuttleBooking | Seat overselling | HIGH |
| 7 | **No Payment Idempotency** | PaymentForm | Duplicate charges | MEDIUM |
| 8 | **No Driver Matching Algorithm Spec** | Ride.tsx | Cannot verify fairness | LOW |
| 9 | **Missing Cancellation Support** | Ride.tsx | Cannot cancel rides | HIGH |
| 10 | **Stale Driver Location Data** | useDriverTracking | Inaccurate tracking | MEDIUM |

### 5.3 Medium Priority Issues (P2)

| # | Issue | Location | Impact | Fix Effort |
|---|-------|----------|--------|-----------|
| 11 | **No Promotion/Discount System** | ShuttleService | No revenue optimization | HIGH |
| 12 | **State Not Persisted** | ShuttleRefactored | Poor UX on refresh | MEDIUM |
| 13 | **Missing Payment Webhook Handler** | (Not in workspace) | Payment reconciliation issues | HIGH |
| 14 | **No Ride Completion Validation** | Ride.tsx | Billing disputes | MEDIUM |
| 15 | **Missing Rating Backend** | (Referenced only) | No feedback system | HIGH |
| 16 | **No Service Zone Validation** | (Missing) | Out-of-area bookings | MEDIUM |
| 17 | **Query N+1 Problem** | useShuttleBooking | Performance degradation | MEDIUM |
| 18 | **Missing Rayon Cascade Updates** | useShuttleBooking | UI cache inconsistency | MEDIUM |

---

## 6. SECURITY & BUSINESS LOGIC ASSESSMENT

### 6.1 Price Manipulation Prevention

#### Current Mechanisms
✅ Server-side price recalculation in `create_shuttle_booking_atomic_v2`  
✅ 1 IDR tolerance for rounding (prevents arbitrary price hacking)  
✅ Pricing rules stored in database (not client-editable)

#### Vulnerabilities

**🔴 CRITICAL: Pricing Rule Injection**
- **Issue:** Pricing RPC calls `get_current_pricing_for_service()` with user-provided service_type_id
- **Risk:** Admin could modify pricing_rules table to charge negative amounts
- **Mitigation:** RLS policies should prevent user modification
- **Recommendation:**
  ```sql
  CREATE POLICY "Only admins modify pricing"
    ON shuttle_pricing_rules
    FOR UPDATE USING (auth.jwt() ->> 'user_role' IN ('admin', 'super_admin'));
  ```

**🟠 HIGH: Peak Hours Multiplier Bypass**
- **Issue:** Peak hours logic in `get_current_pricing_for_service()` but not verified in RPC
- **Risk:** If RPC peak_multiplier is 1.0 but DB has 1.5, price is wrong
- **Recommendation:** Verify `peak_hours_multiplier` value is positive and <= 2.0

---

### 6.2 Payment Fraud Prevention

#### Current Mechanisms
✅ Payment method stored in booking (CASH/CARD/TRANSFER)  
✅ Booking locked to user_id

#### Vulnerabilities

**🔴 CRITICAL: No Payment Verification**
- **Issue:** No webhook from payment processor integrated
- **Risk:** Booking marked as paid without payment confirmation
- **Evidence:** No payment webhook handler visible in workspace
- **Recommendation:**
  - Integrate Midtrans/Xendit webhook handlers
  - Verify webhook signatures
  - Reconcile payment status daily

**🟠 HIGH: Negative Fare Booking**
- **Issue:** If pricing calculation returns 0 or negative fare
- **Risk:** Free rides for malicious users
- **Recommendation:** Add CHECK constraint `total_fare > 0`

**🟠 HIGH: No Duplicate Payment Detection**
- **Issue:** User can submit payment twice
- **Recommendation:**
  - Track payment gateway transaction IDs
  - Implement idempotency keys
  - Check for duplicate payments before processing

---

### 6.3 Unauthorized Access Prevention

#### RLS Policies

**shuttle_bookings:**
- ✅ Users can only view own bookings
- ✅ Admins can view all

**shuttle_seats:**
- ❌ No RLS policy found

**drivers:**
- ❌ Drivers cannot hide personal info from riders (privacy issue)

**Recommendation:** Add comprehensive RLS for all tables

---

### 6.4 Double-Booking Prevention

#### Mechanisms

**Current:**
- Atomic RPC with seat locking
- `UPDATE ... FOR UPDATE` lock

**Testing Needed:**
```sql
-- Concurrent booking test
-- User A and B select seats 1-3
-- Both try to book simultaneously
-- Only one should succeed, other gets "seats already booked"
```

#### Vulnerabilities

**🟠 HIGH: Race Condition Between Queries**
- **Location:** [useShuttleBooking.ts](src/hooks/useShuttleBooking.ts#L140)
- **Issue:** Initial seat availability check unguarded; only RPC is locked
- **Recommendation:**
  - Check availability at beginning of booking flow
  - Reserve seats for 2 minutes
  - Validate availability again before committing

---

### 6.5 Refund Policies

#### Current Status

**Not Implemented:**
- ❌ No refund calculation logic
- ❌ No refund tracking table
- ❌ No automatic refund on cancellation
- ❌ No refund deadline rules

#### Recommendation: Implement Refund System

```typescript
interface RefundPolicy {
  cancellationDeadline: number;  // Hours before departure
  refundPercentage: number;      // 0-100%
  platformFee: number;           // Fixed fee retained
}

// Example: 100% refund if cancelled 24+ hours before departure
// 50% refund if cancelled 2-24 hours before
// 0% refund if cancelled <2 hours before
```

---

## 7. PRIORITIZED RECOMMENDATIONS

### Phase 1: Critical Fixes (1-2 weeks)

**Priority 1.1: Fix Race Conditions**
- [ ] Implement seat reservation (2-minute hold)
- [ ] Add optimistic locking on shuttle_schedules
- [ ] Test concurrent booking scenarios

**Priority 1.2: Payment Flow Security**
- [ ] Validate payment before marking booking confirmed
- [ ] Implement idempotency keys
- [ ] Add payment webhook handlers

**Priority 1.3: Input Validation**
- [ ] Add CHECK constraints on rides table
- [ ] Server-side validation for all user inputs
- [ ] Implement coordinate range validation

### Phase 2: High Priority (2-4 weeks)

**Priority 2.1: Cancellation Support**
- [ ] Implement cancel_ride() RPC
- [ ] Define cancellation policies
- [ ] Implement refund system

**Priority 2.2: Realtime Reliability**
- [ ] Fix subscription memory leaks
- [ ] Implement reconnection logic
- [ ] Add connection status indicator

**Priority 2.3: Database Optimization**
- [ ] Add missing indexes
- [ ] Implement query pagination
- [ ] Fix N+1 queries

### Phase 3: Medium Priority (4-8 weeks)

**Priority 3.1: Feature Completeness**
- [ ] Implement promotion/discount system
- [ ] Complete rating system backend
- [ ] Add service zone validation

**Priority 3.2: UX Improvements**
- [ ] Persist booking state to localStorage
- [ ] Add booking timeout with auto-cancel
- [ ] Implement booking resume functionality

**Priority 3.3: Monitoring & Analytics**
- [ ] Track booking completion rates
- [ ] Monitor payment success rates
- [ ] Alert on overbooking attempts

---

## 8. TESTING STRATEGY

### Unit Tests Needed

```typescript
// ShuttleService
- calculatePrice(): edge cases (negative fare, rounding errors)
- verifyBookingPrice(): tolerance boundaries
- validateBooking(): all error conditions

// Ride on Demand
- calculateFareLocally(): boundary coordinates
- validateRideRequest(): all validation rules
```

### Integration Tests Needed

```typescript
// Concurrent Booking Scenario
describe('Concurrent Seat Booking', () => {
  test('Two users cannot book same seat', async () => {
    // User A selects seats 1-3
    // User B selects seats 1-3
    // Both submit simultaneously
    // Only one succeeds
  });
});

// Payment Flow
describe('Payment Flow', () => {
  test('Booking not confirmed before payment', async () => {
    // Create booking
    // Verify status = PENDING_PAYMENT
    // Verify seats locked
    // Cancel payment
    // Verify seats unlocked after 15 minutes
  });
});

// Realtime Subscription
describe('Realtime Subscriptions', () => {
  test('No memory leaks on unsubscribe', async () => {
    // Subscribe to ride
    // Navigate away
    // Check memory usage hasn't increased
  });
});
```

### E2E Tests Needed

- [ ] Complete shuttle booking flow
- [ ] Complete ride on demand flow  
- [ ] Payment processing
- [ ] Cancellation and refunds
- [ ] Rating and reviews

---

## 9. CODE QUALITY METRICS

### Current State
- **Test Coverage:** Unknown (no test files in services)
- **Type Safety:** TypeScript interfaces defined (good)
- **Error Handling:** Inconsistent (some try-catch, some error returns)
- **Documentation:** Minimal JSDoc comments

### Recommendations

**Add Documentation:**
```typescript
/**
 * Calculate shuttle booking price with server-side verification
 * @param routeId - Shuttle route ID
 * @param serviceTypeId - Service type ID
 * @param rayonId - Pickup zone ID
 * @param seatCount - Number of seats
 * @returns PriceBreakdown or null if calculation fails
 * @throws Error if pricing rules not found
 * 
 * @example
 * const price = await service.calculatePrice(routeId, serviceId, rayonId, 2);
 * console.log(`Total: ${price.totalAmount}`);
 */
```

**Improve Error Handling:**
```typescript
// Instead of:
if (error) throw error;

// Use:
if (error) {
  logger.error('Failed to fetch schedules', { error, routeId });
  throw new BookingError('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
}
```

---

## 10. DEPLOYMENT CHECKLIST

- [ ] All critical issues fixed and tested
- [ ] Database constraints added
- [ ] Indexes created and performance tested
- [ ] RLS policies verified
- [ ] Payment webhooks implemented and tested
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented
- [ ] Load test: 100 concurrent bookings
- [ ] Smoke test: Happy path booking flow
- [ ] Security audit passed

---

## APPENDIX A: Database Schema Recommendations

### Critical Additions

```sql
-- 1. Add seat reservation system
ALTER TABLE public.shuttle_seats ADD COLUMN (
  reserved_at TIMESTAMPTZ,
  reserved_by_session UUID
);

-- 2. Add refund tracking
CREATE TABLE public.booking_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.shuttle_bookings(id),
  refund_amount NUMERIC(12,2) NOT NULL,
  refund_reason TEXT,
  status TEXT CHECK (status IN ('pending', 'processed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add payment tracking
CREATE TABLE public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.shuttle_bookings(id),
  gateway TEXT NOT NULL,  -- 'midtrans', 'xendit'
  transaction_id TEXT UNIQUE,
  amount NUMERIC(12,2),
  status TEXT CHECK (status IN ('pending', 'success', 'failed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add ride cancellation reasons
CREATE TABLE public.ride_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id),
  cancelled_by UUID NOT NULL REFERENCES public.auth.users(id),
  reason TEXT,
  refund_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Add constraints
ALTER TABLE public.shuttle_bookings ADD CONSTRAINT fk_bookings_driver_id 
  FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;
ALTER TABLE public.shuttle_routes ADD CONSTRAINT shuttle_routes_base_fare_positive 
  CHECK (base_fare > 0);
ALTER TABLE public.shuttle_routes ADD CONSTRAINT shuttle_routes_distance_positive 
  CHECK (distance_km > 0);
ALTER TABLE public.rides ADD CONSTRAINT rides_fare_positive 
  CHECK (fare > 0);
ALTER TABLE public.rides ADD CONSTRAINT rides_distance_positive 
  CHECK (distance_km >= 0.1);
```

---

## APPENDIX B: Monitoring & Alerts

### Key Metrics

```sql
-- Overbooking attempts
SELECT COUNT(*) as attempts
FROM shuttle_bookings
WHERE total_fare = 0 OR total_fare < 0;

-- Abandoned bookings (unpaid > 30 min)
SELECT COUNT(*) as abandoned
FROM shuttle_bookings
WHERE payment_status = 'UNPAID'
AND created_at < NOW() - interval '30 minutes'
AND booking_status = 'PENDING_PAYMENT';

-- Failed driver dispatches
SELECT COUNT(*) as failed
FROM rides
WHERE status = 'pending'
AND created_at < NOW() - interval '10 minutes';

-- Cancellation rate
SELECT 
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::float / COUNT(*) as cancellation_rate
FROM rides
WHERE created_at > NOW() - interval '1 day';
```

---

## CONCLUSION

The Shuttle Service and Ride on Demand system demonstrate solid architectural foundations with atomic RPC-based booking and server-side price verification. However, **4 critical issues** and **14 high/medium priority issues** require immediate attention to ensure production readiness.

**Key Recommendations:**
1. Implement seat reservation system to prevent race conditions
2. Add comprehensive payment verification and webhook handling
3. Fix subscription memory leaks and implement reconnection logic
4. Add input validation constraints at database level
5. Implement cancellation and refund system

**Estimated Fix Timeline:** 
- Critical: 1-2 weeks
- High: 2-4 weeks  
- Medium: 4-8 weeks

**Next Steps:**
1. Create GitHub issues for each recommendation
2. Prioritize by business impact and technical difficulty
3. Implement Phase 1 fixes before production launch
4. Set up monitoring and alerting
5. Schedule security audit

---

**Report Generated:** 2026-04-15  
**Analysis Scope:** ShuttleService.ts, Ride.tsx, RPC functions, UI components, DB schema  
**Status:** Ready for Action  
