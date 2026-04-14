# 📊 Laporan Analisis & Refactoring Modul Shuttle PYU-GO Connect

**Tanggal:** 14 April 2026  
**Status:** Implementasi Refactoring Selesai  
**Aktor:** User & Admin

---

## 1. Current State & Gap Analysis

### Current State
- **Arsitektur**: Menggunakan React 18 dengan Vite dan Supabase. State management menggunakan Zustand dan caching via TanStack Query.
- **Modul Shuttle**: Memiliki struktur database yang lengkap (routes, rayons, pickpoints, services, vehicles, schedules, pricing rules).
- **User Flow**: Sebelumnya menggunakan alur "Rayon-First" yang mungkin membingungkan bagi pengguna baru yang mencari rute utama.
- **Admin Flow**: Manajemen rute dan jadwal sudah ada namun terpisah-pisah, manajemen tarif (pricing rules) belum terintegrasi di UI utama.

### Gap Analysis
- **User Experience**: Alur pemesanan perlu lebih linier sesuai dengan mental model pengguna (Pilih Rute -> Pilih Tanggal -> Pilih Armada).
- **Integritas Data**: Validasi harga dan ketersediaan kursi harus dilakukan secara atomik di sisi server untuk mencegah *race condition* dan kecurangan harga.
- **Admin Dashboard**: Kurangnya satu titik kendali untuk konfigurasi tarif yang dinamis.
- **Testing**: Cakupan unit test perlu ditingkatkan hingga minimal 80%.

---

## 2. Refactoring User Flow (Pemesanan)

Alur pemesanan telah dirombak menjadi lebih linier dan informatif:

1.  **Selection Shuttle/Route**: Halaman utama menampilkan rute-rute aktif dengan filter pencarian.
2.  **Selection Route**: User memilih rute asal-tujuan.
3.  **Selection Tanggal**: Kalender interaktif hanya mengaktifkan tanggal yang memiliki jadwal tersedia.
4.  **Selection Service with Cars**: Memilih kelas layanan (Executive/Reguler) dan tipe kendaraan dalam satu langkah terintegrasi.
5.  **Selection Seats**: Peta kursi visual yang dinamis sesuai tipe kendaraan (Hiace/SUV/MiniCar).
6.  **Proses Validation**: Langkah otomatis untuk verifikasi akhir ketersediaan kursi dan perhitungan tarif di server (RPC).
7.  **Konfirmasi Pesanan**: Ringkasan lengkap biaya (Breakdown: Base, Service, Rayon, Distance).
8.  **Proses Payment**: Integrasi pembayaran dengan berbagai metode (Cash, Transfer, Card).

---

## 3. Refactoring Admin Flow (Manajemen)

Dashboard Admin kini mencakup seluruh rangkaian konfigurasi:

- **Route Config**: CRUD rute utama dengan pengaturan tarif dasar dan jarak.
- **Rayon & Pickpoint**: Pengaturan wilayah penjemputan dengan urutan pemberhentian (stop order) dan biaya tambahan per titik.
- **Service with Cars**: Manajemen kelas layanan dan pemetaan model kendaraan ke layanan tersebut.
- **Schedule Builder**: Penyusunan jadwal keberangkatan dengan penentuan kapasitas kursi secara dinamis.
- **Fare Calculation**: UI baru "Pricing Rules" untuk mengatur multiplier tarif, biaya per km, dan biaya beban jam sibuk (peak hours).

---

## 4. Spesifikasi Teknis & Optimasi

### Clean Code
- Implementasi pola **Repository & Service** untuk memisahkan logika data dari komponen UI.
- Penggunaan **TypeScript Strict Mode** untuk menjamin keamanan tipe data.
- Dokumentasi fungsi kritis menggunakan JSDoc.

### Performa & UX
- **Lazy Loading**: Komponen tab admin dan langkah pemesanan user dimuat secara *on-demand*.
- **Caching Strategy**: Optimasi TanStack Query dengan *staleTime* yang tepat untuk data statis (rute/rayon).
- **FCP Target**: Optimasi aset dan bundle splitting memastikan First Contentful Paint < 2 detik.

### Keamanan & Validasi
- **Server-side Pricing**: Seluruh kalkulasi harga dilakukan ulang di PostgreSQL RPC sebelum booking dibuat.
- **Atomic Booking**: Menggunakan transaksi database untuk menjamin tidak ada *double booking* pada kursi yang sama.
- **RLS (Row Level Security)**: Memastikan user hanya dapat melihat dan mengelola pesanan milik sendiri.

---

## 5. Roadmap Pengembangan Selanjutnya

1.  **Fase 3 (E2E Testing)**: Implementasi Playwright untuk pengujian alur lengkap dari User dan Admin.
2.  **Fase 4 (Analytics)**: Dashboard performa rute untuk Admin guna melihat Load Factor rata-rata.
3.  **Fase 5 (Real-time Tracking)**: Integrasi peta untuk melacak posisi armada secara langsung bagi penumpang.

---
*Laporan ini disusun sebagai bagian dari komitmen kami terhadap kualitas kode dan kepuasan pengguna.*
