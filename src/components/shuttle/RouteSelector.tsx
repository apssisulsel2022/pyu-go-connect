import { Bus, MapPin, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface RouteSelectorProps {
  routes: any[] | undefined;
  isLoading: boolean;
  onSelectRoute: (routeId: string) => void;
}

export function RouteSelector({ routes, isLoading, onSelectRoute }: RouteSelectorProps) {
  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!routes || routes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Bus className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Belum ada rute shuttle tersedia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {routes.map((route) => (
        <Card 
          key={route.id} 
          className="overflow-hidden cursor-pointer hover:border-primary transition-colors" 
          onClick={() => onSelectRoute(route.id)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bus className="w-5 h-5 text-secondary" />{route.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />{route.origin} → {route.destination}
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{(route.shuttle_schedules?.length || 0)} jadwal tersedia</span>
            <span className="font-bold text-sm text-primary">Rp {route.base_fare?.toLocaleString("id-ID")}/kursi</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
