import { lazy, Suspense, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SplashScreen } from "@/components/ui/SplashScreen";

import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";

// Lazy-loaded pages
const Shuttle = lazy(() => import("./pages/ShuttleRefactored"));
const Profile = lazy(() => import("./pages/Profile"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Hotel = lazy(() => import("./pages/Hotel"));
const HotelDetail = lazy(() => import("./pages/HotelDetail"));
const Ride = lazy(() => import("./pages/Ride"));
const Forbidden = lazy(() => import("./pages/Forbidden"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminRides = lazy(() => import("./pages/admin/AdminRides"));
const AdminShuttles = lazy(() => import("./pages/admin/AdminShuttles"));
const AdminDrivers = lazy(() => import("./pages/admin/AdminDrivers"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const EmailSettings = lazy(() => import("./pages/admin/EmailSettings"));
const EmailTemplateEditor = lazy(() => import("./pages/admin/EmailTemplateEditor"));
const EmailWebhookTracking = lazy(() => import("./pages/admin/EmailWebhookTracking"));
const AdminHotels = lazy(() => import("./pages/admin/AdminHotels"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));

// Driver pages
const DriverLayout = lazy(() => import("./pages/driver/DriverLayout"));
const DriverDashboard = lazy(() => import("./pages/driver/DriverDashboard"));
const DriverActiveRide = lazy(() => import("./pages/driver/DriverActiveRide"));
const DriverShuttle = lazy(() => import("./pages/driver/DriverShuttle"));
const DriverEarnings = lazy(() => import("./pages/driver/DriverEarnings"));
const DriverWallet = lazy(() => import("./pages/driver/DriverWallet"));
const DriverHistory = lazy(() => import("./pages/driver/DriverHistory"));
const DriverProfile = lazy(() => import("./pages/driver/DriverProfile"));
const DriverAuth = lazy(() => import("./pages/driver/DriverAuth"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return <PageSkeleton />;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/ride" element={<Ride />} />
                <Route path="/shuttle" element={<Shuttle />} />
                <Route path="/hotel" element={<Hotel />} />
                <Route path="/hotel/:id" element={<HotelDetail />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>

              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/driver/auth" element={<DriverAuth />} />
              <Route path="/forbidden" element={<Forbidden />} />

              <Route element={<ProtectedRoute requiredRole="driver" />}>
                <Route path="/driver" element={<DriverLayout />}>
                  <Route index element={<DriverDashboard />} />
                  <Route path="ride" element={<DriverActiveRide />} />
                  <Route path="shuttle" element={<DriverShuttle />} />
                  <Route path="earnings" element={<DriverEarnings />} />
                  <Route path="wallet" element={<DriverWallet />} />
                  <Route path="history" element={<DriverHistory />} />
                  <Route path="profile" element={<DriverProfile />} />
                </Route>
              </Route>

              {/* Backward compatibility for moderator role */}
              <Route element={<ProtectedRoute requiredRole="moderator" />}>
                <Route path="/driver-legacy" element={<DriverLayout />}>
                  <Route index element={<DriverDashboard />} />
                  <Route path="profile" element={<DriverProfile />} />
                </Route>
              </Route>

              <Route path="admin" element={<ProtectedRoute requiredRole="admin" />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<AdminOverview />} />
                  <Route path="rides" element={<AdminRides />} />
                  <Route path="shuttles" element={<AdminShuttles />} />
                  <Route path="hotels" element={<AdminHotels />} />
                  <Route path="drivers" element={<AdminDrivers />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="withdrawals" element={<AdminWithdrawals />} />
                  <Route path="email-settings" element={<EmailSettings />} />
                  <Route path="email-templates" element={<EmailTemplateEditor />} />
                  <Route path="email-webhook-tracking" element={<EmailWebhookTracking />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
