import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Vehicle } from "@/repositories/DriverProfileRepository";
import { DriverProfileService } from "@/services/DriverProfileService";
import { Trash2, Edit2, Plus, Upload } from "lucide-react";

interface DriverVehiclesTabProps {
  vehicles: Vehicle[];
  driverId: string;
}

/**
 * Driver Vehicles Tab Component
 * Manages vehicles list, add/edit operations, and document uploads
 */
export default function DriverVehiclesTab({
  vehicles,
  driverId,
}: DriverVehiclesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const form = useForm({
    defaultValues: {
      plate_number: "",
      vehicle_type: "car",
      model: "",
      color: "",
      capacity: 4,
      year: new Date().getFullYear(),
    },
  });

  const editForm = useForm({
    defaultValues: selectedVehicle || {
      plate_number: "",
      vehicle_type: "car",
      model: "",
      color: "",
      capacity: 4,
      year: new Date().getFullYear(),
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data: any) =>
      DriverProfileService.createVehicle(driverId, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Vehicle added" });
      queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
      form.reset();
      setShowAddForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add vehicle",
        variant: "destructive",
      });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: (data: any) =>
      DriverProfileService.updateVehicle(selectedVehicle!.id, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Vehicle updated" });
      queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
      setSelectedVehicle(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) =>
      DriverProfileService.deleteVehicle(vehicleId),
    onSuccess: () => {
      toast({ title: "Success", description: "Vehicle deleted" });
      queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
      setSelectedVehicle(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      });
    },
  });

  const vehicleImageMutation = useMutation({
    mutationFn: (file: File) =>
      DriverProfileService.uploadVehicleImage(selectedVehicle!.id, file),
    onSuccess: () => {
      toast({ title: "Success", description: "Image uploaded" });
      queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload",
        variant: "destructive",
      });
    },
  });

  const onAddSubmit = (data: any) => {
    createVehicleMutation.mutate(data);
  };

  const onEditSubmit = (data: any) => {
    updateVehicleMutation.mutate(data);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedVehicle) {
      vehicleImageMutation.mutate(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Vehicle Button */}
      {!showAddForm && !selectedVehicle && (
        <Button className="gap-2" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4" /> Add Vehicle
        </Button>
      )}

      {/* Add Vehicle Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plate Number */}
                <div>
                  <Label>Plate Number</Label>
                  <Input
                    {...form.register("plate_number", { required: true })}
                    placeholder="B XXXX XXX"
                    className="mt-1"
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <Label>Vehicle Type</Label>
                  <Select
                    value={form.watch("vehicle_type")}
                    onValueChange={(value) =>
                      form.setValue("vehicle_type", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car (Mobil)</SelectItem>
                      <SelectItem value="motorcycle">Motorcycle (Bike)</SelectItem>
                      <SelectItem value="minicar">Mini Car (Shuttle - 4 Seats)</SelectItem>
                      <SelectItem value="suv">SUV (Shuttle - 7 Seats)</SelectItem>
                      <SelectItem value="hiace">HiAce (Shuttle - 10-14 Seats)</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Model */}
                <div>
                  <Label>Model</Label>
                  <Input
                    {...form.register("model", { required: true })}
                    className="mt-1"
                  />
                </div>

                {/* Color */}
                <div>
                  <Label>Color</Label>
                  <Input
                    {...form.register("color", { required: true })}
                    className="mt-1"
                  />
                </div>

                {/* Capacity */}
                <div>
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    {...form.register("capacity", { required: true })}
                    className="mt-1"
                  />
                </div>

                {/* Year */}
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    {...form.register("year", { required: true })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createVehicleMutation.isPending}>
                  Add Vehicle
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Vehicle Form */}
      {selectedVehicle && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Edit Vehicle</CardTitle>
                <CardDescription>{selectedVehicle.plate_number}</CardDescription>
              </div>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteVehicleMutation.mutate(selectedVehicle.id)}
                  disabled={deleteVehicleMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Vehicle Image */}
            {selectedVehicle.image_url && (
              <div className="mb-4">
                <img
                  src={selectedVehicle.image_url}
                  alt={selectedVehicle.plate_number}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Upload Image */}
            <div>
              <Label htmlFor="vehicle-image">Vehicle Image</Label>
              <div className="mt-2">
                <input
                  id="vehicle-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Label htmlFor="vehicle-image" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 w-fit">
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </div>
                </Label>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Plate Number */}
                <div>
                  <Label>Plate Number</Label>
                  <Input
                    {...editForm.register("plate_number")}
                    className="mt-1"
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <Label>Vehicle Type</Label>
                  <Select
                    value={editForm.watch("vehicle_type")}
                    onValueChange={(value) =>
                      editForm.setValue("vehicle_type", value)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car (Mobil)</SelectItem>
                      <SelectItem value="motorcycle">Motorcycle (Bike)</SelectItem>
                      <SelectItem value="minicar">Mini Car (Shuttle - 4 Seats)</SelectItem>
                      <SelectItem value="suv">SUV (Shuttle - 7 Seats)</SelectItem>
                      <SelectItem value="hiace">HiAce (Shuttle - 10-14 Seats)</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Model */}
                <div>
                  <Label>Model</Label>
                  <Input
                    {...editForm.register("model")}
                    className="mt-1"
                  />
                </div>

                {/* Color */}
                <div>
                  <Label>Color</Label>
                  <Input
                    {...editForm.register("color")}
                    className="mt-1"
                  />
                </div>

                {/* Capacity */}
                <div>
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    {...editForm.register("capacity")}
                    className="mt-1"
                  />
                </div>

                {/* Year */}
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    {...editForm.register("year")}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedVehicle(null);
                    editForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateVehicleMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Vehicles List */}
      <div className="space-y-3">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  {vehicle.image_url && (
                    <img
                      src={vehicle.image_url}
                      alt={vehicle.plate_number}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{vehicle.plate_number}</h3>
                      {vehicle.is_verified && (
                        <Badge variant="outline" className="bg-green-50">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.model} - {vehicle.color} | {vehicle.year}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Type: {vehicle.vehicle_type} | Capacity: {vehicle.capacity}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedVehicle(vehicle);
                    editForm.reset(vehicle);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {vehicles.length === 0 && !showAddForm && !selectedVehicle && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No vehicles added yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
