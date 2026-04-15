
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bus, Calendar, Clock, MapPin, Users, Phone, 
  ChevronRight, ArrowRight, Loader2, AlertCircle,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import GuestAccessCard from "@/components/GuestAccessCard";

export default function DriverShuttle() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  if (!authLoading && !user) {
    return (
      <GuestAccessCard
        icon={<Bus />}
        title="Layanan Shuttle"
        description="Kelola rute shuttle Anda, terima booking, dan kelola penumpang dengan dashboard terintegrasi."
        features={[
          "🗺️ Kelola rute & jadwal shuttle",
          "👥 Lihat booking penumpang",
          "📅 Histori perjalanan lengkap",
          "⭐ Rating & review dari penumpang",
        ]}
        ctaText="Daftar Shuttle Driver"
        ctaLink="/auth"
      />
    );
  }

  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTrip, setPendingTrip] = useState<any>(null);

  // Fetch driver profile to get driver_id
  const { data: driver } = useQuery({
    queryKey: ["driver-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("drivers") as any)
        .select("id, is_verified")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch available trips (no driver assigned)
  const { data: availableTrips, isLoading: loadingAvailable } = useQuery({
    queryKey: ["available-shuttle-trips"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("shuttle_schedules") as any)
        .select("*, shuttle_routes(*)")
        .is("driver_id", null)
        .eq("active", true)
        .gte("departure_time", new Date().toISOString())
        .order("departure_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch my assigned trips
  const { data: myTrips, isLoading: loadingMyTrips } = useQuery({
    queryKey: ["my-shuttle-trips", driver?.id],
    queryFn: async () => {
      if (!driver?.id) return [];
      const { data, error } = await (supabase
        .from("shuttle_schedules") as any)
        .select("*, shuttle_routes(*)")
        .eq("driver_id", driver.id)
        .order("departure_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!driver?.id,
  });

  // Mutation to take a trip
  const takeTripMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data, error } = await (supabase.rpc as any)("assign_driver_to_shuttle", {
        p_schedule_id: scheduleId,
        p_driver_id: driver!.id
      });
      
      if (error) {
        // Handle custom database exceptions
        if (error.message.includes("Vehicle type mismatch")) {
          throw new Error("Tipe kendaraan Anda tidak sesuai dengan persyaratan jadwal ini.");
        }
        if (error.message.includes("does not have a verified vehicle")) {
          throw new Error("Anda belum memiliki kendaraan yang diverifikasi oleh admin.");
        }
        throw error;
      }
      
      if (!data) throw new Error("Jadwal sudah diambil oleh driver lain.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-shuttle-trips"] });
      queryClient.invalidateQueries({ queryKey: ["my-shuttle-trips"] });
      toast.success("Berhasil mengambil jadwal perjalanan!");
      setShowConfirm(false);
      setPendingTrip(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal mengambil jadwal perjalanan.");
      setShowConfirm(false);
    }
  });

  // Fetch passengers for selected trip
  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ["trip-passengers", selectedTrip?.id],
    queryFn: async () => {
      if (!selectedTrip?.id) return [];
      const { data, error } = await (supabase
        .from("shuttle_bookings") as any)
        .select("*, shuttle_pickup_points(*)")
        .eq("schedule_id", selectedTrip.id)
        .eq("status", "confirmed");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTrip,
  });

  const handleTakeTrip = (trip: any) => {
    if (!driver?.is_verified) {
      toast.error("Akun Anda harus diverifikasi oleh admin untuk mengambil jadwal shuttle.");
      return;
    }
    setPendingTrip(trip);
    setShowConfirm(true);
  };

  if (selectedTrip) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
        <div className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-10">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/10 mb-2 -ml-2 p-0"
            onClick={() => setSelectedTrip(null)}
          >
            <ArrowRight className="w-5 h-5 rotate-180 mr-2" /> Kembali
          </Button>
          <h1 className="text-xl font-bold">Detail Perjalanan</h1>
          <p className="text-emerald-50/80 text-sm">
            {selectedTrip.shuttle_routes?.name}
          </p>
        </div>

        <div className="p-4 space-y-4">
          <Card className="rounded-2xl border-none shadow-md overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2 rounded-xl">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Waktu Keberangkatan</p>
                  <p className="font-bold text-slate-900">
                    {format(new Date(selectedTrip.departure_time), "EEEE, d MMMM HH:mm", { locale: localeId })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 p-2 rounded-xl">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Kapasitas</p>
                  <p className="font-bold text-slate-900">
                    {selectedTrip.total_seats - selectedTrip.available_seats} / {selectedTrip.total_seats} Penumpang Terisi
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <h2 className="font-bold text-slate-800 ml-1">Daftar Penumpang ({passengers?.length || 0})</h2>

          {loadingPassengers ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : passengers && passengers.length > 0 ? (
            <div className="space-y-3">
              {passengers.map((p: any) => (
                <Card key={p.id} className="rounded-2xl border-none shadow-sm overflow-hidden border-l-4 border-l-emerald-500">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{p.guest_name}</p>
                        <p className="text-xs text-slate-500">{p.guest_phone}</p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {p.seat_count} Kursi
                      </Badge>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Titik Jemput</p>
                          <p className="text-sm font-bold text-slate-800">{p.shuttle_pickup_points?.name}</p>
                          <p className="text-xs text-slate-500">{p.shuttle_pickup_points?.departure_time}</p>
                        </div>
                      </div>
                      {p.notes && (
                        <div className="flex items-start gap-2 border-t border-slate-200 pt-2">
                          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Catatan</p>
                            <p className="text-xs text-slate-600 italic">"{p.notes}"</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 rounded-xl h-10 gap-2 border-slate-200"
                        onClick={() => window.open(`tel:${p.guest_phone}`)}
                      >
                        <Phone className="w-4 h-4" /> Hubungi
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 rounded-xl h-10 gap-2 border-slate-200"
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.shuttle_pickup_points?.lat},${p.shuttle_pickup_points?.lng}`)}
                      >
                        <MapPin className="w-4 h-4" /> Navigasi
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-3xl shadow-sm border border-slate-100">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">Belum ada penumpang terdaftar.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      <div className="bg-emerald-600 text-white p-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">Trip Shuttle</h1>
        <p className="text-emerald-50/80 text-sm font-medium">Kelola jadwal keberangkatan shuttle Anda</p>
      </div>

      <div className="px-4 -mt-4">
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-md rounded-2xl p-1 h-14 shadow-sm border border-white">
            <TabsTrigger value="available" className="rounded-xl data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-bold transition-all duration-300">
              Tersedia
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-xl data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-bold transition-all duration-300">
              Jadwal Saya
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4 space-y-4">
            {loadingAvailable ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              </div>
            ) : availableTrips && availableTrips.length > 0 ? (
              availableTrips.map((trip: any) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  onAction={() => handleTakeTrip(trip)}
                  actionLabel="Ambil Trip"
                  isAvailable
                />
              ))
            ) : (
              <EmptyState message="Tidak ada jadwal tersedia saat ini." />
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4 space-y-4">
            {loadingMyTrips ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              </div>
            ) : myTrips && myTrips.length > 0 ? (
              myTrips.map((trip: any) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  onAction={() => setSelectedTrip(trip)}
                  actionLabel="Detail & Penumpang"
                />
              ))
            ) : (
              <EmptyState message="Anda belum mengambil jadwal perjalanan apapun." />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle>Konfirmasi Trip</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengambil jadwal perjalanan ini? Setelah dikonfirmasi, Anda bertanggung jawab untuk menjemput penumpang sesuai jadwal.
            </DialogDescription>
          </DialogHeader>
          {pendingTrip && (
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
              <p className="font-bold text-slate-900">{pendingTrip.shuttle_routes?.name}</p>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                {format(new Date(pendingTrip.departure_time), "EEEE, d MMMM HH:mm", { locale: localeId })}
              </div>
            </div>
          )}
          <DialogFooter className="flex-row gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1 rounded-xl h-12">
              Batal
            </Button>
            <Button 
              onClick={() => takeTripMutation.mutate(pendingTrip.id)} 
              className="flex-1 rounded-xl h-12 bg-emerald-600 hover:bg-emerald-700"
              disabled={takeTripMutation.isPending}
            >
              {takeTripMutation.isPending ? <Loader2 className="animate-spin" /> : "Ya, Ambil Trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TripCard({ trip, onAction, actionLabel, isAvailable = false }: any) {
  return (
    <Card className="rounded-3xl border-none shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
      <CardContent className="p-0">
        <div className="bg-white p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Bus className="w-3 h-3" /> Shuttle Service
            </div>
            <p className="text-xs font-bold text-emerald-600">
              {trip.available_seats} / {trip.total_seats} Kursi Tersedia
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 leading-tight">
              {trip.shuttle_routes?.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5" />
              {trip.shuttle_routes?.origin} <ChevronRight className="w-3 h-3" /> {trip.shuttle_routes?.destination}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Calendar className="w-3 h-3" /> Tanggal
              </div>
              <p className="text-sm font-bold text-slate-800">
                {format(new Date(trip.departure_time), "d MMM yyyy", { locale: localeId })}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Clock className="w-3 h-3" /> Waktu
              </div>
              <p className="text-sm font-bold text-slate-800">
                {format(new Date(trip.departure_time), "HH:mm")} WIB
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
          <Button 
            onClick={onAction} 
            className={`w-full rounded-2xl font-bold h-12 shadow-sm ${
              isAvailable 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 border"
            }`}
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 px-6">
      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Bus className="w-10 h-10 text-slate-200" />
      </div>
      <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
    </div>
  );
}
