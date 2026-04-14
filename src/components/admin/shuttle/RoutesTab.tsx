import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---- Route Form ----
function RouteForm({ route, onClose }: { route?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(route?.name ?? "");
  const [origin, setOrigin] = useState(route?.origin ?? "");
  const [destination, setDestination] = useState(route?.destination ?? "");
  const [baseFare, setBaseFare] = useState(route?.base_fare ?? 0);
  const [distanceKm, setDistanceKm] = useState(route?.distance_km ?? 0);
  const [active, setActive] = useState(route?.active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !origin.trim() || !destination.trim()) {
      toast.error("Nama, asal, dan tujuan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (route?.id) {
        const { error } = await supabase.from("shuttle_routes").update({ name, origin, destination, base_fare: baseFare, distance_km: distanceKm || null, active }).eq("id", route.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shuttle_routes").insert({ name, origin, destination, base_fare: baseFare, distance_km: distanceKm || null, active });
        if (error) throw error;
      }
      toast.success(route ? "Rute diperbarui" : "Rute ditambahkan");
      qc.invalidateQueries({ queryKey: ["admin-shuttle-routes"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nama Rute</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Banda Aceh - Lhokseumawe" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Asal</Label>
          <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Banda Aceh" />
        </div>
        <div className="space-y-2">
          <Label>Tujuan</Label>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Lhokseumawe" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tarif Dasar (Rp)</Label>
          <Input type="number" value={baseFare} onChange={(e) => setBaseFare(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Jarak (km)</Label>
          <Input type="number" value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={active} onCheckedChange={setActive} />
        <Label>Aktif</Label>
      </div>
      <Button className="w-full gradient-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
        {route ? "Simpan Perubahan" : "Tambah Rute"}
      </Button>
    </div>
  );
}

// ---- Schedule Form ----
function ScheduleForm({ schedule, routeId, onClose }: { schedule?: any; routeId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [departureDate, setDepartureDate] = useState(schedule ? format(new Date(schedule.departure_time), "yyyy-MM-dd") : "");
  const [departureTime, setDepartureTime] = useState(schedule ? format(new Date(schedule.departure_time), "HH:mm") : "");
  const [arrivalTime, setArrivalTime] = useState(schedule?.arrival_time ? format(new Date(schedule.arrival_time), "HH:mm") : "");
  const [totalSeats, setTotalSeats] = useState(schedule?.total_seats ?? 20);
  const [serviceTypeId, setServiceTypeId] = useState(schedule?.service_type_id ?? "");
  const [vehicleType, setVehicleType] = useState(schedule?.vehicle_type ?? "SUV");
  const [driverId, setDriverId] = useState(schedule?.driver_id ?? "");
  const [active, setActive] = useState(schedule?.active ?? true);
  const [saving, setSaving] = useState(false);

  const { data: serviceTypes, isLoading: serviceTypesLoading, error: serviceTypesError } = useQuery({
    queryKey: ["shuttle-service-types"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("shuttle_service_types").select("*").order("name");
        if (error) {
          console.error("Service types query error:", error);
          throw error;
        }
        // Filter to only active service types
        const activeTypes = data?.filter((st: any) => st.active) || [];
        console.log("Service types loaded:", activeTypes);
        return activeTypes;
      } catch (err) {
        console.error("Service types fetch exception:", err);
        throw err;
      }
    },
  });

  const { data: drivers, isLoading: driversLoading, error: driversError } = useQuery({
    queryKey: ["admin-drivers-shuttle"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("drivers")
          .select("id, full_name")
          .eq("is_verified", true)
          .order("full_name");
        
        if (error) {
          console.error("Drivers query error:", error);
          throw error;
        }
        console.log("Drivers loaded:", data);
        return data || [];
      } catch (err) {
        console.error("Drivers fetch exception:", err);
        throw err;
      }
    },
  });

  // Query available vehicles for the selected service type
  const { data: availableVehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["service-vehicles", serviceTypeId],
    queryFn: async () => {
      if (!serviceTypeId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("shuttle_service_vehicle_types")
          .select("*")
          .eq("service_type_id", serviceTypeId)
          .eq("active", true);
        if (error) throw error;
        console.log("Available vehicles for service:", data);
        return data || [];
      } catch (err) {
        console.error("Error loading vehicles:", err);
        return [];
      }
    },
    enabled: !!serviceTypeId,
  });

  const handleSave = async () => {
    if (!departureDate || !departureTime) {
      toast.error("Tanggal dan jam keberangkatan wajib diisi");
      return;
    }
    if (!serviceTypeId) {
      toast.error("Pilih jenis layanan");
      return;
    }
    if (!vehicleType) {
      toast.error("Pilih jenis kendaraan");
      return;
    }
    setSaving(true);
    try {
      const depISO = new Date(`${departureDate}T${departureTime}:00`).toISOString();
      const arrISO = arrivalTime ? new Date(`${departureDate}T${arrivalTime}:00`).toISOString() : null;

      const scheduleData = {
        route_id: routeId,
        departure_time: depISO,
        arrival_time: arrISO,
        total_seats: totalSeats,
        available_seats: totalSeats,
        service_type_id: serviceTypeId,
        vehicle_type: vehicleType,
        driver_id: driverId === "none" ? null : (driverId || null),
        active,
      };

      if (schedule?.id) {
        const { error } = await supabase.from("shuttle_schedules").update(scheduleData as any).eq("id", schedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shuttle_schedules").insert(scheduleData as any);
        if (error) throw error;
      }
      toast.success(schedule ? "Jadwal diperbarui" : "Jadwal ditambahkan");
      qc.invalidateQueries({ queryKey: ["admin-shuttle-routes"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {serviceTypesError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          Error loading service types: {serviceTypesError instanceof Error ? serviceTypesError.message : "Unknown error"}
        </div>
      )}
      
      {driversError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          Error loading drivers: {driversError instanceof Error ? driversError.message : "Unknown error"}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tanggal</Label>
          <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Jam Berangkat</Label>
          <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Jenis Layanan {serviceTypesLoading && <span className="text-xs text-gray-500">(loading...)</span>}</Label>
          <Select value={serviceTypeId} onValueChange={(value) => {
            setServiceTypeId(value);
            // Reset vehicle type when service changes
            setVehicleType("");
          }} disabled={serviceTypesLoading || !serviceTypes || serviceTypes.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={serviceTypesLoading ? "Loading..." : "Pilih Layanan"} />
            </SelectTrigger>
            <SelectContent>
              {serviceTypes && serviceTypes.length > 0 ? (
                serviceTypes.map((st) => (
                  <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-500">No service types available</div>
              )}
            </SelectContent>
          </Select>
          {!serviceTypes || serviceTypes.length === 0 && !serviceTypesLoading && (
            <p className="text-xs text-red-600">No service types found in database</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Jenis Kendaraan {vehiclesLoading && <span className="text-xs text-gray-500">(loading...)</span>}</Label>
          <Select value={vehicleType} onValueChange={setVehicleType} disabled={!serviceTypeId || vehiclesLoading || !availableVehicles || availableVehicles.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={!serviceTypeId ? "Pilih Layanan Dulu" : vehiclesLoading ? "Loading..." : "Pilih Kendaraan"} />
            </SelectTrigger>
            <SelectContent>
              {availableVehicles && availableVehicles.length > 0 ? (
                availableVehicles.map((vehicle: any) => (
                  <SelectItem key={vehicle.id} value={vehicle.vehicle_type}>
                    {vehicle.vehicle_name} ({vehicle.capacity} kursi)
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-500">
                  {!serviceTypeId ? "Select service type first" : "No vehicles available"}
                </div>
              )}
            </SelectContent>
          </Select>
          {serviceTypeId && availableVehicles && availableVehicles.length > 0 && vehicleType && (
            <div className="text-xs text-gray-600">
              {(() => {
                const selectedVehicle = (availableVehicles as any[]).find((v: any) => v.vehicle_type === vehicleType);
                if (selectedVehicle && selectedVehicle.capacity) {
                  return (
                    <>
                      <p>Kapasitas: {selectedVehicle.capacity} kursi</p>
                      {selectedVehicle.facilities && selectedVehicle.facilities.length > 0 && (
                        <p>Fasilitas: {selectedVehicle.facilities.join(", ")}</p>
                      )}
                    </>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Jam Tiba (Opsional)</Label>
          <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Driver</Label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tanpa Driver</SelectItem>
              {drivers?.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Total Kursi</Label>
          <Input type="number" value={totalSeats} onChange={(e) => setTotalSeats(Number(e.target.value))} />
        </div>
        <div className="flex items-center gap-2 pt-8">
          <Switch checked={active} onCheckedChange={setActive} />
          <Label>Aktif</Label>
        </div>
      </div>
      <Button className="w-full gradient-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
        {schedule ? "Simpan Perubahan" : "Tambah Jadwal"}
      </Button>
    </div>
  );
}

// ---- Main RoutesTab ----
export default function RoutesTab() {
  const qc = useQueryClient();
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<any>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<any>(null);
  const [scheduleRouteId, setScheduleRouteId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: routes, isLoading } = useQuery({
    queryKey: ["admin-shuttle-routes"],
    queryFn: async () => {
      const { data: routesData, error: rErr } = await supabase.from("shuttle_routes").select("*").order("name");
      if (rErr) throw rErr;
      const { data: schedulesData } = await supabase.from("shuttle_schedules").select("*").order("departure_time", { ascending: true });
      const { data: bookingsData } = await supabase.from("shuttle_bookings").select("schedule_id, payment_status, shuttle_schedules!inner(route_id)").eq("status", "confirmed");
      return routesData.map((r) => {
        const routeSchedules = (schedulesData ?? []).filter((s) => s.route_id === r.id);
        const routeBookings = (bookingsData ?? []).filter((b: any) => b.shuttle_schedules?.route_id === r.id);
        return {
          ...r,
          schedules: routeSchedules,
          scheduleCount: routeSchedules.length,
          bookingCount: routeBookings.length,
          paidCount: routeBookings.filter((b: any) => b.payment_status === "paid").length,
          unpaidCount: routeBookings.filter((b: any) => b.payment_status === "unpaid" || !b.payment_status).length,
        };
      });
    },
  });

  const deleteRouteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shuttle_routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-shuttle-routes"] }); toast.success("Rute dihapus"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shuttle_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-shuttle-routes"] }); toast.success("Jadwal dihapus"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openAddRoute = () => { setEditRoute(null); setRouteDialogOpen(true); };
  const openEditRoute = (r: any) => { setEditRoute(r); setRouteDialogOpen(true); };
  const openAddSchedule = (routeId: string) => { setEditSchedule(null); setScheduleRouteId(routeId); setScheduleDialogOpen(true); };
  const openEditSchedule = (s: any, routeId: string) => { setEditSchedule(s); setScheduleRouteId(routeId); setScheduleDialogOpen(true); };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" className="gradient-primary text-primary-foreground" onClick={openAddRoute}>
          <Plus className="w-4 h-4 mr-1" />Tambah Rute
        </Button>
      </div>

      {!routes?.length ? (
        <p className="text-sm text-muted-foreground">Belum ada rute shuttle.</p>
      ) : (
        <div className="space-y-3">
          {routes.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{r.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{r.origin} → {r.destination}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={r.active ? "default" : "outline"} className="text-xs">{r.active ? "Aktif" : "Nonaktif"}</Badge>
                    {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground pb-2">
                <span>{r.scheduleCount} jadwal</span>
                <span>{r.bookingCount} booking</span>
                <Badge variant="secondary" className="text-xs">{r.paidCount} paid</Badge>
                <Badge variant="outline" className="text-xs">{r.unpaidCount} unpaid</Badge>
                <span>Rp {r.base_fare.toLocaleString("id-ID")}/seat</span>
              </CardContent>

              {expandedId === r.id && (
                <CardContent className="space-y-3 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">Jadwal</p>
                    <Button size="sm" variant="outline" onClick={() => openAddSchedule(r.id)}>
                      <Plus className="w-3 h-3 mr-1" />Tambah Jadwal
                    </Button>
                  </div>

                  {r.schedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Tidak ada jadwal</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b">
                            <th className="text-left py-1 pr-2">Tanggal</th>
                            <th className="text-left py-1 pr-2">Berangkat</th>
                            <th className="text-left py-1 pr-2">Tiba</th>
                            <th className="text-right py-1 pr-2">Kursi</th>
                            <th className="text-center py-1 pr-2">Status</th>
                            <th className="text-right py-1">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.schedules.map((s: any) => (
                            <tr key={s.id} className="border-b border-border/50">
                              <td className="py-1 pr-2">{format(new Date(s.departure_time), "dd MMM yyyy")}</td>
                              <td className="py-1 pr-2 font-bold">{format(new Date(s.departure_time), "HH:mm")}</td>
                              <td className="py-1 pr-2">{s.arrival_time ? format(new Date(s.arrival_time), "HH:mm") : "-"}</td>
                              <td className="py-1 pr-2 text-right">{s.available_seats}/{s.total_seats}</td>
                              <td className="py-1 pr-2 text-center">
                                <Badge variant={s.active ? "default" : "outline"} className="text-[10px]">{s.active ? "Aktif" : "Off"}</Badge>
                              </td>
                              <td className="py-1 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditSchedule(s, r.id)}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteScheduleMutation.mutate(s.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEditRoute(r)}><Edit className="w-3 h-3 mr-1" />Edit Rute</Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteRouteMutation.mutate(r.id)}>
                      <Trash2 className="w-3 h-3 mr-1" />Hapus Rute
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRoute ? "Edit Rute" : "Tambah Rute"}</DialogTitle>
            <DialogDescription>
              {editRoute ? "Ubah detail rute shuttle yang sudah ada." : "Tambahkan rute shuttle baru ke sistem."}
            </DialogDescription>
          </DialogHeader>
          <RouteForm route={editRoute} onClose={() => setRouteDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSchedule ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
            <DialogDescription>
              {editSchedule ? "Ubah waktu keberangkatan dan ketersediaan kursi." : "Tentukan waktu keberangkatan baru untuk rute ini."}
            </DialogDescription>
          </DialogHeader>
          <ScheduleForm schedule={editSchedule} routeId={scheduleRouteId} onClose={() => setScheduleDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
