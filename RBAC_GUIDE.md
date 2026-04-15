# Role-Based Access Control (RBAC) Guide - PYU-GO Connect

Sistem RBAC di aplikasi ini dirancang untuk mengelola hak akses pengguna berdasarkan peran (**Roles**) dan izin spesifik (**Permissions**).

## 1. Struktur Data
Seluruh definisi roles dan permissions berada di [rbac.ts](file:///d:/PYU-GO/pyu-go-connect/src/lib/rbac.ts).

### Roles yang Tersedia:
- `admin`: Memiliki akses penuh ke seluruh sistem, termasuk manajemen pengguna, driver, pengaturan, dan laporan keuangan.
- `driver` (sebelumnya `moderator`): Dapat mengelola status driver, menerima order, dan melihat dompet.
- `user`: Penumpang reguler yang dapat memesan perjalanan, shuttle, dan mengelola profil mereka sendiri.

### Permissions:
Permissions menggunakan format `resource:action` (contoh: `ride:create`).

## 2. Cara Menambahkan Role Baru
1. Tambahkan nama role baru ke type `Role` di `rbac.ts`.
2. Definisikan daftar permissions untuk role tersebut di objek `ROLE_PERMISSIONS`.
3. Tambahkan logika penugasan role di backend atau saat proses pendaftaran di `useAuth.ts`.

## 3. Cara Membatasi Akses di Komponen UI
Gunakan komponen `<Can />` atau hook `useRBAC()`.

### Menggunakan Komponen `<Can />`:
```tsx
import { Can } from "@/hooks/useRBAC";

<Can perform="admin:user:manage">
  <Button>Hapus Pengguna</Button>
</Can>
```

### Menggunakan Hook `useRBAC()`:
```tsx
import { useRBAC } from "@/hooks/useRBAC";

const { checkPermission } = useRBAC();

if (checkPermission("ride:delete")) {
  // Tampilkan tombol hapus
}
```

## 4. Membatasi Akses Rute (Routing)
Gunakan komponen `<ProtectedRoute />` di `App.tsx`.

### Berdasarkan Role:
```tsx
<Route element={<ProtectedRoute requiredRole="admin" />}>
  <Route path="/admin" element={<AdminDashboard />} />
</Route>
```

### Berdasarkan Permission:
```tsx
<Route element={<ProtectedRoute requiredPermission="admin:settings:manage" />}>
  <Route path="/settings" element={<SettingsPage />} />
</Route>
```

## 5. Penanganan Akses Ditolak
Jika pengguna mencoba mengakses rute yang tidak diizinkan, mereka akan otomatis diarahkan ke halaman `/forbidden` (403 Forbidden).

---
*Catatan: Pastikan sinkronisasi antara tabel `user_roles` di Supabase dengan definisi di frontend tetap terjaga.*
