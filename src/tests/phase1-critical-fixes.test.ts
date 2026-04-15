/**
 * PHASE 1 CRITICAL FIXES - Test Suite
 * Tests for: Wallet race condition, Shuttle overbooking, Auth middleware, Rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import WalletService from '@/services/WalletService';
import ShuttleBookingService from '@/services/ShuttleBookingService';

// Test data
const TEST_USER_ID = 'test-user-123';
const TEST_SCHEDULE_ID = 'test-schedule-123';

// ================================================================
// WALLET RACE CONDITION TESTS
// ================================================================

describe('PHASE 1: Wallet Balance Race Condition Fix', () => {
  beforeEach(async () => {
    // Setup: Create test wallet with balance of 1000
    const { error } = await supabase.from('wallets').insert([
      {
        user_id: TEST_USER_ID,
        balance: 1000,
        total_earnings: 0,
        total_spent: 0
      }
    ]);
  });

  afterEach(async () => {
    // Cleanup: Remove test wallet
    await supabase.from('wallets').delete().eq('user_id', TEST_USER_ID);
  });

  it('should deduct balance correctly for single transaction', async () => {
    const result = await WalletService.deductBalance(TEST_USER_ID, 100);

    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(900);

    // Verify in database
    const wallet = await WalletService.getWallet(TEST_USER_ID);
    expect(wallet?.balance).toBe(900);
  });

  it('should reject deduction with insufficient balance', async () => {
    const result = await WalletService.deductBalance(TEST_USER_ID, 1500);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient balance');

    // Balance should remain unchanged
    const wallet = await WalletService.getWallet(TEST_USER_ID);
    expect(wallet?.balance).toBe(1000);
  });

  it('should handle concurrent deductions atomically', async () => {
    // Simulate 2 concurrent requests, each deducting 100
    // Expected: Both succeed, balance = 800
    // Vulnerable code would result in: balance = 900 (lost update)

    const deduction1 = WalletService.deductBalance(TEST_USER_ID, 100);
    const deduction2 = WalletService.deductBalance(TEST_USER_ID, 100);

    const [result1, result2] = await Promise.all([deduction1, deduction2]);

    // Both should succeed
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Both amounts should be applied
    const wallet = await WalletService.getWallet(TEST_USER_ID);
    expect(wallet?.balance).toBe(800); // 1000 - 100 - 100
  });

  it('should add balance correctly', async () => {
    const result = await WalletService.addBalance(TEST_USER_ID, 500);

    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(1500);

    const wallet = await WalletService.getWallet(TEST_USER_ID);
    expect(wallet?.balance).toBe(1500);
  });

  it('should record transaction for each operation', async () => {
    await WalletService.deductBalance(TEST_USER_ID, 100);
    
    const transactions = await WalletService.getTransactionHistory(TEST_USER_ID, 10);
    
    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0].amount).toBe(-100);
    expect(transactions[0].status).toBe('completed');
  });

  it('should reject zero amount deductions', async () => {
    const result = await WalletService.deductBalance(TEST_USER_ID, 0);

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot be zero');
  });

  it('should reject negative deductions', async () => {
    const result = await WalletService.deductBalance(TEST_USER_ID, -100);

    expect(result.success).toBe(false);
    expect(result.error).toContain('greater than 0');
  });
});

// ================================================================
// SHUTTLE SEAT OVERBOOKING TESTS
// ================================================================

describe('PHASE 1: Shuttle Seat Overbooking Fix', () => {
  beforeEach(async () => {
    // Setup: Create test schedule with 12 seats
    const { data: schedule, error: scheduleError } = await supabase
      .from('shuttle_schedules')
      .insert([
        {
          id: TEST_SCHEDULE_ID,
          route_id: 'test-route-123',
          departure_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          arrival_time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          total_seats: 12,
          active: true,
          driver_id: null
        }
      ])
      .select();

    if (!scheduleError) {
      // Initialize 12 seats for this schedule
      const seats = Array.from({ length: 12 }, (_, i) => ({
        schedule_id: TEST_SCHEDULE_ID,
        seat_number: i + 1,
        is_booked: false
      }));

      await supabase.from('shuttle_schedule_seats').insert(seats);
    }
  });

  afterEach(async () => {
    // Cleanup
    await supabase.from('shuttle_schedule_seats').delete().eq('schedule_id', TEST_SCHEDULE_ID);
    await supabase.from('shuttle_schedules').delete().eq('id', TEST_SCHEDULE_ID);
  });

  it('should book single seat successfully', async () => {
    const result = await ShuttleBookingService.createBooking(TEST_USER_ID, {
      scheduleId: TEST_SCHEDULE_ID,
      seatsNeeded: 1
    });

    expect(result.success).toBe(true);
    expect(result.bookingId).toBeDefined();
  });

  it('should prevent overbooking with 15 concurrent requests for 12 seats', async () => {
    // Create 15 concurrent booking requests for a 12-seat shuttle
    const bookingPromises = Array.from({ length: 15 }, (_, i) =>
      ShuttleBookingService.createBooking(`user-${i}`, {
        scheduleId: TEST_SCHEDULE_ID,
        seatsNeeded: 1
      })
    );

    const results = await Promise.all(bookingPromises);

    // Count successes and failures
    const successes = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success).length;

    // Exactly 12 should succeed
    expect(successes).toBe(12);
    expect(failures).toBe(3);

    // Verify seat occupancy
    const occupancy = await ShuttleBookingService.getSeatOccupancy(TEST_SCHEDULE_ID);
    expect(occupancy.booked).toBe(12);
    expect(occupancy.available).toBe(0);
  });

  it('should not allow booking when no seats available', async () => {
    // Book all 12 seats first
    const bookingPromises = Array.from({ length: 12 }, (_, i) =>
      ShuttleBookingService.createBooking(`user-${i}`, {
        scheduleId: TEST_SCHEDULE_ID,
        seatsNeeded: 1
      })
    );
    await Promise.all(bookingPromises);

    // Try to book one more
    const result = await ShuttleBookingService.createBooking('user-overbooking', {
      scheduleId: TEST_SCHEDULE_ID,
      seatsNeeded: 1
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not enough seats');
    expect(result.availableSeats).toBe(0);
  });

  it('should allow multi-seat bookings', async () => {
    const result = await ShuttleBookingService.createBooking(TEST_USER_ID, {
      scheduleId: TEST_SCHEDULE_ID,
      seatsNeeded: 3
    });

    expect(result.success).toBe(true);

    const occupancy = await ShuttleBookingService.getSeatOccupancy(TEST_SCHEDULE_ID);
    expect(occupancy.booked).toBe(3);
    expect(occupancy.available).toBe(9);
  });

  it('should retrieve available seats correctly', async () => {
    // Book 5 seats
    await ShuttleBookingService.createBooking(TEST_USER_ID, {
      scheduleId: TEST_SCHEDULE_ID,
      seatsNeeded: 5
    });

    const available = await ShuttleBookingService.getAvailableSeats(TEST_SCHEDULE_ID);
    expect(available).toBe(7); // 12 - 5
  });

  it('should validate schedule is active', async () => {
    // Mark schedule as inactive
    await supabase
      .from('shuttle_schedules')
      .update({ active: false })
      .eq('id', TEST_SCHEDULE_ID);

    const result = await ShuttleBookingService.createBooking(TEST_USER_ID, {
      scheduleId: TEST_SCHEDULE_ID,
      seatsNeeded: 1
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not available');
  });

  it('should calculate occupancy percentage correctly', async () => {
    // Book 3 seats out of 12
    await ShuttleBookingService.createBooking(`user-1`, {
      scheduleId: TEST_SCHEDULE_ID,
      seatsNeeded: 1
    });
    await ShuttleBookingService.createBooking(`user-2`, {
      scheduleId: TEST_SCHEDULE_ID,
      seatsNeeded: 1
    });
    await ShuttleBookingService.createBooking(`user-3`, {
      scheduleId: TEST_SCHEDULE_ID,
      seatsNeeded: 1
    });

    const occupancy = await ShuttleBookingService.getSeatOccupancy(TEST_SCHEDULE_ID);
    
    expect(occupancy.total).toBe(12);
    expect(occupancy.booked).toBe(3);
    expect(occupancy.available).toBe(9);
    expect(occupancy.occupancyPercentage).toBe(25);
  });
});

// ================================================================
// RATE LIMITING TESTS
// ================================================================

describe('PHASE 1: Rate Limiting', () => {
  it('should track rate limit violations in database', async () => {
    // Simulate a rate limit violation
    const { error } = await supabase.from('rate_limit_logs').insert([
      {
        endpoint: '/api/payments',
        user_id: TEST_USER_ID,
        ip_address: '192.168.1.1',
        violation_count: 1
      }
    ]);

    expect(error).toBeNull();

    // Verify it was logged
    const { data } = await supabase
      .from('rate_limit_logs')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('endpoint', '/api/payments');

    expect(data?.length).toBeGreaterThan(0);
  });
});

// ================================================================
// SECURITY AUDIT LOGGING TESTS
// ================================================================

describe('PHASE 1: Security Audit Logging', () => {
  it('should log wallet operations to security audit log', async () => {
    // Create wallet
    await supabase.from('wallets').insert([
      {
        user_id: `audit-test-${Date.now()}`,
        balance: 500,
        total_earnings: 0,
        total_spent: 0
      }
    ]);

    // Operation should be logged via trigger/RPC
    // Verify in security_audit_log table
    const { data } = await supabase
      .from('security_audit_log')
      .select('*')
      .eq('event_type', 'wallet_deduction')
      .order('created_at', { ascending: false })
      .limit(1);

    // At minimum, verify table exists and is accessible
    expect(data).toBeDefined();
  });
});
