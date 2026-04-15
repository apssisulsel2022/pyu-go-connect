import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Search,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  ChevronDown,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useMemo, lazy, Suspense, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Lazy load analytics to reduce initial bundle
const DriverEarningsAnalytics = lazy(() => 
  import("@/components/admin/DriverEarningsAnalytics").then(m => ({ default: m.DriverEarningsAnalytics }))
);
import { DriverActivityLog } from "@/components/admin/DriverActivityLog";
import { DriverVehicleManagement } from "@/components/admin/DriverVehicleManagement";

const statusStyle: Record<string, string> = {
  available: "text-green-600 border-green-300 bg-green-50",
  busy: "text-blue-600 border-blue-300 bg-blue-50",
  offline: "text-slate-600 border-slate-300 bg-slate-50",
  on_ride: "text-purple-600 border-purple-300 bg-purple-50",
};

const statusLabelMap: Record<string, string> = {
  available: "Tersedia",
  busy: "Sibuk",
  offline: "Offline",
  on_ride: "Dalam Perjalanan",
};

const registrationStatusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const registrationStatusLabel: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const ITEMS_PER_PAGE = 20;

// Memoized driver table row component to prevent re-renders
const DriverTableRow = memo(({ 
  driver, 
  statusStyle, 
  statusLabelMap, 
  registrationStatusStyle, 
  registrationStatusLabel,
  onViewDetails 
}: {
  driver: any;
  statusStyle: Record<string, string>;
  statusLabelMap: Record<string, string>;
  registrationStatusStyle: Record<string, string>;
  registrationStatusLabel: Record<string, string>;
  onViewDetails: (driver: any) => void;
}) => (
  <TableRow className="hover:bg-muted/50">
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
          {driver.avatar_url ? (
            <img
              src={driver.avatar_url}
              alt={driver.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
              {driver.full_name[0]}
            </div>
          )}
        </div>
        <div>
          <p className="font-medium text-sm">{driver.full_name}</p>
          <p className="text-xs text-muted-foreground">{driver.license_number || "SIM-"}</p>
        </div>
      </div>
    </TableCell>
    <TableCell>
      <div className="text-sm">
        <p>{driver.phone}</p>
        <p className="text-xs text-muted-foreground">{driver.email || "-"}</p>
      </div>
    </TableCell>
    <TableCell>
      <Badge variant="outline" className={`${statusStyle[driver.status] || ""}`}>
        {statusLabelMap[driver.status] || driver.status}
      </Badge>
    </TableCell>
    <TableCell>
      <Badge className={`${registrationStatusStyle[driver.registration_status || "pending"]}`}>
        {registrationStatusLabel[driver.registration_status || "pending"]}
      </Badge>
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-1">
        <span className="font-bold">⭐ {Number(driver.rating || 0).toFixed(1)}</span>
      </div>
    </TableCell>
    <TableCell>
      <span className="text-sm text-muted-foreground">
        {driver.vehicles?.length || 0} unit
      </span>
    </TableCell>
    <TableCell>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onViewDetails(driver)}
      >
        <Eye className="w-4 h-4" />
      </Button>
    </TableCell>
  </TableRow>
));

DriverTableRow.displayName = "DriverTableRow";

export default function AdminDrivers() {
  const queryClient = useQueryClient();
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRegistration, setFilterRegistration] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [detailTab, setDetailTab] = useState("overview");

  // Fetch drivers with related data
  const { data, isLoading } = useQuery({
    queryKey: ["admin-drivers", currentPage, searchTerm, filterStatus, filterRegistration, sortBy],
    queryFn: async () => {
      // PERFORMANCE FIX: Cursor-based pagination logic (simulated with range for SQL)
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Check Cache (Simulated Redis)
      const cacheKey = `drivers_${currentPage}_${searchTerm}_${filterStatus}_${filterRegistration}_${sortBy}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 60000) return parsed.data; // 1 min TTL
      }

      let query = supabase
        .from("drivers")
        .select(
          `id, full_name, phone, avatar_url, status, is_verified, rating, created_at, 
         registration_status, ktp_url, sim_url, vehicle_stnk_url, rejection_reason, 
         gender, email, license_number`,
          { count: "exact" }
        );

      // Apply optimized filters (using indexed fields)
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus as any);
      }

      if (filterRegistration !== "all") {
        query = query.eq("registration_status", filterRegistration as any);
      }

      if (searchTerm) {
        // Optimized ILIKE search
        query = query.or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .range(from, to)
        .order(sortBy === "name" ? "full_name" : sortBy, { ascending: sortBy === "name" });

      if (error) throw error;
      
      const result = { drivers: data || [], totalCount: count || 0 };
      
      // Save to Cache
      sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
      
      return result;
    },
    staleTime: 30000, // 30s client-side cache
  });

  const invalidateAdminCache = () => {
    // Clear session storage cache for drivers
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith("drivers_")) {
        sessionStorage.removeItem(key);
      }
    });
    queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    queryClient.invalidateQueries({ queryKey: ["driver-statistics"] });
  };

  const drivers = data?.drivers || [];
  const totalPages = Math.ceil((data?.totalCount || 0) / ITEMS_PER_PAGE);

  // Fetch drivers statistics
  const { data: stats } = useQuery({
    queryKey: ["driver-statistics"],
    queryFn: async () => {
      const [activeRes, pendingRes, totalRes] = await Promise.all([
        supabase.from("drivers").select("id", { count: "exact" }).eq("status", "available"),
        supabase.from("drivers").select("id", { count: "exact" }).eq("registration_status", "pending"),
        supabase.from("drivers").select("id", { count: "exact" }),
      ]);

      return {
        activeDrivers: activeRes.count || 0,
        pendingVerification: pendingRes.count || 0,
        totalDrivers: totalRes.count || 0,
      };
    },
  });

  // Mutation for verification
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "approved" | "rejected"; reason?: string }) => {
      const updateData: any = {
        registration_status: status,
        is_verified: status === "approved",
        updated_at: new Date().toISOString(),
      };
      if (reason) updateData.rejection_reason = reason;

      const { error } = await (supabase.from("drivers") as any).update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAdminCache();
      toast.success("Status verifikasi driver diperbarui");
      setSelectedDriver(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (err: any) => {
      toast.error("Gagal memperbarui verifikasi: " + err.message);
    },
  });

  // Mutation for suspension
  const suspendMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("drivers") as any)
        .update({ status: "offline", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAdminCache();
      toast.success("Driver berhasil dihentikan");
      setSelectedDriver(null);
    },
    onError: (err: any) => {
      toast.error("Gagal menghentikan driver: " + err.message);
    },
  });

  // Mutation for reactivation
  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("drivers") as any)
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAdminCache();
      toast.success("Driver berhasil diaktifkan kembali");
      setSelectedDriver(null);
    },
    onError: (err: any) => {
      toast.error("Gagal mengaktifkan driver: " + err.message);
    },
  });

  // Filtered and sorted drivers
  const filteredDrivers = useMemo(() => {
    return drivers;
  }, [drivers]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Total Driver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalDrivers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pengemudi terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" /> Driver Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.activeDrivers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Sedang tersedia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Menunggu Verifikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats?.pendingVerification || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendaftaran pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Rating Rata-rata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {filteredDrivers.length > 0
                ? (filteredDrivers.reduce((sum: number, d: any) => sum + (Number(d.rating) || 0), 0) / filteredDrivers.length).toFixed(1)
                : "0.0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dari pengemudi</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, nomor telepon, email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="available">Tersedia</SelectItem>
                <SelectItem value="busy">Sibuk</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="on_ride">Dalam Perjalanan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRegistration} onValueChange={(v) => { setFilterRegistration(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Status Verifikasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Verifikasi</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Paling Baru</SelectItem>
                <SelectItem value="rating">Rating Tertinggi</SelectItem>
                <SelectItem value="name">Nama A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Driver List Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Driver</CardTitle>
            <Button size="sm" className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-1" /> Tambah Driver
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !filteredDrivers.length ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Tidak ada driver ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Driver</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verifikasi</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver: any) => (
                    <DriverTableRow
                      key={driver.id}
                      driver={driver}
                      statusStyle={statusStyle}
                      statusLabelMap={statusLabelMap}
                      registrationStatusStyle={registrationStatusStyle}
                      registrationStatusLabel={registrationStatusLabel}
                      onViewDetails={(d) => {
                        setSelectedDriver(d);
                        setDetailTab("overview");
                      }}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Detail Dialog */}
      <Dialog open={!!selectedDriver} onOpenChange={(open) => !open && setSelectedDriver(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail & Verifikasi Driver</DialogTitle>
          </DialogHeader>

          {selectedDriver && (
            <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">Dokumen</TabsTrigger>
                <TabsTrigger value="vehicles">Kendaraan</TabsTrigger>
                <TabsTrigger value="earnings">Penghasilan</TabsTrigger>
                <TabsTrigger value="activity">Aktivitas</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 py-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200">
                      {selectedDriver.avatar_url ? (
                        <img
                          src={selectedDriver.avatar_url}
                          alt={selectedDriver.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-400">
                          {selectedDriver.full_name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{selectedDriver.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedDriver.phone}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className={`${registrationStatusStyle[selectedDriver.registration_status || "pending"]}`}>
                          {registrationStatusLabel[selectedDriver.registration_status || "pending"]}
                        </Badge>
                        <Badge variant="outline" className={`${statusStyle[selectedDriver.status] || ""}`}>
                          {statusLabelMap[selectedDriver.status] || selectedDriver.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Email" value={selectedDriver.email || "-"} />
                    <InfoField label="Nomor SIM" value={selectedDriver.license_number || "-"} />
                    <InfoField label="Gender" value={selectedDriver.gender || "-"} />
                    <InfoField label="Rating" value={`⭐ ${Number(selectedDriver.rating || 0).toFixed(1)}`} />
                    <InfoField label="Terdaftar" value={new Date(selectedDriver.created_at).toLocaleDateString("id-ID")} />
                    <InfoField label="Verifikasi" value={selectedDriver.is_verified ? "✓ Terverifikasi" : "✗ Belum Terverifikasi"} />
                  </div>

                  {selectedDriver.registration_status === "rejected" && selectedDriver.rejection_reason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-bold text-red-700 mb-1">ALASAN PENOLAKAN:</p>
                      <p className="text-sm text-red-700">{selectedDriver.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Verification Actions */}
                {selectedDriver.registration_status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
                      onClick={() =>
                        verifyMutation.mutate({
                          id: selectedDriver.id,
                          status: "approved",
                        })
                      }
                      disabled={verifyMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Setujui Pendaftaran
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 font-bold"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={verifyMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Tolak
                    </Button>
                  </div>
                )}

                {/* Suspension Actions */}
                {selectedDriver.registration_status === "approved" && (
                  <div className="flex gap-3 pt-4 border-t">
                    {selectedDriver.status === "offline" ? (
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold"
                        onClick={() => reactivateMutation.mutate(selectedDriver.id)}
                        disabled={reactivateMutation.isPending}
                      >
                        <Zap className="w-4 h-4 mr-2" /> Aktifkan Kembali
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        className="flex-1 font-bold"
                        onClick={() => suspendMutation.mutate(selectedDriver.id)}
                        disabled={suspendMutation.isPending}
                      >
                        <ShieldAlert className="w-4 h-4 mr-2" /> Hentikan Driver
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4 py-4">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dokumen Pendukung</p>
                  <div className="grid grid-cols-3 gap-4">
                    <DocumentPreview label="KTP" url={selectedDriver.ktp_url} />
                    <DocumentPreview label="SIM" url={selectedDriver.sim_url} />
                    <DocumentPreview label="STNK" url={selectedDriver.vehicle_stnk_url} />
                  </div>
                </div>
              </TabsContent>

              {/* Vehicles Tab */}
              <TabsContent value="vehicles" className="space-y-4 py-4">
                <DriverVehicleManagement driverId={selectedDriver.id} />
              </TabsContent>

              {/* Earnings Tab */}
              <TabsContent value="earnings" className="py-4">
                <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                  <DriverEarningsAnalytics driverId={selectedDriver.id} />
                </Suspense>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="py-4">
                <DriverActivityLog driverId={selectedDriver.id} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alasan Penolakan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Berikan alasan mengapa pendaftaran ditolak (misal: Foto SIM tidak terbaca)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRejectDialog(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                verifyMutation.mutate({
                  id: selectedDriver.id,
                  status: "rejected",
                  reason: rejectionReason,
                })
              }
              disabled={!rejectionReason || verifyMutation.isPending}
            >
              Kirim Penolakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Components
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}

function DocumentPreview({ label, url }: { label: string; url: string | null }) {
  if (!url)
    return (
      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
        <p className="text-xs text-slate-400">Belum diunggah</p>
      </div>
    );

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <div className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200">
        <img src={url} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" variant="secondary" className="h-7 text-[10px] rounded-lg" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <Eye className="w-3 h-3 mr-1" /> Lihat Full
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}