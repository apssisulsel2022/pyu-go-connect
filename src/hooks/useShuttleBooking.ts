import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ShuttleService, { ServiceVehicleOption, PriceBreakdown } from '@/services/ShuttleService';
import { useAuth } from '@/hooks/useAuth';

export type Step = 'routes' | 'pickup' | 'date' | 'service_cars' | 'seats' | 'passengers' | 'validation' | 'summary' | 'payment' | 'confirmation';

export const STEP_LIST: Step[] = ['routes', 'pickup', 'date', 'service_cars', 'seats', 'passengers', 'validation', 'summary', 'payment', 'confirmation'];

export interface BookingState {
  routeId: string | null;
  rayonId: string | null;
  pickupPointId: string | null;
  departureDate: string | null;
  serviceTypeId: string | null;
  vehicleType: string | null;
  scheduleId: string | null;
  selectedService: ServiceVehicleOption | null;
  selectedSeats: number[];
  passengers: Array<{ seatNumber: number; name: string; phone: string }>;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
}

export const useShuttleBooking = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('routes');
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const [booking, setBooking] = useState<BookingState>({
    routeId: null,
    rayonId: null,
    pickupPointId: null,
    departureDate: null,
    serviceTypeId: null,
    vehicleType: null,
    scheduleId: null,
    selectedService: null,
    selectedSeats: [],
    passengers: [],
    paymentMethod: 'CASH',
  });

  // Queries
  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ['shuttle-routes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shuttle_routes')
        .select('*, shuttle_schedules(id)')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: routeRayons, isLoading: rayonsLoading } = useQuery({
    queryKey: ['shuttle-rayons-for-route', booking.routeId],
    queryFn: async () => {
      if (!booking.routeId) return [];
      const { data: rayonData, error: rayonError } = await supabase
        .from('shuttle_rayons')
        .select('*')
        .eq('route_id', booking.routeId)
        .eq('active', true)
        .order('name');
      
      if (rayonError) throw rayonError;

      const rayonIds = (rayonData || []).map((r: any) => r.id);
      const { data: pointsData } = await supabase
        .from('shuttle_pickup_points')
        .select('*')
        .eq('active', true)
        .in('rayon_id', rayonIds)
        .order('stop_order');

      return (rayonData || []).map((r: any) => ({
        ...r,
        pickup_points: (pointsData || []).filter((p: any) => p.rayon_id === r.id),
      }));
    },
    enabled: !!booking.routeId,
  });

  const { data: availableDates, isLoading: datesLoading } = useQuery({
    queryKey: ['shuttle-available-dates', booking.routeId],
    queryFn: async () => {
      if (!booking.routeId) return [];
      const { data, error } = await supabase
        .from('shuttle_schedules')
        .select('departure_time')
        .eq('route_id', booking.routeId)
        .eq('active', true)
        .gte('departure_time', new Date().toISOString());
      
      if (error) throw error;
      
      const dates = Array.from(new Set((data || []).map((s: any) => s.departure_time.split('T')[0])));
      return dates.map(d => new Date(d));
    },
    enabled: !!booking.routeId,
  });

  const { data: availableServices, isLoading: servicesLoading } = useQuery({
    queryKey: ['shuttle-available-services', booking.routeId, booking.departureDate],
    queryFn: async () => {
      if (!booking.routeId || !booking.departureDate) return [];
      
      const { data: schedulesData } = await supabase
        .from('shuttle_schedules')
        .select('id')
        .eq('route_id', booking.routeId)
        .eq('active', true)
        .gte('departure_time', `${booking.departureDate}T00:00:00`)
        .lte('departure_time', `${booking.departureDate}T23:59:59`);

      if (!schedulesData?.length) return [];

      const { data, error } = await supabase
        .from('shuttle_schedule_services')
        .select('service_type_id, shuttle_service_types(id, name, baggage_info, description)')
        .eq('active', true)
        .in('schedule_id', schedulesData.map((s: any) => s.id));

      if (error) throw error;

      const uniqueServices = Array.from(new Set((data || []).map((s: any) => s.service_type_id)))
        .map(id => (data || []).find((s: any) => s.service_type_id === id)?.shuttle_service_types);

      return uniqueServices.filter(Boolean);
    },
    enabled: !!booking.routeId && !!booking.departureDate,
  });

  const { data: availableVehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['shuttle-available-vehicles', booking.routeId, booking.serviceTypeId, booking.departureDate],
    queryFn: async () => {
      if (!booking.routeId || !booking.serviceTypeId || !booking.departureDate) return [];
      
      const { data: joinedData, error: joinError } = await supabase
        .from('shuttle_schedule_services')
        .select('vehicle_type, shuttle_schedules!inner(route_id, departure_time)')
        .eq('shuttle_schedules.route_id', booking.routeId)
        .eq('service_type_id', booking.serviceTypeId)
        .eq('active', true)
        .gte('shuttle_schedules.departure_time', `${booking.departureDate}T00:00:00`)
        .lte('shuttle_schedules.departure_time', `${booking.departureDate}T23:59:59`);

      if (joinError) throw joinError;

      const uniqueVehicles = Array.from(new Set((joinedData || []).map((v: any) => v.vehicle_type))) as string[];
      return uniqueVehicles;
    },
    enabled: !!booking.routeId && !!booking.serviceTypeId && !!booking.departureDate,
  });

  const { data: filteredSchedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['shuttle-filtered-schedules', booking.routeId, booking.serviceTypeId, booking.vehicleType, booking.departureDate],
    queryFn: async () => {
      if (!booking.routeId || !booking.serviceTypeId || !booking.vehicleType || !booking.departureDate) return [];
      
      const { data, error } = await supabase
        .from('shuttle_schedule_services')
        .select('*, shuttle_schedules!inner(id, departure_time, arrival_time, route_id)')
        .eq('shuttle_schedules.route_id', booking.routeId)
        .eq('service_type_id', booking.serviceTypeId)
        .eq('vehicle_type', booking.vehicleType)
        .eq('active', true)
        .gte('shuttle_schedules.departure_time', `${booking.departureDate}T00:00:00`)
        .lte('shuttle_schedules.departure_time', `${booking.departureDate}T23:59:59`)
        .order('departure_time', { foreignTable: 'shuttle_schedules' });

      if (error) throw error;
      return data || [];
    },
    enabled: !!booking.routeId && !!booking.serviceTypeId && !!booking.vehicleType && !!booking.departureDate,
  });

  const { data: scheduleSeats, isLoading: seatsLoading } = useQuery({
    queryKey: ['shuttle-seats', booking.scheduleId],
    queryFn: async () => {
      if (!booking.scheduleId) return [];
      const { data, error } = await supabase
        .from('shuttle_seats')
        .select('*')
        .eq('schedule_id', booking.scheduleId)
        .order('seat_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!booking.scheduleId,
  });

  const { data: userBookings } = useQuery({
    queryKey: ['user-shuttle-bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('shuttle_bookings')
        .select('*, shuttle_schedules(*, shuttle_routes(name, origin, destination))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Derived data
  const selectedRoute = useMemo(() => routes?.find(r => r.id === booking.routeId), [routes, booking.routeId]);
  const selectedRayon = useMemo(() => routeRayons?.find(r => r.id === booking.rayonId), [routeRayons, booking.rayonId]);
  const selectedSchedule = useMemo(() => {
    const s = filteredSchedules?.find(fs => fs.shuttle_schedules.id === booking.scheduleId);
    return s ? s.shuttle_schedules : null;
  }, [filteredSchedules, booking.scheduleId]);

  // Handlers
  const handleSelectRoute = (routeId: string) => {
    setBooking(prev => ({
      ...prev,
      routeId,
      rayonId: null,
      pickupPointId: null,
      departureDate: null,
      serviceTypeId: null,
      vehicleType: null,
      scheduleId: null,
      selectedService: null,
      selectedSeats: [],
      passengers: [],
    }));
    setStep('pickup');
  };

  const handleSelectPickupPoint = (pointId: string, rayonId: string) => {
    setBooking(prev => ({ ...prev, pickupPointId: pointId, rayonId }));
    setStep('date');
  };

  const handleSelectDate = (date: string) => {
    setBooking(prev => ({ 
      ...prev, 
      departureDate: date,
      serviceTypeId: null,
      vehicleType: null,
      scheduleId: null,
      selectedService: null
    }));
    setStep('service_cars');
  };

  const handleSelectServiceType = (serviceTypeId: string) => {
    setBooking(prev => ({ ...prev, serviceTypeId, vehicleType: null, scheduleId: null }));
  };

  const handleSelectVehicleType = (vehicleType: string) => {
    setBooking(prev => ({ ...prev, vehicleType, scheduleId: null }));
  };

  const handleSelectSchedule = (scheduleService: any) => {
    setBooking(prev => ({ 
      ...prev, 
      scheduleId: scheduleService.shuttle_schedules.id,
      selectedService: {
        id: scheduleService.service_type_id,
        serviceName: '', 
        vehicleType: scheduleService.vehicle_type,
        vehicleName: '', 
        capacity: scheduleService.total_seats,
        totalSeats: scheduleService.total_seats,
        availableSeats: scheduleService.available_seats,
        displayPrice: scheduleService.price_override || 0,
        isFeatured: scheduleService.is_featured,
        facilities: [],
      }
    }));
    setStep('seats');
  };

  const toggleSeat = (seatNumber: number) => {
    setBooking(prev => {
      const isSelected = prev.selectedSeats.includes(seatNumber);
      const newSeats = isSelected 
        ? prev.selectedSeats.filter(s => s !== seatNumber)
        : [...prev.selectedSeats, seatNumber];
      
      return { ...prev, selectedSeats: newSeats };
    });
  };

  const updatePassenger = (seatNumber: number, name: string, phone: string) => {
    setBooking(prev => {
      const others = prev.passengers.filter(p => p.seatNumber !== seatNumber);
      return { ...prev, passengers: [...others, { seatNumber, name, phone }] };
    });
  };

  const setPaymentMethod = (method: 'CASH' | 'CARD' | 'TRANSFER') => {
    setBooking(prev => ({ ...prev, paymentMethod: method }));
  };

  const handleNextStep = () => {
    const currentIndex = STEP_LIST.indexOf(step);
    if (currentIndex < STEP_LIST.length - 1) {
      setStep(STEP_LIST[currentIndex + 1]);
    }
  };

  const handlePreviousStep = () => {
    const currentIndex = STEP_LIST.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_LIST[currentIndex - 1]);
    }
  };

  // Auto-calculate price
  useEffect(() => {
    const updatePrice = async () => {
      if (booking.routeId && booking.serviceTypeId && booking.rayonId && booking.selectedSeats.length > 0) {
        const result = await ShuttleService.calculatePrice(
          booking.routeId,
          booking.serviceTypeId,
          booking.rayonId,
          booking.selectedSeats.length
        );
        setPriceBreakdown(result);
      } else {
        setPriceBreakdown(null);
      }
    };
    updatePrice();
  }, [booking.routeId, booking.serviceTypeId, booking.rayonId, booking.selectedSeats.length]);

  return {
    step,
    setStep,
    booking,
    setBooking,
    priceBreakdown,
    isBooking,
    setIsBooking,
    // Queries data
    routes,
    routesLoading,
    routeRayons,
    rayonsLoading,
    availableDates,
    datesLoading,
    availableServices,
    servicesLoading,
    availableVehicles,
    vehiclesLoading,
    filteredSchedules,
    schedulesLoading,
    scheduleSeats,
    seatsLoading,
    userBookings,
    // Derived
    selectedRoute,
    selectedRayon,
    selectedSchedule,
    // Handlers
    handleSelectRoute,
    handleSelectPickupPoint,
    handleSelectDate,
    handleSelectServiceType,
    handleSelectVehicleType,
    handleSelectSchedule,
    toggleSeat,
    updatePassenger,
    setPaymentMethod,
    handleNextStep,
    handlePreviousStep,
  };
};
