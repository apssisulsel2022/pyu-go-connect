import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Route,
  MapPin,
  Users,
  Zap,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowRight,
  Clock,
  ArrowUp,
  ArrowDown,
  Trash,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import PricingRulesTab from "./PricingRulesTab";
import ShuttleService from "@/services/ShuttleService";

interface PickupPoint {
  stop_order: number;
  name: string;
  departure_time: string;
  distance_meters: number;
  fare: number;
  active: boolean;
}

// ============ DIALOG FORMS ============

function AddRayonDialog({ routeId, onClose, isOpen }: { routeId: string; onClose: () => void; isOpen: boolean }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState<PickupPoint[]>([
    { stop_order: 1, name: "", departure_time: "", distance_meters: 0, fare: 0, active: true },
  ]);
  const [saving, setSaving] = useState(false);

  const addPoint = () => {
    setPoints([
      ...points,
      {
        stop_order: points.length + 1,
        name: "",
        departure_time: "",
        distance_meters: 0,
        fare: 0,
        active: true,
      },
    ]);
  };

  const updatePoint = (idx: number, field: string, value: any) => {
    const updated = [...points];
    (updated[idx] as any)[field] = value;
    setPoints(updated);
  };

  const removePoint = (idx: number) => {
    if (points.length === 1) {
      toast.error("Minimal harus ada 1 titik jemput");
      return;
    }
    setPoints(points.filter((_, i) => i !== idx).map((p, i) => ({ ...p, stop_order: i + 1 })));
  };

  const movePoint = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= points.length) return;
    const updated = [...points];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setPoints(updated.map((p, i) => ({ ...p, stop_order: i + 1 })));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nama rayon wajib diisi");
      return;
    }
    if (points.some((p) => !p.name.trim())) {
      toast.error("Semua titik jemput harus memiliki nama");
      return;
    }

    setSaving(true);
    try {
      const { data: rayonData, error: rayonErr } = await (supabase.from("shuttle_rayons") as any)
        .insert({
          route_id: routeId,
          name,
          description,
          active: true,
        })
        .select("id")
        .single();

      if (rayonErr) throw rayonErr;

      const pointsToInsert = points.map((p) => ({
        rayon_id: rayonData.id,
        stop_order: p.stop_order,
        name: p.name,
        departure_time: p.departure_time,
        distance_meters: p.distance_meters,
        fare: p.fare,
        active: p.active,
      }));

      const { error: pointsErr } = await (supabase.from("shuttle_pickup_points") as any)
        .insert(pointsToInsert);

      if (pointsErr) throw pointsErr;

      toast.success("Rayon berhasil ditambahkan dengan titik jemput");
      qc.invalidateQueries({ queryKey: ["admin-route-rayons", routeId] });
      setName("");
      setDescription("");
      setPoints([{ stop_order: 1, name: "", departure_time: "", distance_meters: 0, fare: 0, active: true }]);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Rayon Baru</DialogTitle>
          <DialogDescription>Buat rayon dengan urutan titik jemput</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Rayon *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Rayon A - Pusat Kota"
            />
          </div>

          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Keterangan rayon ini"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Titik Jemput Terurut *</Label>
              <Button size="sm" variant="outline" onClick={addPoint}>
                <Plus className="w-3 h-3 mr-1" />
                Tambah Titik
              </Button>
            </div>

            <div className="space-y-2">
              {points.map((p, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      J{p.stop_order}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => movePoint(idx, -1)}
                        disabled={idx === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => movePoint(idx, 1)}
                        disabled={idx === points.length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500"
                        onClick={() => removePoint(idx)}
                      >
                        <Trash className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Nama Lokasi *</Label>
                      <Input
                        className="h-8 text-xs"
                        value={p.name}
                        onChange={(e) => updatePoint(idx, "name", e.target.value)}
                        placeholder="Contoh: Hermes Palace, Mall Batu Bara"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Waktu Keberangkatan</Label>
                      <Input
                        className="h-8 text-xs"
                        value={p.departure_time}
                        onChange={(e) => updatePoint(idx, "departure_time", e.target.value)}
                        placeholder="06.30"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Jarak (m)</Label>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        value={p.distance_meters}
                        onChange={(e) => updatePoint(idx, "distance_meters", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tarif (Rp)</Label>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        value={p.fare}
                        onChange={(e) => updatePoint(idx, "fare", Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={p.active}
                          onCheckedChange={(checked) =>
                            updatePoint(idx, "active", checked)
                          }
                        />
                        <Label className="text-xs cursor-pointer">Aktif</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Rayon
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddServiceDialog({ routeId, onClose, isOpen }: { routeId: string; onClose: () => void; isOpen: boolean }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nama layanan wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase.from("shuttle_service_types") as any).insert({
        route_id: routeId,
        name,
        description,
        active: true,
      } as any);

      if (error) throw error;

      toast.success("Layanan berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["admin-route-services", routeId] });
      setName("");
      setDescription("");
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Layanan Baru</DialogTitle>
          <DialogDescription>Buat tipe layanan shuttle untuk rute ini</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Layanan *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Shuttle Express, Shuttle Reguler"
            />
          </div>

          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Keterangan layanan"
            />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Layanan
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddVehicleDialog({ routeId, serviceId, onClose, isOpen }: { routeId: string; serviceId: string; onClose: () => void; isOpen: boolean }) {
  const qc = useQueryClient();
  const [vehicleType, setVehicleType] = useState("");
  const [capacity, setCapacity] = useState(0);
  const [facilities, setFacilities] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!vehicleType.trim() || capacity <= 0) {
      toast.error("Tipe kendaraan dan kapasitas wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase.from("shuttle_service_vehicle_types") as any).insert({
        route_id: routeId,
        service_id: serviceId,
        vehicle_type: vehicleType,
        vehicle_name: vehicleType,
        capacity,
        facilities: facilities ? facilities.split(",").map((f) => f.trim()) : [],
        active: true,
      } as any);

      if (error) throw error;

      toast.success("Kendaraan berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["admin-vehicle-service-mappings", routeId] });
      setVehicleType("");
      setCapacity(0);
      setFacilities("");
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Kendaraan Baru</DialogTitle>
          <DialogDescription>Tambahkan tipe kendaraan untuk layanan ini</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipe Kendaraan *</Label>
            <Input
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              placeholder="Contoh: Avanza, Alphard, Bus Medium"
            />
          </div>

          <div className="space-y-2">
            <Label>Kapasitas Penumpang *</Label>
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              placeholder="7"
            />
          </div>

          <div className="space-y-2">
            <Label>Fasilitas</Label>
            <Input
              value={facilities}
              onChange={(e) => setFacilities(e.target.value)}
              placeholder="AC, WiFi, USB Charger, Kursi Empuk"
            />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Kendaraan
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddScheduleDialog({ routeId, serviceId, vehicleId, onClose, isOpen }: { routeId: string; serviceId: string; vehicleId: string; onClose: () => void; isOpen: boolean }) {
  const qc = useQueryClient();
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState(0);
  const [selectedService, setSelectedService] = useState(serviceId);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleId);
  const [saving, setSaving] = useState(false);

  // Query services and vehicles for selection
  const { data: services = [] } = useQuery({
    queryKey: ["admin-dialog-services", routeId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("shuttle_service_types") as any).select("*").eq("route_id" as any, routeId).eq("active" as any, true);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!routeId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["admin-dialog-vehicles", routeId, selectedService],
    queryFn: async () => {
      const { data, error } = await (supabase.from("shuttle_service_vehicle_types") as any).select("*").eq("route_id" as any, routeId).eq("service_id" as any, selectedService).eq("active" as any, true);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!routeId && !!selectedService,
  });

  useEffect(() => {
    if (serviceId) setSelectedService(serviceId);
    if (vehicleId) setSelectedVehicle(vehicleId);
  }, [serviceId, vehicleId, isOpen]);

  const handleSave = async () => {
    if (!departureTime || !arrivalTime || availableSeats <= 0 || !selectedService || !selectedVehicle) {
      toast.error("Semua field wajib diisi");
      return;
    }

    if (departureTime >= arrivalTime) {
      toast.error("Waktu keberangkatan harus lebih awal dari waktu tiba");
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle) {
      toast.error("Kendaraan tidak ditemukan");
      return;
    }

    setSaving(true);
    try {
      // Insert schedule
      const { data: scheduleData, error: scheduleErr } = await (supabase.from("shuttle_schedules") as any)
        .insert({
          route_id: routeId,
          service_id: selectedService,
          departure_time: departureTime,
          arrival_time: arrivalTime,
          total_seats: availableSeats,
          available_seats: availableSeats,
          active: true,
        } as any)
        .select("id")
        .single();

      if (scheduleErr) throw scheduleErr;

      // Insert into shuttle_schedule_services
      const { error: serviceErr } = await (supabase as any).from("shuttle_schedule_services")
        .insert({
          schedule_id: scheduleData.id,
          service_type_id: selectedService,
          vehicle_type: vehicle.vehicle_type,
          total_seats: availableSeats,
          available_seats: availableSeats,
          active: true,
        } as any);

      if (serviceErr) throw serviceErr;

      toast.success("Jadwal berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["admin-route-schedules", routeId] });
      setDepartureTime("");
      setArrivalTime("");
      setAvailableSeats(0);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Jadwal Baru</DialogTitle>
          <DialogDescription>Buat jadwal keberangkatan untuk rute ini</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Layanan *</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih layanan" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kendaraan *</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle} disabled={!selectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kendaraan" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.vehicle_type} ({v.capacity} kursi)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Waktu Keberangkatan *</Label>
            <Input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Waktu Tiba *</Label>
            <Input
              type="datetime-local"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Jumlah Kursi Tersedia *</Label>
            <Input
              type="number"
              value={availableSeats}
              onChange={(e) => setAvailableSeats(Number(e.target.value))}
              placeholder="7"
            />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Jadwal
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FarePreview({ routeId, serviceId, rayonId, seats }: { routeId: string; serviceId: string; rayonId: string; seats: number }) {
  const { data: preview, isLoading } = useQuery({
    queryKey: ["admin-fare-preview", routeId, serviceId, rayonId, seats],
    queryFn: async () => {
      if (!routeId || !serviceId || !rayonId) return null;
      return ShuttleService.calculatePrice(routeId, serviceId, rayonId, seats);
    },
    enabled: !!routeId && !!serviceId && !!rayonId,
  });

  if (isLoading) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  if (!preview) return <p className="text-xs text-muted-foreground italic">Pilih konfigurasi di atas untuk simulasi harga</p>;

  return (
    <div className="bg-white p-3 rounded-lg border border-dashed border-primary/50">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold">Estimasi Tarif:</span>
        <span className="text-lg font-bold text-primary">Rp {preview.totalAmount.toLocaleString("id-ID")}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Tarif Dasar:</span>
          <span>Rp {preview.baseAmount.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Premium Layanan:</span>
          <span>Rp {preview.servicePremium.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Biaya Jarak:</span>
          <span>Rp {preview.distanceAmount.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Surcharge Rayon:</span>
          <span>Rp {preview.rayonSurcharge.toLocaleString("id-ID")}</span>
        </div>
      </div>
    </div>
  );
}

export default function IntegratedShuttleManagement() {
  const qc = useQueryClient();
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [searchRoute, setSearchRoute] = useState("");

  // Dialog states
  const [rayonDialogOpen, setRayonDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);

  // Query: All routes
  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ["admin-integrated-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shuttle_routes")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredRoutes = useMemo(
    () =>
      routes.filter(
        (r) =>
          r.name.toLowerCase().includes(searchRoute.toLowerCase()) ||
          r.origin.toLowerCase().includes(searchRoute.toLowerCase())
      ),
    [routes, searchRoute]
  );

  // Query: Rayons for selected route
  const { data: rayons = [] } = useQuery({
    queryKey: ["admin-route-rayons", selectedRoute],
    queryFn: async () => {
      if (!selectedRoute) return [];
      const { data: rayonsData, error: rayonsErr } = await (supabase.from("shuttle_rayons") as any)
        .select("*")
        .eq("route_id" as any, selectedRoute);
      if (rayonsErr) throw rayonsErr;

      const { data: pointsData } = await (supabase.from("shuttle_pickup_points") as any)
        .select("*")
        .in(
          "rayon_id" as any,
          rayonsData?.map((r: any) => r.id) || []
        );

      return (rayonsData || []).map((r: any) => ({
        ...r,
        pickup_points: (pointsData || [])
          .filter((p: any) => p.rayon_id === r.id)
          .sort((a: any, b: any) => a.stop_order - b.stop_order),
      }));
    },
    enabled: !!selectedRoute,
  });

  // Query: Services for selected route
  const { data: services = [] } = useQuery({
    queryKey: ["admin-route-services", selectedRoute],
    queryFn: async () => {
      if (!selectedRoute) return [];
      const { data, error } = await (supabase.from("shuttle_service_types") as any)
        .select("*")
        .eq("route_id" as any, selectedRoute)
        .eq("active" as any, true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRoute,
  });

  // Query: Vehicle-service mappings
  const { data: vehicles = [] } = useQuery({
    queryKey: ["admin-vehicle-service-mappings", selectedRoute],
    queryFn: async () => {
      if (!selectedRoute) return [];
      const { data, error } = await (supabase.from("shuttle_service_vehicle_types") as any)
        .select("*")
        .eq("route_id" as any, selectedRoute)
        .eq("active" as any, true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRoute,
  });

  // Query: Schedules for selected route
  const { data: schedules = [] } = useQuery({
    queryKey: ["admin-route-schedules", selectedRoute],
    queryFn: async () => {
      if (!selectedRoute) return [];
      const { data, error } = await (supabase.from("shuttle_schedules") as any)
        .select("*")
        .eq("route_id" as any, selectedRoute)
        .eq("active" as any, true)
        .order("departure_time");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRoute,
  });

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, typeof schedules> = {};
    schedules.forEach((schedule) => {
      const dateKey = format(new Date(schedule.departure_time), "yyyy-MM-dd");
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(schedule);
    });
    return grouped;
  }, [schedules]);

  const currentRoute = routes.find((r) => r.id === selectedRoute);

  const deleteMutation = useMutation({
    mutationFn: async (target: { type: string; id: string }) => {
      const tables: Record<string, string> = {
        rayon: "shuttle_rayons",
        service: "shuttle_service_types",
        vehicle: "shuttle_service_vehicle_types",
        schedule: "shuttle_schedules",
      };

      const { error } = await (supabase.from(tables[target.type] as any) as any)
        .delete()
        .eq("id", target.id);

      if (error) throw error;
    },
    onSuccess: (_, target) => {
      toast.success(`${target.type} berhasil dihapus`);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);

      if (target.type === "rayon")
        qc.invalidateQueries({ queryKey: ["admin-route-rayons", selectedRoute] });
      if (target.type === "service")
        qc.invalidateQueries({ queryKey: ["admin-route-services", selectedRoute] });
      if (target.type === "vehicle")
        qc.invalidateQueries({ queryKey: ["admin-vehicle-service-mappings", selectedRoute] });
      if (target.type === "schedule")
        qc.invalidateQueries({ queryKey: ["admin-route-schedules", selectedRoute] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  if (routesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Route Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Pilih Rute untuk Dikelola
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input
              placeholder="Cari rute..."
              value={searchRoute}
              onChange={(e) => setSearchRoute(e.target.value)}
              className="mb-3"
            />
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih rute..." />
              </SelectTrigger>
              <SelectContent>
                {filteredRoutes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.origin} → {r.destination})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedRoute && currentRoute && (
        <>
          {/* Route Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>{currentRoute.name}</CardTitle>
              <CardDescription>
                {currentRoute.origin} → {currentRoute.destination}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Jarak</p>
                  <p className="text-lg font-bold">{currentRoute.distance_km} km</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tarif Dasar</p>
                  <p className="text-lg font-bold">Rp {currentRoute.base_fare.toLocaleString("id-ID")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Rayons</p>
                  <p className="text-lg font-bold">{rayons.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Jadwal</p>
                  <p className="text-lg font-bold">{schedules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Management Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Ringkasan</TabsTrigger>
              <TabsTrigger value="rayons">Rayons</TabsTrigger>
              <TabsTrigger value="services">Layanan</TabsTrigger>
              <TabsTrigger value="vehicles">Kendaraan</TabsTrigger>
              <TabsTrigger value="schedules">Jadwal</TabsTrigger>
              <TabsTrigger value="pricing">Tarif</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan Konfigurasi Rute</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Rayons Terdaftar</p>
                            <p className="text-3xl font-bold text-blue-600">{rayons.length}</p>
                          </div>
                          <MapPin className="w-8 h-8 text-blue-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Layanan Aktif</p>
                            <p className="text-3xl font-bold text-green-600">{services.length}</p>
                          </div>
                          <Zap className="w-8 h-8 text-green-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Tipe Kendaraan</p>
                            <p className="text-3xl font-bold text-purple-600">{vehicles.length}</p>
                          </div>
                          <Users className="w-8 h-8 text-purple-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Total Jadwal</p>
                            <p className="text-3xl font-bold text-orange-600">{schedules.length}</p>
                          </div>
                          <Clock className="w-8 h-8 text-orange-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Checklist Konfigurasi</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border ${rayons.length > 0 ? "bg-green-500 border-green-600" : "border-gray-300"}`} />
                        <span className="text-sm">{rayons.length > 0 ? "✓" : "○"} Minimal 1 Rayon sudah terdaftar</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border ${services.length > 0 ? "bg-green-500 border-green-600" : "border-gray-300"}`} />
                        <span className="text-sm">{services.length > 0 ? "✓" : "○"} Minimal 1 Layanan sudah didefinisikan</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border ${vehicles.length > 0 ? "bg-green-500 border-green-600" : "border-gray-300"}`} />
                        <span className="text-sm">{vehicles.length > 0 ? "✓" : "○"} Minimal 1 Kendaraan sudah terdaftar</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border ${schedules.length > 0 ? "bg-green-500 border-green-600" : "border-gray-300"}`} />
                        <span className="text-sm">{schedules.length > 0 ? "✓" : "○"} Minimal 1 Jadwal sudah terjadwal</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-3">Simulasi Kalkulasi Tarif</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label>Layanan</Label>
                        <Select 
                          value={services.length > 0 ? (window as any)._previewService || services[0]?.id : ""} 
                          onValueChange={(val) => {
                            (window as any)._previewService = val;
                            qc.invalidateQueries({ queryKey: ["admin-fare-preview"] });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih layanan" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Rayon</Label>
                        <Select 
                          value={rayons.length > 0 ? (window as any)._previewRayon || rayons[0]?.id : ""} 
                          onValueChange={(val) => {
                            (window as any)._previewRayon = val;
                            qc.invalidateQueries({ queryKey: ["admin-fare-preview"] });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih rayon" />
                          </SelectTrigger>
                          <SelectContent>
                            {rayons.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Jumlah Kursi</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          defaultValue="1" 
                          onChange={(e) => {
                            (window as any)._previewSeats = parseInt(e.target.value) || 1;
                            qc.invalidateQueries({ queryKey: ["admin-fare-preview"] });
                          }}
                        />
                      </div>
                    </div>
                    
                    <FarePreview 
                      routeId={selectedRoute} 
                      serviceId={(window as any)._previewService || services[0]?.id} 
                      rayonId={(window as any)._previewRayon || rayons[0]?.id}
                      seats={(window as any)._previewSeats || 1}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rayons Tab */}
            <TabsContent value="rayons">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Rayons & Titik Jemput</CardTitle>
                  <Button onClick={() => setRayonDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Rayon
                  </Button>
                </CardHeader>
                <CardContent>
                  {rayons.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Belum ada rayon. Tambahkan rayon baru untuk memulai.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rayons.map((rayon) => (
                        <Card key={rayon.id} className="bg-slate-50">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold">{rayon.name}</h4>
                                <p className="text-xs text-muted-foreground">{rayon.description}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => {
                                  setDeleteTarget({ type: "rayon", id: rayon.id });
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              {rayon.pickup_points.map((point) => (
                                <div
                                  key={point.id}
                                  className="flex items-center justify-between text-sm bg-white p-2 rounded border"
                                >
                                  <div className="flex-1">
                                    <Badge variant="outline" className="mr-2">
                                      J{point.stop_order}
                                    </Badge>
                                    <span className="font-medium">{point.name}</span>
                                    {point.departure_time && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        @ {point.departure_time}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">
                                      Rp {point.fare.toLocaleString("id-ID")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Jenis Layanan</CardTitle>
                  <Button onClick={() => setServiceDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Layanan
                  </Button>
                </CardHeader>
                <CardContent>
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Belum ada layanan. Tambahkan layanan baru.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {services.map((service) => (
                        <Card key={service.id}>
                          <CardContent className="pt-4 flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{service.name}</h4>
                              <p className="text-xs text-muted-foreground">{service.description}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => {
                                setDeleteTarget({ type: "service", id: service.id });
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vehicles Tab */}
            <TabsContent value="vehicles">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Tipe Kendaraan</CardTitle>
                  {services.length > 0 && (
                    <Button onClick={() => setVehicleDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Kendaraan
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Tambahkan layanan terlebih dahulu sebelum menambah kendaraan.</p>
                    </div>
                  ) : vehicles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Belum ada kendaraan. Tambahkan kendaraan baru.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {vehicles.map((vehicle) => (
                        <Card key={vehicle.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold">{vehicle.vehicle_type}</h4>
                                <p className="text-xs text-muted-foreground">
                                  Kapasitas: {vehicle.capacity} penumpang
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => {
                                  setDeleteTarget({ type: "vehicle", id: vehicle.id });
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            {vehicle.facilities && Array.isArray(vehicle.facilities) && (
                              <div>
                                <p className="text-xs font-semibold mb-1">Fasilitas:</p>
                                <div className="flex flex-wrap gap-1">
                                  {vehicle.facilities.map((f: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {f.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedules Tab */}
            <TabsContent value="schedules">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Jadwal Keberangkatan</CardTitle>
                  {vehicles.length > 0 && (
                    <Button onClick={() => setScheduleDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Jadwal
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {vehicles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Tambahkan kendaraan terlebih dahulu sebelum membuat jadwal.</p>
                    </div>
                  ) : schedules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Belum ada jadwal. Buat jadwal keberangkatan baru.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(schedulesByDate).map(([date, dateSchedules]) => (
                        <div key={date}>
                          <h4 className="font-semibold text-sm mb-2 text-primary">
                            {format(new Date(date), "EEEE, dd MMMM yyyy", { locale: idLocale })}
                          </h4>
                          <div className="space-y-2">
                            {dateSchedules.map((schedule) => (
                              <Card key={schedule.id} className="bg-slate-50">
                                <CardContent className="pt-3 pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div>
                                        <p className="font-semibold text-sm">
                                          {format(new Date(schedule.departure_time), "HH:mm")}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Berangkat</p>
                                      </div>
                                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                      <div>
                                        <p className="font-semibold text-sm">
                                          {format(new Date(schedule.arrival_time), "HH:mm")}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Tiba</p>
                                      </div>
                                    </div>
                                    <div className="text-right mr-2">
                                      <Badge variant="outline">{schedule.available_seats} Kursi</Badge>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive"
                                      onClick={() => {
                                        setDeleteTarget({ type: "schedule", id: schedule.id });
                                        setDeleteConfirmOpen(true);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing">
              <PricingRulesTab />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Components */}
      <AddRayonDialog
        routeId={selectedRoute}
        isOpen={rayonDialogOpen}
        onClose={() => setRayonDialogOpen(false)}
      />
      <AddServiceDialog
        routeId={selectedRoute}
        isOpen={serviceDialogOpen}
        onClose={() => setServiceDialogOpen(false)}
      />
      <AddVehicleDialog
        routeId={selectedRoute}
        serviceId={services[0]?.id || ""}
        isOpen={vehicleDialogOpen}
        onClose={() => setVehicleDialogOpen(false)}
      />
      <AddScheduleDialog
        routeId={selectedRoute}
        serviceId={services[0]?.id || ""}
        vehicleId={vehicles[0]?.id || ""}
        isOpen={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
      />
    </div>
  );
}


