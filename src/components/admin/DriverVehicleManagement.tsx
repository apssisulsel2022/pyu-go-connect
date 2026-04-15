import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Edit2, Car } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface DriverVehicleManagementProps {
  driverId: string;
}

const vehicleTypeLabels: Record<string, string> = {
  car: "Mobil",
  motorcycle: "Motor",
  minicar: "Mini Car (4 Kursi)",
  suv: "SUV (7 Kursi)",
  hiace: "HiAce (10-14 Kursi)",
  truck: "Truk",
  van: "Van",
};

export function DriverVehicleManagement({ driverId }: DriverVehicleManagementProps) {
  const queryClient = useQueryClient();
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [formData, setFormData] = useState({
    plate_number: "",
    model: "",
    vehicle_type: "car",
    color: "",
    capacity: "4",
  });

  // Fetch vehicles
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["driver-vehicles", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Add/Update vehicle mutation
  const vehicleMutation = useMutation({
    mutationFn: async () => {
      if (editingVehicle) {
        // Update
        const { error } = await supabase
          .from("vehicles")
          .update({
            ...formData,
            capacity: parseInt(formData.capacity),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingVehicle.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from("vehicles").insert({
          driver_id: driverId,
          ...formData,
          capacity: parseInt(formData.capacity),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-vehicles", driverId] });
      toast.success(editingVehicle ? "Kendaraan diperbarui" : "Kendaraan ditambahkan");
      resetForm();
      setShowAddVehicle(false);
    },
    onError: (err: any) => {
      toast.error("Gagal: " + err.message);
    },
  });

  // Delete vehicle mutation
  const deleteMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-vehicles", driverId] });
      toast.success("Kendaraan dihapus");
    },
    onError: (err: any) => {
      toast.error("Gagal: " + err.message);
    },
  });

  const resetForm = () => {
    setFormData({
      plate_number: "",
      model: "",
      vehicle_type: "car",
      color: "",
      capacity: "4",
    });
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate_number: vehicle.plate_number,
      model: vehicle.model,
      vehicle_type: vehicle.vehicle_type,
      color: vehicle.color,
      capacity: vehicle.capacity.toString(),
    });
    setShowAddVehicle(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Manajemen Kendaraan</h3>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowAddVehicle(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Tambah Kendaraan
        </Button>
      </div>

      {!vehicles || vehicles.length === 0 ? (
        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center">
          <Car className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Belum ada kendaraan terdaftar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(vehicles as any[]).map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-sm">{vehicle.model || "Kendaraan"}</h4>
                      <Badge variant="outline" className="text-xs">
                        {vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Plat Nomor</p>
                        <p className="font-medium">{vehicle.plate_number}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Warna</p>
                        <p className="font-medium capitalize">{vehicle.color || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Kapasitas</p>
                        <p className="font-medium">{vehicle.capacity} kursi</p>
                      </div>
                      {vehicle.year && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Tahun</p>
                          <p className="font-medium">{vehicle.year}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(vehicle)}
                      disabled={vehicleMutation.isPending}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(vehicle.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Edit Kendaraan" : "Tambah Kendaraan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-2">
                Plat Nomor *
              </label>
              <Input
                placeholder="Contoh: B 1234 ABC"
                value={formData.plate_number}
                onChange={(e) =>
                  setFormData({ ...formData, plate_number: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-2">
                Model Kendaraan *
              </label>
              <Input
                placeholder="Contoh: Toyota Avanza"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-2">
                Tipe Kendaraan *
              </label>
              <Select
                value={formData.vehicle_type}
                onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Mobil (Car)</SelectItem>
                  <SelectItem value="motorcycle">Motor (Bike)</SelectItem>
                  <SelectItem value="minicar">Mini Car (Shuttle - 4 Kursi)</SelectItem>
                  <SelectItem value="suv">SUV (Shuttle - 7 Kursi)</SelectItem>
                  <SelectItem value="hiace">HiAce (Shuttle - 10-14 Kursi)</SelectItem>
                  <SelectItem value="truck">Truk</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-2">
                  Warna
                </label>
                <Input
                  placeholder="Contoh: Putih"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-2">
                  Kapasitas *
                </label>
                <Input
                  type="number"
                  placeholder="4"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  min="1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                resetForm();
                setShowAddVehicle(false);
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => vehicleMutation.mutate()}
              disabled={
                !formData.plate_number ||
                !formData.model ||
                !formData.capacity ||
                vehicleMutation.isPending
              }
            >
              {editingVehicle ? "Perbarui" : "Tambah"} Kendaraan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
