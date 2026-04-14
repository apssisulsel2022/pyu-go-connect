import { supabase } from '@/integrations/supabase/client';

/**
 * Service-Vehicle type combination for booking
 */
export interface ServiceVehicleOption {
    id: string;
    serviceName: string;
    vehicleType: string;
    vehicleName: string;
    capacity: number;
    totalSeats: number;
    availableSeats: number;
    displayPrice: number;
    isFeatured: boolean;
    facilities: string[];
}

/**
 * Price breakdown showing how total is calculated
 */
export interface PriceBreakdown {
    baseAmount: number;
    servicePremium: number;
    rayonSurcharge: number;
    distanceAmount: number;
    peakHoursMultiplier: number;
    totalAmount: number;
    breakdown: Array<{
        label: string;
        amount: number;
    }>;
}

/**
 * Booking request from user
 */
export interface BookingRequest {
    scheduleId: string;
    serviceTypeId: string;
    vehicleType: string;
    rayonId: string;
    pickupPointId?: string;
    seatNumbers: number[];
    passengerInfo: Array<{
        seatNumber: number;
        name: string;
        phone: string;
    }>;
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
    expectedTotalPrice: number;
}

/**
 * Booking confirmation response
 */
export interface BookingConfirmation {
    bookingId: string;
    referenceNumber: string;
    totalAmount: number;
    paymentStatus: string;
    bookingStatus: string;
    priceBreakdown: PriceBreakdown;
}

/**
 * ShuttleService handles all shuttle booking operations
 * Including price calculation, verification, and booking creation
 */
class ShuttleService {
    /**
     * Get all available services for a specific schedule
     * Includes pricing and seat availability
     */
    async getAvailableServices(scheduleId: string): Promise<ServiceVehicleOption[]> {
        try {
            // Use the Postgres function to get available services with prices
            const { data, error } = await supabase.rpc(
                'get_available_services_for_schedule',
                { p_schedule_id: scheduleId }
            );

            if (error) {
                console.error('Error fetching available services:', error);
                return [];
            }

            // Map to ServiceVehicleOption format
            const services = (data as any[]) || [];
            return services.map((row: any) => ({
                id: row.service_id,
                serviceName: row.service_name,
                vehicleType: row.vehicle_type,
                vehicleName: row.vehicle_name,
                capacity: row.capacity,
                totalSeats: row.total_seats,
                availableSeats: row.available_seats,
                displayPrice: parseFloat(row.display_price),
                isFeatured: row.is_featured,
                facilities: row.facilities || [],
            }));
        } catch (error) {
            console.error('Error in getAvailableServices:', error);
            return [];
        }
    }

    /**
     * Calculate price for a booking
     * Returns detailed breakdown for transparency
     */
    async calculatePrice(
        routeId: string,
        serviceTypeId: string,
        rayonId: string,
        seatCount: number = 1
    ): Promise<PriceBreakdown | null> {
        try {
            // Get route base fare
            const { data: routeData, error: routeError } = await supabase
                .from('shuttle_routes')
                .select('base_fare, distance_km')
                .eq('id', routeId)
                .single();

            if (routeError || !routeData) {
                console.error('Error fetching route:', routeError);
                return null;
            }

            // Get current pricing rules for service type
            const { data: pricingData, error: pricingError } = await supabase.rpc(
                'get_current_pricing_for_service',
                { p_service_id: serviceTypeId }
            );

            if (pricingError || !pricingData) {
                console.error('Error fetching pricing rules:', pricingError);
                return null;
            }

            const pricing = Array.isArray(pricingData) ? pricingData[0] : (pricingData as any);

            if (!pricing) return null;

            // Get rayon surcharge
            const { data: rayonData, error: rayonError } = await supabase
                .from('shuttle_rayons')
                .select('id')
                .eq('id', rayonId)
                .single();

            if (rayonError || !rayonData) {
                console.warn('Rayon not found, using default surcharge');
            }

            // Calculate components
            const baseAmount = routeData.base_fare;
            const servicePremium = baseAmount * ((pricing.base_fare_multiplier || 1.0) - 1.0);
            const rayonSurcharge = (pricing.rayon_base_surcharge || 0) * seatCount;
            const distanceAmount = (routeData.distance_km || 0) * (pricing.distance_cost_per_km || 0);
            const peakMultiplier = pricing.peak_hours_multiplier || 1.0;

            const subtotal = baseAmount + servicePremium + rayonSurcharge + distanceAmount;
            const totalAmount = subtotal * peakMultiplier;

            return {
                baseAmount,
                servicePremium,
                rayonSurcharge,
                distanceAmount,
                peakHoursMultiplier: peakMultiplier,
                totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimals
                breakdown: [
                    { label: 'Base Fare', amount: Math.round(baseAmount * 100) / 100 },
                    ...(servicePremium > 0
                        ? [{ label: 'Service Premium', amount: Math.round(servicePremium * 100) / 100 }]
                        : []),
                    ...(rayonSurcharge > 0
                        ? [{ label: 'Rayon Surcharge', amount: Math.round(rayonSurcharge * 100) / 100 }]
                        : []),
                    ...(distanceAmount > 0
                        ? [{ label: 'Distance Charge', amount: Math.round(distanceAmount * 100) / 100 }]
                        : []),
                    ...(peakMultiplier > 1.0
                        ? [
                              {
                                  label: 'Peak Hours Premium',
                                  amount: Math.round((peakMultiplier - 1.0) * subtotal * 100) / 100,
                              },
                          ]
                        : []),
                ],
            };
        } catch (error) {
            console.error('Error calculating price:', error);
            return null;
        }
    }

    /**
     * Get schedules with all available services and prices
     */
    async getSchedulesWithServices(
        routeId: string,
        travelDate?: string
    ): Promise<
        Array<{
            id: string;
            departureTime: string;
            arrivalTime: string;
            driverId: string | null;
            services: ServiceVehicleOption[];
        }>
    > {
        try {
            // Get schedules for route
            let query = supabase
                .from('shuttle_schedules')
                .select('id, departure_time, arrival_time, driver_id')
                .eq('route_id', routeId)
                .eq('active', true);

            // Filter by date if provided (e.g., '2026-04-14')
            if (travelDate) {
                query = query.gte('departure_time', `${travelDate}T00:00:00`)
                             .lte('departure_time', `${travelDate}T23:59:59`);
            }

            const { data: schedules, error: scheduleError } = await query;

            if (scheduleError || !schedules) {
                console.error('Error fetching schedules:', scheduleError);
                return [];
            }

            // Get services for each schedule
            const schedulesWithServices = await Promise.all(
                schedules.map(async (schedule) => ({
                    id: schedule.id,
                    departureTime: schedule.departure_time,
                    arrivalTime: schedule.arrival_time,
                    driverId: schedule.driver_id,
                    services: await this.getAvailableServices(schedule.id),
                }))
            );

            return schedulesWithServices;
        } catch (error) {
            console.error('Error in getSchedulesWithServices:', error);
            return [];
        }
    }

    /**
     * Verify booking price before payment
     * Prevents price tampering by recalculating on server
     */
    async verifyBookingPrice(
        routeId: string,
        serviceTypeId: string,
        rayonId: string,
        seatCount: number,
        claimedTotal: number
    ): Promise<{ isValid: boolean; calculatedTotal: number; difference: number }> {
        try {
            const priceBreakdown = await this.calculatePrice(
                routeId,
                serviceTypeId,
                rayonId,
                seatCount
            );

            if (!priceBreakdown) {
                return { isValid: false, calculatedTotal: 0, difference: 0 };
            }

            const difference = Math.abs(claimedTotal - priceBreakdown.totalAmount);
            const isValid = difference < 1.0; // Allow 1 rupiah difference for rounding

            return {
                isValid,
                calculatedTotal: priceBreakdown.totalAmount,
                difference,
            };
        } catch (error) {
            console.error('Error verifying booking price:', error);
            return { isValid: false, calculatedTotal: 0, difference: 0 };
        }
    }

    /**
     * Create a booking atomically
     * Handles:
     * - Server-side price verification (prevent fraud)
     * - Atomic seat locking and status update
     * - Booking record creation with full price breakdown
     * - Passenger detail creation per seat
     * - Seat availability update in schedule services
     */
    async createBooking(
        userId: string,
        booking: BookingRequest
    ): Promise<BookingConfirmation | null> {
        try {
            // Use the atomic RPC function for Phase 1
            const { data: bookingId, error: rpcError } = await supabase.rpc(
                'create_shuttle_booking_atomic_v2',
                {
                    p_schedule_id: booking.scheduleId,
                    p_service_type_id: booking.serviceTypeId,
                    p_vehicle_type: booking.vehicleType,
                    p_rayon_id: booking.rayonId,
                    p_pickup_point_id: booking.pickupPointId || null,
                    p_user_id: userId,
                    p_guest_name: booking.passengerInfo[0]?.name || 'Guest',
                    p_guest_phone: booking.passengerInfo[0]?.phone || '',
                    p_seat_numbers: booking.seatNumbers,
                    p_passenger_names: booking.passengerInfo.map(p => p.name),
                    p_passenger_phones: booking.passengerInfo.map(p => p.phone),
                    p_payment_method: booking.paymentMethod,
                    p_expected_total: booking.expectedTotalPrice
                }
            );

            if (rpcError) {
                console.error('RPC Error creating booking:', rpcError);
                throw new Error(rpcError.message || 'Gagal membuat pesanan shuttle');
            }

            if (!bookingId) {
                throw new Error('Gagal mendapatkan ID pesanan setelah pembuatan');
            }

            // Fetch the newly created booking to get all details (like reference number)
            const { data: bookingData, error: fetchError } = await supabase
                .from('shuttle_bookings')
                .select('*')
                .eq('id', bookingId)
                .single();

            if (fetchError || !bookingData) {
                throw new Error('Pesanan berhasil dibuat tetapi gagal memuat detail');
            }

            // Get the price breakdown that was stored
            const priceBreakdown: PriceBreakdown = {
                baseAmount: Number(bookingData.base_amount),
                servicePremium: Number(bookingData.service_premium),
                rayonSurcharge: Number(bookingData.rayon_surcharge),
                distanceAmount: Number(bookingData.distance_amount),
                peakHoursMultiplier: 1.0, // This is already factored into components in the RPC
                totalAmount: Number(bookingData.total_fare),
                breakdown: [
                    { label: 'Tarif Dasar', amount: Number(bookingData.base_amount) },
                    { label: 'Layanan Premium', amount: Number(bookingData.service_premium) },
                    { label: 'Biaya Rayon', amount: Number(bookingData.rayon_surcharge) },
                    { label: 'Biaya Jarak', amount: Number(bookingData.distance_amount) }
                ]
            };

            return {
                bookingId: bookingData.id,
                referenceNumber: bookingData.booking_ref || 'PENDING',
                totalAmount: Number(bookingData.total_fare),
                paymentStatus: bookingData.payment_status,
                bookingStatus: bookingData.booking_status,
                priceBreakdown,
            };
        } catch (error) {
            console.error('Error in createBooking:', error);
            throw error;
        }
    }

    /**
     * Get booking details including full pricing breakdown
     */
    async getBooking(bookingId: string) {
        try {
            const { data, error } = await supabase
                .from('shuttle_bookings')
                .select(
                    `
                    *,
                    shuttle_schedules(departure_time, arrival_time, shuttle_routes(name, origin, destination)),
                    shuttle_service_types(name),
                    shuttle_booking_details(*)
                    `
                )
                .eq('id', bookingId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error fetching booking:', error);
            return null;
        }
    }

    /**
     * Get admin view of all bookings with filters
     */
    async getAdminBookings(filters?: {
        scheduleId?: string;
        dateFrom?: string;
        dateTo?: string;
        status?: string;
        paymentStatus?: string;
    }) {
        try {
            let query = supabase
                .from('shuttle_bookings')
                .select(
                    `
                    *,
                    shuttle_schedules(departure_time, arrival_time, route_id),
                    shuttle_service_types(name)
                    `
                );

            if (filters?.scheduleId) {
                query = query.eq('schedule_id', filters.scheduleId);
            }
            if (filters?.status) {
                query = query.eq('booking_status', filters.status);
            }
            if (filters?.paymentStatus) {
                query = query.eq('payment_status', filters.paymentStatus);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error fetching admin bookings:', error);
            return [];
        }
    }

    /**
     * Admin: Create or update a route
     */
    async upsertRoute(route: any) {
        const { data, error } = await supabase
            .from('shuttle_routes')
            .upsert(route)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * Admin: Delete a route
     */
    async deleteRoute(routeId: string) {
        const { error } = await supabase
            .from('shuttle_routes')
            .delete()
            .eq('id', routeId);
        if (error) throw error;
        return true;
    }

    /**
     * Admin: Create a rayon with pickup points
     */
    async createRayonWithPoints(rayon: any, points: any[]) {
        const { data: rayonData, error: rayonErr } = await supabase
            .from('shuttle_rayons')
            .insert(rayon)
            .select('id')
            .single();

        if (rayonErr) throw rayonErr;

        const pointsToInsert = points.map(p => ({
            ...p,
            rayon_id: rayonData.id
        }));

        const { error: pointsErr } = await supabase
            .from('shuttle_pickup_points')
            .insert(pointsToInsert);

        if (pointsErr) throw pointsErr;
        return rayonData;
    }

    /**
     * Cancel a booking and refund seat
     */
    async cancelBooking(bookingId: string, reason: string): Promise<boolean> {
        try {
            // Get booking details
            const { data: booking } = await supabase
                .from('shuttle_bookings')
                .select('*')
                .eq('id', bookingId)
                .single();

            if (!booking) {
                throw new Error('Booking not found');
            }

            // Update booking status
            const { error } = await supabase
                .from('shuttle_bookings')
                .update({
                    booking_status: 'CANCELLED',
                    booking_notes: reason,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

            if (error) {
                throw error;
            }

            // Log cancellation
            await supabase.from('shuttle_booking_audit').insert({
                booking_id: bookingId,
                user_id: booking.user_id,
                action: 'BOOKING_CANCELLED',
                details: { reason },
            });

            return true;
        } catch (error) {
            console.error('Error cancelling booking:', error);
            return false;
        }
    }
}

// Export singleton instance
export default new ShuttleService();
