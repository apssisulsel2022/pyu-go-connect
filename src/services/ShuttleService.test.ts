import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShuttleService from './ShuttleService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        rpc: vi.fn(),
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                        single: vi.fn(),
                        data: [],
                        error: null
                    })),
                    single: vi.fn(),
                    gte: vi.fn(() => ({
                        lte: vi.fn()
                    }))
                })),
                single: vi.fn(),
                order: vi.fn()
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    error: null
                }))
            })),
            insert: vi.fn(() => ({
                error: null
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => ({
                    error: null
                }))
            }))
        }))
    }
}));

describe('ShuttleService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('calculatePrice', () => {
        it('should calculate price correctly based on route and pricing rules', async () => {
            // Mock route data
            const mockRouteData = { base_fare: 100000, distance_km: 50 };
            const mockPricingData = [{
                base_fare_multiplier: 1.2,
                rayon_base_surcharge: 5000,
                distance_cost_per_km: 2000,
                peak_hours_multiplier: 1.0
            }];

            // Mock implementation
            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'shuttle_routes') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: mockRouteData, error: null })
                    };
                }
                if (table === 'shuttle_rayons') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { id: 'rayon-1' }, error: null })
                    };
                }
                return {};
            });

            (supabase.rpc as any).mockResolvedValue({ data: mockPricingData, error: null });

            const result = await ShuttleService.calculatePrice('route-1', 'service-1', 'rayon-1', 1);

            expect(result).not.toBeNull();
            if (result) {
                // Calculation:
                // base = 100000
                // premium = 100000 * (1.2 - 1) = 20000
                // rayon = 5000 * 1 = 5000
                // distance = 50 * 2000 = 100000
                // total = (100000 + 20000 + 5000 + 100000) * 1.0 = 225000
                expect(result.totalAmount).toBe(225000);
                expect(result.baseAmount).toBe(100000);
                expect(result.servicePremium).toBeCloseTo(20000);
                expect(result.rayonSurcharge).toBe(5000);
                expect(result.distanceAmount).toBe(100000);
            }
        });

        it('should return null if route is not found', async () => {
            (supabase.from as any).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
            }));

            const result = await ShuttleService.calculatePrice('invalid-route', 'service-1', 'rayon-1');
            expect(result).toBeNull();
        });
    });

    describe('getAvailableServices', () => {
        it('should return mapped service options from RPC', async () => {
            const mockServices = [
                {
                    service_id: 's1',
                    service_name: 'Reguler',
                    vehicle_type: 'SUV',
                    vehicle_name: 'Avanza',
                    capacity: 7,
                    total_seats: 7,
                    available_seats: 5,
                    display_price: '150000',
                    is_featured: true,
                    facilities: ['AC', 'Music']
                }
            ];

            (supabase.rpc as any).mockResolvedValue({ data: mockServices, error: null });

            const result = await ShuttleService.getAvailableServices('schedule-1');

            expect(result).toHaveLength(1);
            expect(result[0].serviceName).toBe('Reguler');
            expect(result[0].displayPrice).toBe(150000);
            expect(result[0].facilities).toContain('AC');
        });

        it('should return empty array on error', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'Error' } });
            const result = await ShuttleService.getAvailableServices('schedule-1');
            expect(result).toEqual([]);
        });
    });

    describe('getAdminBookings', () => {
        it('should return bookings with filters', async () => {
            const mockBookings = [{ id: 'b1', total_fare: 150000 }];
            (supabase.from as any).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockBookings, error: null })
            }));

            const result = await ShuttleService.getAdminBookings({ status: 'confirmed' });
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('b1');
        });

        it('should return empty array on error', async () => {
            (supabase.from as any).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
            }));
            const result = await ShuttleService.getAdminBookings();
            expect(result).toEqual([]);
        });
    });

    describe('upsertRoute', () => {
        it('should call upsert and return data', async () => {
            const mockRoute = { id: 'r1', name: 'Route 1' };
            (supabase.from as any).mockImplementation(() => ({
                upsert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockRoute, error: null })
            }));

            const result = await ShuttleService.upsertRoute(mockRoute);
            expect(result.id).toBe('r1');
        });
    });

    describe('deleteRoute', () => {
        it('should call delete and return true', async () => {
            (supabase.from as any).mockImplementation(() => ({
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null })
            }));

            const result = await ShuttleService.deleteRoute('r1');
            expect(result).toBe(true);
        });
    });

    describe('createBooking', () => {
        it('should call atomic RPC and return confirmation', async () => {
            const mockBookingId = 'new-booking-id';
            const mockBookingData = {
                id: mockBookingId,
                booking_ref: 'PYU-12345',
                total_fare: 225000,
                base_amount: 100000,
                service_premium: 20000,
                rayon_surcharge: 5000,
                distance_amount: 100000,
                payment_status: 'pending',
                booking_status: 'confirmed'
            };

            (supabase.rpc as any).mockResolvedValue({ data: mockBookingId, error: null });
            (supabase.from as any).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockBookingData, error: null })
            }));

            const bookingRequest = {
                scheduleId: 'sched-1',
                serviceTypeId: 'serv-1',
                vehicleType: 'SUV',
                rayonId: 'rayon-1',
                pickupPointId: 'point-1',
                seatNumbers: [1],
                passengerInfo: [{ seatNumber: 1, name: 'John Doe', phone: '0812' }],
                paymentMethod: 'CASH' as const,
                expectedTotalPrice: 225000
            };

            const result = await ShuttleService.createBooking('user-1', bookingRequest);

            expect(supabase.rpc).toHaveBeenCalledWith('create_shuttle_booking_atomic_v2', expect.any(Object));
            expect(result).not.toBeNull();
            expect(result?.bookingId).toBe(mockBookingId);
            expect(result?.referenceNumber).toBe('PYU-12345');
        });

        it('should throw error if RPC fails', async () => {
            (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'Seats taken' } });

            const bookingRequest = {
                scheduleId: 'sched-1',
                serviceTypeId: 'serv-1',
                vehicleType: 'SUV',
                rayonId: 'rayon-1',
                pickupPointId: 'point-1',
                seatNumbers: [1],
                passengerInfo: [{ seatNumber: 1, name: 'John Doe', phone: '0812' }],
                paymentMethod: 'CASH' as const,
                expectedTotalPrice: 225000
            };

            await expect(ShuttleService.createBooking('user-1', bookingRequest))
                .rejects.toThrow('Seats taken');
        });
    });
});
