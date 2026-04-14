import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, AlertCircle, Loader2, Search } from "lucide-react";
import { format } from "date-fns";

interface PickupSelectorProps {
  rayons: any[] | undefined;
  selectedRoute: any;
  selectedScheduleDeparture: string;
  onSelectPickupPoint: (rayon: any, point: any) => void;
  onBack: () => void;
}

export function PickupSelector({
  rayons,
  selectedRoute,
  selectedScheduleDeparture,
  onSelectPickupPoint,
  onBack
}: PickupSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!rayons) {
    return (
      <div className="space-y-3">
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Memuat titik jemput...</span>
          </CardContent>
        </Card>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Kembali
        </Button>
      </div>
    );
  }

  if (rayons.length === 0) {
    return (
      <div className="space-y-3">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-amber-900">Tidak ada titik jemput tersedia</p>
              <p className="text-xs text-amber-700 mt-1">Silakan pilih jadwal lain atau hubungi layanan pelanggan</p>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Kembali
        </Button>
      </div>
    );
  }

  // Filter only pickup-type points
  const pickupRayons = rayons.map(r => ({
    ...r,
    pickup_points: (r.pickup_points || []).filter((p: any) => !p.point_type || p.point_type === 'pickup')
  })).filter(r => r.pickup_points.length > 0);

  if (pickupRayons.length === 0) {
    return (
      <div className="space-y-3">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-amber-900">Tidak ada titik jemput tersedia</p>
              <p className="text-xs text-amber-700 mt-1">Silakan pilih jadwal lain atau hubungi layanan pelanggan</p>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" className="w-full" onClick={onBack}>Kembali</Button>
      </div>
    );
  }

  // Filter by search query
  const query = searchQuery.trim().toLowerCase();
  const filteredRayons = query
    ? pickupRayons.map(r => ({
        ...r,
        pickup_points: r.pickup_points.filter((p: any) =>
          p.name?.toLowerCase().includes(query) || r.name?.toLowerCase().includes(query)
        )
      })).filter(r => r.pickup_points.length > 0)
    : pickupRayons;

  const totalPoints = filteredRayons.reduce((sum, r) => sum + r.pickup_points.length, 0);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Pilih Titik Jemput
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {selectedRoute?.name}
            {selectedScheduleDeparture && (
              <>
                {" • "}
                {format(new Date(selectedScheduleDeparture), "dd MMM yyyy, HH:mm")}
              </>
            )}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari titik jemput..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {query && (
            <p className="text-xs text-muted-foreground mt-2">
              {totalPoints > 0
                ? `${totalPoints} titik jemput ditemukan`
                : "Tidak ditemukan titik jemput dengan kata kunci tersebut"}
            </p>
          )}
        </CardContent>
      </Card>

      {filteredRayons.length === 0 && query && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ditemukan titik jemput untuk "{searchQuery}"</p>
          </CardContent>
        </Card>
      )}

      {filteredRayons.map((rayon) => (
        <div key={rayon.id} className="space-y-2">
          <div className="px-1">
            <h3 className="text-sm font-bold text-slate-600">{rayon.name}</h3>
            {rayon.description && <p className="text-xs text-muted-foreground">{rayon.description}</p>}
          </div>
          <div className="space-y-1">
            {rayon.pickup_points.map((p: any) => (
              <button 
                key={p.id} 
                onClick={() => onSelectPickupPoint(rayon, p)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-accent/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg min-w-fit">
                    J{p.stop_order}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.departure_time ? `${p.departure_time} WIB` : ""}
                      {p.departure_time && p.distance_meters > 0 ? " • " : ""}
                      {p.distance_meters > 0
                        ? p.distance_meters >= 1000 
                          ? `${(p.distance_meters / 1000).toFixed(1)} km` 
                          : `${p.distance_meters}m`
                        : ""}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-sm text-primary whitespace-nowrap ml-2">
                  Rp {Number(p.fare || 0).toLocaleString("id-ID")}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      
      <Button variant="outline" className="w-full" onClick={onBack}>
        Kembali
      </Button>
    </div>
  );
}