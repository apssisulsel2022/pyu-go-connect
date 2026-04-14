import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck, 
  Clock, 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

import ShuttleService from '@/services/ShuttleService';
import { useShuttleBooking, Step, STEP_LIST } from '@/hooks/useShuttleBooking';

// Components
import { RouteSelector } from '@/components/shuttle/RouteSelector';
import { ScheduleSelector } from '@/components/shuttle/ScheduleSelector';
import { PickupSelector } from '@/components/shuttle/PickupSelector';
import { SeatSelector } from '@/components/shuttle/SeatSelector';
import { GuestInfoForm } from '@/components/shuttle/GuestInfoForm';
import { PaymentForm } from '@/components/shuttle/PaymentForm';
import { BookingSummary } from '@/components/shuttle/BookingSummary';
import { PriceBreakdown } from '@/components/shuttle/PriceBreakdown';
import ShuttleTicket from '@/components/shuttle/ShuttleTicket';
import { ServiceTypeSelector } from '@/components/shuttle/ServiceTypeSelector';
import { VehicleTypeSelector } from '@/components/shuttle/VehicleTypeSelector';
import { Skeleton } from '@/components/ui/skeleton';
import { DateSelector } from '@/components/shuttle/DateSelector';

const STEP_LABELS: Record<Step, string> = {
  routes: 'Pilih Rute',
  pickup: 'Titik Jemput',
  date: 'Tanggal Berangkat',
  service_cars: 'Layanan & Kendaraan',
  seats: 'Pilih Kursi',
  passengers: 'Data Penumpang',
  validation: 'Validasi Pesanan',
  summary: 'Ringkasan Pesanan',
  payment: 'Pembayaran',
  confirmation: 'Konfirmasi',
};

export default function Shuttle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('booking');
  
  const {
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
  } = useShuttleBooking();

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const currentIndex = STEP_LIST.indexOf(step);
  const progress = ((currentIndex + 1) / STEP_LIST.length) * 100;

  const handleConfirmSeats = () => {
    if (booking.selectedSeats.length === 0) {
      toast.error("Silakan pilih minimal satu kursi");
      return;
    }
    setStep('passengers');
  };

  // Auto-validate and advance from validation step
  useEffect(() => {
    if (step !== 'validation') return;

    const performValidation = async () => {
      try {
        // Validate all booking requirements
        const validationResult = await ShuttleService.validateBooking(
          booking.scheduleId!,
          booking.routeId!,
          booking.serviceTypeId!,
          booking.rayonId!,
          booking.selectedSeats.length,
          booking.passengers,
          priceBreakdown?.totalAmount || 0,
          booking.selectedSeats
        );

        if (!validationResult.isValid) {
          // Validation failed - show errors and go back to passengers step
          setValidationErrors(validationResult.errors);
          toast.error('Validasi pesanan gagal. Silakan periksa data Anda.');
          
          // Wait a moment for user to see error message, then go back
          setTimeout(() => {
            setStep('passengers');
            setValidationErrors([]);
          }, 2000);
        } else {
          // Validation passed - advance to summary
          setValidationErrors([]);
          setStep('summary');
          toast.success('Pesanan Anda telah divalidasi');
        }
      } catch (error) {
        console.error('Validation error:', error);
        setValidationErrors(['Terjadi kesalahan saat validasi pesanan']);
        toast.error('Gagal memvalidasi pesanan');
        
        setTimeout(() => {
          setStep('passengers');
          setValidationErrors([]);
        }, 2000);
      }
    };

    // Add small delay to ensure state is ready
    const timer = setTimeout(performValidation, 500);
    return () => clearTimeout(timer);
  }, [step, booking, priceBreakdown]);

  const handleConfirmBooking = async (method: 'CASH' | 'CARD' | 'TRANSFER', gateway?: string) => {
    try {
      if (!user) {
        toast.error('Silakan login untuk memesan');
        navigate('/auth');
        return;
      }

      if (booking.passengers.length !== booking.selectedSeats.length) {
        toast.error('Silakan isi semua informasi penumpang');
        return;
      }

      if (!priceBreakdown) {
        toast.error('Gagal menghitung harga');
        return;
      }

      setIsBooking(true);

      const confirmation = await ShuttleService.createBooking(user.id, {
        scheduleId: booking.scheduleId!,
        serviceTypeId: booking.serviceTypeId!,
        vehicleType: booking.vehicleType!,
        rayonId: booking.rayonId!,
        pickupPointId: booking.pickupPointId!,
        seatNumbers: booking.selectedSeats,
        passengerInfo: booking.passengers,
        paymentMethod: method,
        expectedTotalPrice: priceBreakdown.totalAmount,
      });

      if (confirmation) {
        setStep('confirmation');
        toast.success('Pemesanan berhasil dikonfirmasi!');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Pemesanan gagal');
    } finally {
      setIsBooking(false);
    }
  };

  const selectedPickupPoint = useMemo(() => {
    if (!booking.pickupPointId || !routeRayons) return null;
    for (const rayon of routeRayons) {
      const point = rayon.pickup_points?.find((p: any) => p.id === booking.pickupPointId);
      if (point) return point;
    }
    return null;
  }, [booking.pickupPointId, routeRayons]);

  return (
    <div className="container max-w-6xl py-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Shuttle Service</h1>
        <p className="text-muted-foreground">Pesan shuttle dengan mudah dan nyaman.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="booking">Pemesanan</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="booking" className="mt-6 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>{STEP_LABELS[step]}</span>
              <span>Langkah {currentIndex + 1} dari {STEP_LIST.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardContent className="pt-6">
                  {/* Step 1: Route Selection */}
                  {step === 'routes' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pilih Rute Perjalanan</h3>
                      <RouteSelector 
                        routes={routes} 
                        isLoading={routesLoading}
                        onSelectRoute={handleSelectRoute} 
                      />
                    </div>
                  )}

                  {/* Step 2: Pickup Point Selection */}
                  {step === 'pickup' && booking.routeId && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pilih Titik Penjemputan</h3>
                      <PickupSelector
                        rayons={routeRayons}
                        selectedRoute={selectedRoute}
                        selectedScheduleDeparture={selectedSchedule?.departure_time || ""}
                        onSelectPickupPoint={(rayon, point) => handleSelectPickupPoint(point.id, rayon.id)}
                        onBack={handlePreviousStep}
                      />
                    </div>
                  )}

                  {/* Step 3: Date Selection */}
                  {step === 'date' && booking.routeId && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pilih Tanggal Keberangkatan</h3>
                      <DateSelector
                        selectedRoute={selectedRoute}
                        selectedDate={booking.departureDate ? new Date(booking.departureDate) : undefined}
                        availableDates={availableDates || []}
                        onSelectDate={(date) => handleSelectDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        onBack={handlePreviousStep}
                      />
                    </div>
                  )}

                  {/* Step 4: Service & Vehicle & Schedule Selection */}
                  {step === 'service_cars' && booking.routeId && booking.departureDate && (
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Pilih Tipe Layanan</h3>
                        {servicesLoading ? (
                          <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-[100px] w-full" />
                            <Skeleton className="h-[100px] w-full" />
                          </div>
                        ) : (
                          <ServiceTypeSelector
                            serviceTypes={availableServices || []}
                            selectedRoute={selectedRoute}
                            selectedDate={new Date(booking.departureDate)}
                            onSelectService={handleSelectServiceType}
                            onBack={() => setStep('date')}
                          />
                        )}
                      </div>

                      {booking.serviceTypeId && (
                        <div className="space-y-4 pt-4 border-t">
                          <h3 className="text-lg font-semibold">Pilih Jenis Kendaraan</h3>
                          {vehiclesLoading ? (
                            <div className="space-y-3">
                              <Skeleton className="h-[100px] w-full" />
                            </div>
                          ) : (
                            <VehicleTypeSelector
                              availableVehicles={availableVehicles || []}
                              selectedRoute={selectedRoute}
                              selectedDate={new Date(booking.departureDate)}
                              serviceTypeName={availableServices?.find(s => s.id === booking.serviceTypeId)?.name}
                              vehicleDetails={{}} // Provide empty object for now as it's required
                              onSelectVehicle={handleSelectVehicleType}
                              onBack={() => setBooking(b => ({ ...b, serviceTypeId: null }))}
                            />
                          )}
                        </div>
                      )}

                      {booking.vehicleType && (
                        <div className="space-y-4 pt-4 border-t">
                          <h3 className="text-lg font-semibold">Pilih Jam Keberangkatan</h3>
                          {schedulesLoading ? (
                            <div className="space-y-3">
                              <Skeleton className="h-[80px] w-full" />
                            </div>
                          ) : (
                            <ScheduleSelector
                              filteredSchedules={filteredSchedules?.map((s: any) => ({
                                ...s.shuttle_schedules,
                                available_seats: s.available_seats,
                                total_seats: s.total_seats,
                                price_override: s.price_override
                              })) || []}
                              selectedRoute={selectedRoute}
                              selectedDate={new Date(booking.departureDate)}
                              onSelectSchedule={(s) => {
                                const selected = filteredSchedules?.find((fs: any) => fs.shuttle_schedules.id === s.id);
                                if (selected) handleSelectSchedule(selected);
                              }}
                              onBack={() => setBooking(b => ({ ...b, vehicleType: null }))}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 5: Seats Selection */}
                  {step === 'seats' && booking.scheduleId && (
                    <div className="space-y-4">
                      {seatsLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-[200px] w-full" />
                        </div>
                      ) : (
                        <SeatSelector
                          selectedRoute={selectedRoute}
                          selectedScheduleDeparture={selectedSchedule?.departure_time || ""}
                          selectedPickupPoint={selectedPickupPoint}
                          selectedSchedule={selectedSchedule}
                          scheduleSeats={(scheduleSeats || []).map(s => ({
                            id: s.id,
                            number: s.seat_number,
                            status: s.status as any
                          }))}
                          selectedSeats={booking.selectedSeats.map(String)}
                          totalFare={priceBreakdown?.totalAmount || 0}
                          onSeatClick={(seat) => toggleSeat(Number(seat.number))}
                          onConfirmSeats={handleConfirmSeats}
                          onBack={handlePreviousStep}
                        />
                      )}
                    </div>
                  )}

                  {/* Step 6: Data Penumpang */}
                  {step === 'passengers' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Informasi Penumpang</h3>
                      <div className="space-y-3">
                        {booking.selectedSeats.map((seatNumber) => (
                          <GuestInfoForm
                            key={seatNumber}
                            seatNumber={seatNumber}
                            onSave={(name, phone) => updatePassenger(seatNumber, name, phone)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 7: Validation */}
                  {step === 'validation' && (
                    <div className="space-y-6 py-12 text-center">
                      {validationErrors.length > 0 ? (
                        <>
                          <div className="space-y-4">
                            <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-red-600">Validasi Gagal</h3>
                              <p className="text-muted-foreground">Terjadi masalah dengan pesanan Anda:</p>
                            </div>
                          </div>
                          <Card className="border-red-200 bg-red-50">
                            <CardContent className="pt-4">
                              <ul className="space-y-2 text-sm text-left">
                                {validationErrors.map((error, idx) => (
                                  <li key={idx} className="flex gap-2">
                                    <span className="text-red-600 font-bold">•</span>
                                    <span className="text-red-700">{error}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                          <p className="text-sm text-muted-foreground">Anda akan dikembalikan ke step sebelumnya untuk memperbaiki data...</p>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold">Memvalidasi Pesanan...</h3>
                            <p className="text-muted-foreground">Kami sedang memastikan ketersediaan kursi dan menghitung tarif terbaik untuk Anda.</p>
                          </div>
                          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <ShieldCheck className="w-4 h-4 text-green-500" /> Keamanan Terjamin
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-blue-500" /> Respon Cepat
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 8: Summary/Review */}
                  {step === 'summary' && selectedRoute && selectedSchedule && booking.selectedService && selectedRayon && priceBreakdown && (
                    <BookingSummary
                      route={selectedRoute}
                      schedule={{
                        departureTime: selectedSchedule.departure_time,
                        arrivalTime: selectedSchedule.arrival_time,
                      }}
                      service={booking.selectedService}
                      rayonName={selectedRayon.name}
                      seatCount={booking.selectedSeats.length}
                      priceBreakdown={priceBreakdown}
                      passengerCount={booking.passengers.length}
                    />
                  )}

                  {/* Step 8: Payment */}
                  {step === 'payment' && (
                    <div className="space-y-4">
                      <PaymentForm
                        totalFare={priceBreakdown?.totalAmount || 0}
                        seatCount={booking.selectedSeats.length}
                        booking={isBooking}
                        processingPayment={isProcessingPayment}
                        onPayCash={() => handleConfirmBooking('CASH')}
                        onPayOnline={(gateway) => handleConfirmBooking('TRANSFER', gateway)}
                        onBack={handlePreviousStep}
                      />
                    </div>
                  )}

                  {/* Step 9: Confirmation */}
                  {step === 'confirmation' && userBookings && userBookings.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pemesanan Berhasil! 🎉</h3>
                      <ShuttleTicket 
                        bookingRef={userBookings[0].booking_ref}
                        routeName={userBookings[0].shuttle_schedules?.shuttle_routes?.name || ""}
                        origin={userBookings[0].shuttle_schedules?.shuttle_routes?.origin || ""}
                        destination={userBookings[0].shuttle_schedules?.shuttle_routes?.destination || ""}
                        departure={userBookings[0].shuttle_schedules?.departure_time || ""}
                        seatCount={userBookings[0].seat_count}
                        guestName={userBookings[0].guest_name || ""}
                        guestPhone={userBookings[0].guest_phone || ""}
                        totalFare={userBookings[0].total_fare}
                        paymentStatus={userBookings[0].payment_status}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={currentIndex === 0 || step === 'confirmation'}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Kembali
                </Button>

                {step !== 'payment' && step !== 'confirmation' && step !== 'validation' && (
                  <Button
                    onClick={handleNextStep}
                    disabled={
                      (step === 'routes' && !booking.routeId) ||
                      (step === 'pickup' && !booking.pickupPointId) ||
                      (step === 'date' && !booking.departureDate) ||
                      (step === 'service_cars' && (!booking.serviceTypeId || !booking.vehicleType || !booking.scheduleId)) ||
                      (step === 'seats' && booking.selectedSeats.length === 0) ||
                      (step === 'passengers' && booking.passengers.length !== booking.selectedSeats.length)
                    }
                    className="ml-auto"
                  >
                    Selanjutnya
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column: Price Summary (sticky) */}
            {priceBreakdown && (
              <div className="md:col-span-1">
                <div className="sticky top-6">
                  <PriceBreakdown breakdown={priceBreakdown} />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {!user ? (
                <p className="text-center text-muted-foreground py-8">
                  Silakan login untuk melihat riwayat pemesanan
                </p>
              ) : userBookings && userBookings.length > 0 ? (
                <div className="space-y-3">
                  {userBookings.map((booking: any) => (
                    <Card key={booking.id} className="p-3">
                      <p className="font-medium">{booking.booking_ref}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.shuttle_schedules?.shuttle_routes?.origin} →{' '}
                        {booking.shuttle_schedules?.shuttle_routes?.destination}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada pemesanan
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
