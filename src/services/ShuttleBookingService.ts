/**
 * Shuttle Service - Updated for PHASE 1
 * CRITICAL FIX #5: Uses atomic RPC function to prevent seat overbooking
 * 
 * Purpose: Handle shuttle booking operations atomically
 * Security: Prevents seat overbooking through database-level locking
 */

import { supabase } from '@/integrations/supabase/client';
import { log_security_event } from '@/middleware/auditLogger';

export interface ShuttleBookingRequest {
  scheduleId: string;
  seatsNeeded: number;
  passengerInfo?: Array<{
    name: string;
    phone: string;
  }>;
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER';
}

export interface ShuttleBookingResponse {
  success: boolean;
  bookingId?: string;
  error?: string;
  availableSeats?: number;
  message?: string;
}

/**
 * Shuttle Service - Safe booking with atomic operations
 * All seat bookings go through create_shuttle_booking_safe() RPC
 * This ensures no race conditions, even with 100+ concurrent requests
 */
export class ShuttleBookingService {
  /**
   * Check available seats for a schedule
   */
  static async getAvailableSeats(scheduleId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('shuttle_schedule_seats')
        .select('*', { count: 'exact', head: true })
        .eq('schedule_id', scheduleId)
        .eq('is_booked', false);

      if (error) {
        console.error('Error getting available seats:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (err) {
      console.error('Available seats check failed:', err);
      return 0;
    }
  }

  /**
   * Validate schedule exists and is active
   */
  static async validateSchedule(scheduleId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('shuttle_schedules')
        .select('id, active, departure_time')
        .eq('id', scheduleId)
        .single();

      if (error || !data) {
        return false;
      }

      // Check if schedule is still in future
      if (new Date(data.departure_time) <= new Date()) {
        return false;
      }

      return data.active === true;
    } catch (err) {
      console.error('Schedule validation failed:', err);
      return false;
    }
  }

  /**
   * Create booking using atomic RPC function
   * CRITICAL: Never allow direct INSERT to shuttle_bookings without this RPC
   */
  static async createBooking(
    userId: string,
    request: ShuttleBookingRequest
  ): Promise<ShuttleBookingResponse> {
    try {
      // Validate inputs
      if (!userId) {
        return { success: false, error: 'User ID required' };
      }

      if (!request.scheduleId) {
        return { success: false, error: 'Schedule ID required' };
      }

      if (request.seatsNeeded < 1) {
        return { success: false, error: 'At least 1 seat required' };
      }

      // Validate schedule exists
      const scheduleValid = await this.validateSchedule(request.scheduleId);
      if (!scheduleValid) {
        return { success: false, error: 'Schedule not available' };
      }

      // Log the booking attempt
      await log_security_event(
        'shuttle_booking',
        'shuttle',
        'create_booking',
        'processing',
        {
          user_id: userId,
          schedule_id: request.scheduleId,
          seats_needed: request.seatsNeeded
        }
      );

      // Call atomic RPC function for booking
      const { data, error } = await supabase.rpc('create_shuttle_booking_safe', {
        p_user_id: userId,
        p_schedule_id: request.scheduleId,
        p_seats_needed: request.seatsNeeded,
        p_trip_type: 'oneWay'
      });

      if (error) {
        await log_security_event(
          'shuttle_booking',
          'shuttle',
          'create_booking',
          'failed',
          {
            user_id: userId,
            schedule_id: request.scheduleId,
            error: error.message
          }
        );
        return {
          success: false,
          error: error.message || 'Booking failed'
        };
      }

      if (data.error) {
        // Get available seats for error response
        const availableSeats = await this.getAvailableSeats(request.scheduleId);

        await log_security_event(
          'shuttle_booking',
          'shuttle',
          'create_booking',
          'insufficient_seats',
          {
            user_id: userId,
            schedule_id: request.scheduleId,
            requested: request.seatsNeeded,
            available: availableSeats
          }
        );

        return {
          success: false,
          error: data.error,
          availableSeats
        };
      }

      // Log successful booking
      await log_security_event(
        'shuttle_booking',
        'shuttle',
        'create_booking',
        'success',
        {
          user_id: userId,
          schedule_id: request.scheduleId,
          booking_id: data.booking_id,
          seats_booked: data.seats_booked
        }
      );

      return {
        success: true,
        bookingId: data.booking_id,
        message: `Successfully booked ${data.seats_booked} seat(s)`
      };
    } catch (err: any) {
      await log_security_event(
        'shuttle_booking',
        'shuttle',
        'create_booking',
        'failed',
        {
          user_id: userId,
          error: err.message
        }
      );

      return {
        success: false,
        error: err.message || 'Booking creation failed'
      };
    }
  }

  /**
   * Get booking details
   */
  static async getBooking(bookingId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('shuttle_bookings')
        .select(
          `
          *,
          shuttle_schedules(
            id,
            departure_time,
            arrival_time,
            total_seats,
            shuttle_routes(name, origin, destination)
          )
        `
        )
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error fetching booking:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Booking fetch failed:', err);
      return null;
    }
  }

  /**
   * Get user's bookings
   */
  static async getUserBookings(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('shuttle_bookings')
        .select(
          `
          id,
          user_id,
          schedule_id,
          status,
          created_at,
          shuttle_schedules(departure_time, shuttle_routes(name))
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user bookings:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('User bookings fetch failed:', err);
      return [];
    }
  }

  /**
   * Cancel booking
   */
  static async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shuttle_bookings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) {
        console.error('Error cancelling booking:', error);
        return false;
      }

      // Mark seats as available
      await supabase
        .from('shuttle_schedule_seats')
        .update({ is_booked: false, booking_id: null, booked_at: null })
        .eq('booking_id', bookingId);

      return true;
    } catch (err) {
      console.error('Booking cancellation failed:', err);
      return false;
    }
  }

  /**
   * Get seat occupancy for a schedule
   */
  static async getSeatOccupancy(scheduleId: string): Promise<{
    total: number;
    booked: number;
    available: number;
    occupancyPercentage: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('shuttle_schedule_seats')
        .select('is_booked', { count: 'exact' })
        .eq('schedule_id', scheduleId);

      if (error) {
        console.error('Error getting seat occupancy:', error);
        return { total: 0, booked: 0, available: 0, occupancyPercentage: 0 };
      }

      const seats = data || [];
      const total = seats.length;
      const booked = seats.filter((s: any) => s.is_booked).length;
      const available = total - booked;
      const occupancyPercentage = total > 0 ? (booked / total) * 100 : 0;

      return {
        total,
        booked,
        available,
        occupancyPercentage: Math.round(occupancyPercentage * 10) / 10
      };
    } catch (err) {
      console.error('Seat occupancy fetch failed:', err);
      return { total: 0, booked: 0, available: 0, occupancyPercentage: 0 };
    }
  }
}

export default ShuttleBookingService;
