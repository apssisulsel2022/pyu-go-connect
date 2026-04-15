# PyU Go Connect - Comprehensive Codebase Structure Overview

**Project Type:** Multi-platform Ridesharing Application  
**Tech Stack:** Vite + React + TypeScript (Web), Flutter (Mobile), PostgreSQL/Supabase (Backend)  
**Current Date:** April 15, 2026

---

## 1. PROJECT STRUCTURE - ROOT LEVEL

```
pyu-go-connect/
├── src/                          # Main web application (Vite + React + TS)
├── supabase/                     # Database, migrations, and serverless functions
├── driver_app/                   # Driver mobile app (Flutter)
├── users_app/                    # User mobile app (Flutter)
├── public/                       # Static assets
├── dist/                         # Build output
├── node_modules/                 # Dependencies
├── Configuration files           # Vite, TypeScript, ESLint, PostCSS, Tailwind
└── Documentation files           # ~40+ analysis and guide documents
```

### Root Level Files
- **package.json** - Main dependencies and scripts (Vite, React, Supabase, Radix UI)
- **vite.config.ts** - Vite build configuration with SWC optimization
- **tsconfig.json** - TypeScript configuration with path aliases (`@/*`)
- **.env** - Environment variables (Supabase URL, publishable key, Midtrans config)
- **tailwind.config.ts** - Tailwind CSS configuration
- **postcss.config.js** - PostCSS configuration
- **components.json** - shadcn/ui components configuration
- **vitest.config.ts** - Testing framework configuration
- **eslint.config.js** - Code linting rules

---

## 2. WEB APPLICATION SOURCE CODE STRUCTURE (`/src/`)

### 2.1 Main Application Files
```
src/
├── App.tsx                       # Main application router and setup
├── main.tsx                      # React entry point
├── App.css                       # Global styles
├── index.css                     # Base styles
├── vite-env.d.ts                # Vite TypeScript types
```

### 2.2 Directory Organization

#### **2.2.1 `/src/components/` - Reusable UI Components (13+ feature folders)**

```
components/
├── admin/                        # Admin dashboard components
│   ├── AdminPagination.tsx       # Pagination for tables
│   ├── DriverActivityLog.tsx     # Driver activity tracking
│   ├── DriverEarningsAnalytics.tsx
│   ├── DriverVehicleManagement.tsx
│   └── shuttle/                  # Shuttle management components
│
├── auth/                         # Authentication components
│   ├── SessionInitializer.tsx    # Session setup
│   ├── SessionManager.tsx        # Session lifecycle management
│   ├── SessionRecoveryDialog.tsx # Session recovery UI
│   └── SessionWarningDialog.tsx  # Session warning alerts
│
├── driver/                       # Driver-specific UI
│   └── profile/                  # Driver profile components
│       ├── BasicInfoForm.tsx     # Profile form
│       ├── DocumentVerification.tsx
│       ├── ProfilePhoto.tsx
│       ├── SecuritySettings.tsx
│       ├── ServiceSettings.tsx
│       └── VehicleInfo.tsx
│
├── home/                         # Home page components
│   ├── AdsBanner.tsx
│   ├── PromoCard.tsx
│   ├── PromoCard.test.tsx
│   ├── PromoSection.tsx
│   └── PromoSection.test.tsx
│
├── hotel/                        # Hotel booking components
│   ├── BookingDialog.tsx
│   ├── HotelCard.tsx
│   └── RoomCard.tsx
│
├── layout/                       # Layout wrappers
│   ├── AppLayout.tsx             # Main app layout wrapper
│   ├── BottomNav.tsx             # Bottom navigation
│   ├── ProtectedRoute.tsx        # Auth-protected routes
│   └── SessionRecoveryWrapper.tsx # Session management wrapper
│
├── map/                          # Map components
│   └── MapView.tsx               # Interactive map display
│
├── ride/                         # Ride booking components
│   ├── LocationSearchInput.tsx
│   ├── RideRatingDialog.tsx      # Post-ride rating
│   ├── RideStatusOverlay.tsx     # Ride status display
│   └── ServiceSelector.tsx       # Service type selection
│
├── shuttle/                      # Shuttle booking system (16 components)
│   ├── BookingSummary.tsx
│   ├── DateSelector.tsx
│   ├── GuestInfoForm.tsx
│   ├── PaymentForm.tsx
│   ├── PickupPointSelector.tsx
│   ├── PickupSelector.tsx
│   ├── PriceBreakdown.tsx
│   ├── RayonSelector.tsx
│   ├── RouteSelector.tsx
│   ├── ScheduleSelector.tsx
│   ├── SeatLayout.tsx
│   ├── SeatSelector.tsx
│   ├── ServiceTypeSelector.tsx
│   ├── ServiceVehicleSelector.tsx
│   ├── ShuttleTicket.tsx
│   └── VehicleTypeSelector.tsx
│
├── wallet/                       # Wallet/payment components
│   ├── TopUpDialog.tsx
│   └── TransactionList.tsx
│
├── ui/                           # shadcn/ui components (45+ files)
│   ├── accordion.tsx
│   ├── alert-dialog.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── drawer.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   ├── page-skeleton.tsx
│   ├── SplashScreen.tsx
│   └── [40+ more UI primitives]
│
├── GuestAccessCard.tsx           # Guest access UI
└── NavLink.tsx                   # Navigation link component
```

**Component Count:** ~90+ reusable components

---

#### **2.2.2 `/src/pages/` - Page-Level Components (18+ pages)**

```
pages/
├── admin/                        # Admin panel pages (13 pages)
│   ├── AdminLayout.tsx           # Admin layout wrapper
│   ├── AdminOverview.tsx         # Dashboard overview
│   ├── AdminRides.tsx            # Ride management
│   ├── AdminShuttles.tsx         # Shuttle management
│   ├── AdminDrivers.tsx          # Driver management
│   ├── AdminUsers.tsx            # User management
│   ├── AdminPayments.tsx         # Payment tracking
│   ├── AdminSettings.tsx         # System settings
│   ├── AdminHotels.tsx           # Hotel management
│   ├── AdminWithdrawals.tsx      # Withdrawal requests
│   ├── EmailSettings.tsx         # Email configuration
│   ├── EmailTemplateEditor.tsx   # Email template management
│   └── EmailWebhookTracking.tsx  # Webhook tracking
│
├── driver/                       # Driver pages (8 pages)
│   ├── DriverLayout.tsx          # Driver panel layout
│   ├── DriverDashboard.tsx       # Driver overview
│   ├── DriverActiveRide.tsx      # Current ride display
│   ├── DriverShuttle.tsx         # Shuttle operations
│   ├── DriverEarnings.tsx        # Earnings analytics
│   ├── DriverWallet.tsx          # Wallet management
│   ├── DriverHistory.tsx         # Trip history
│   ├── DriverProfile.tsx         # Profile management
│   └── DriverAuth.tsx            # Driver authentication
│
├── user/                         # User pages
│   ├── UserProfile.tsx           # User profile
│   └── tabs/                     # Profile sub-tabs
│
├── Auth.tsx                      # User authentication
├── Index.tsx                     # Home page
├── Profile.tsx                   # User profile page
├── Wallet.tsx                    # Wallet page
├── Ride.tsx                      # Ride booking page
├── Shuttle.tsx                   # Shuttle booking (old)
├── ShuttleRefactored.tsx         # Shuttle booking (refactored)
├── Hotel.tsx                     # Hotel booking
├── HotelDetail.tsx               # Hotel detail view
├── ForgotPassword.tsx            # Password reset request
├── ResetPassword.tsx             # Password reset form
├── VerifyEmail.tsx               # Email verification
├── Forbidden.tsx                 # 403 error page
└── NotFound.tsx                  # 404 error page
```

**Page Count:** 25+ pages

---

#### **2.2.3 `/src/services/` - Business Logic & API Layer (6 services)**

```
services/
├── DriverAdminService.ts         # Admin driver operations
│   - Driver CRUD operations
│   - Activity logging
│   - Analytics queries
│
├── DriverProfileService.ts       # Driver profile management
│   - Profile updates
│   - Document verification
│   - Vehicle management
│
├── SessionManagementService.ts   # Session lifecycle
│   - Session creation/renewal
│   - Expiration handling
│   - Recovery mechanisms
│
├── ShuttleService.ts             # Shuttle operations
│   - Booking management
│   - Seat allocation
│   - Schedule management
│
├── ShuttleService.test.ts        # Shuttle service tests
│
└── UserProfileService.ts         # User profile operations
    - Profile CRUD
    - Settings management
```

**Service Count:** 6 main services

---

#### **2.2.4 `/src/repositories/` - Data Access Layer (2 repositories)**

```
repositories/
├── DriverProfileRepository.ts    # Driver data access
│   - Fetch driver profiles
│   - Update driver info
│   - Query driver statistics
│
└── UserProfileRepository.ts      # User data access
    - Fetch user profiles
    - Update user info
    - Query user history
```

**Repository Count:** 2 repositories (pattern-based, primarily Supabase queries)

---

#### **2.2.5 `/src/hooks/` - React Hooks (9 custom hooks)**

```
hooks/
├── use-mobile.tsx                # Mobile device detection
├── use-toast.ts                  # Toast notifications
├── useAuth.ts                    # Authentication state
│   - Session management
│   - User roles/permissions
│   - Login/logout logic
│
├── useDriverLocation.ts          # Driver location tracking
│   - GPS polling
│   - Location updates
│
├── useDriverTracking.ts          # Real-time driver tracking
│   - Position streaming
│   - Realtime subscriptions
│
├── useIncomingRide.ts            # Incoming ride notifications
│   - Ride requests
│   - Acceptance logic
│
├── useRBAC.tsx                   # Role-Based Access Control
│   - Permission checking
│   - Role validation
│
├── useSessionManager.ts          # Session management hook
│   - Expiration detection
│   - Refresh logic
│   - Recovery handling
│
└── useShuttleBooking.ts          # Shuttle booking state
    - Booking flow
    - Seat selection
    - Payment processing
```

**Hook Count:** 9 custom hooks

---

#### **2.2.6 `/src/stores/` - State Management (3 stores)**

```
stores/
├── authStore.ts                  # Authentication state (Zustand/TanStack Query)
│   - Current user
│   - Auth status
│   - User roles
│
├── driverStore.ts                # Driver state
│   - Current location
│   - Active ride
│   - Availability status
│
└── rideStore.ts                  # Ride state
    - Booking details
    - Ride status
    - Payment info
```

**Store Count:** 3 Zustand/TanStack Query stores

---

#### **2.2.7 `/src/lib/` - Utilities & Helpers (5 utilities)**

```
lib/
├── ab-test.ts                    # A/B testing utilities
│   - Experiment variants
│   - User segmentation
│
├── fareCalculation.ts            # Fare calculation logic
│   - Base fare + distance
│   - Surge pricing
│   - Discounts/promos
│
├── i18n.ts                       # Internationalization
│   - Translation management
│
├── location.ts                   # Location utilities
│   - Geocoding
│   - Distance calculation
│   - Zone detection
│
├── rbac.ts                       # RBAC utilities
│   - Permission checking
│   - Role validation
│
└── utils.ts                      # General utilities
    - Formatting helpers
    - Validation functions
```

**Utility Count:** 5+ utilities

---

#### **2.2.8 `/src/utils/` - Standalone Utilities (3 files)**

```
utils/
├── otp.ts                        # OTP generation/validation
├── PriceCalculator.ts            # Price calculation engine
├── PriceCalculator.test.ts       # Price calculation tests
```

---

#### **2.2.9 `/src/integrations/` - External Integrations**

```
integrations/
└── supabase/
    ├── client.ts                 # Supabase client initialization
    │   - PKCE authentication flow
    │   - Custom storage adapter
    │   - Auto-refresh tokens
    │
    └── types.ts                  # Auto-generated TypeScript types
        - Database schema types
        - Row/Insert/Update types
        - Relationships
```

---

#### **2.2.10 `/src/test/` & `/src/tests/` - Testing**

```
test/
├── setup.ts                      # Test configuration
└── example.test.ts               # Example tests

tests/
├── AuthRBAC.test.tsx             # RBAC testing
└── SplashScreen.test.tsx         # Splash screen testing
```

**Test Files:** 4 files (Vitest)

---

### 2.3 Application Routing Structure (`App.tsx`)

#### Public Routes
```
GET /                             # Home page
GET /ride                         # Ride booking
GET /shuttle                      # Shuttle booking
GET /hotel                        # Hotel listing
GET /hotel/:id                    # Hotel detail
GET /auth                         # Authentication
GET /forgot-password              # Password recovery
GET /verify-email                 # Email verification
GET /reset-password               # Password reset
```

#### Protected Routes (Authenticated Users)
```
GET /wallet                       # Wallet & payments
GET /profile                      # User profile
```

#### Driver Routes (Requires moderator role)
```
GET /driver/auth                  # Driver authentication
GET /driver                       # Driver dashboard
GET /driver/ride                  # Active ride management
GET /driver/shuttle               # Shuttle operations
GET /driver/earnings              # Earnings analytics
GET /driver/wallet                # Driver wallet
GET /driver/history               # Trip history
GET /driver/profile               # Driver profile
```

#### Admin Routes (Requires admin role)
```
GET /admin                        # Admin dashboard
GET /admin/rides                  # Ride management
GET /admin/shuttles               # Shuttle management
GET /admin/drivers                # Driver management
GET /admin/users                  # User management
GET /admin/hotels                 # Hotel management
GET /admin/payments               # Payment tracking
GET /admin/withdrawals            # Withdrawal requests
GET /admin/email-settings         # Email configuration
GET /admin/email-templates        # Template editor
GET /admin/email-webhook-tracking # Webhook tracking
GET /admin/settings               # System settings
```

#### Error Routes
```
GET /forbidden                    # 403 error
GET /*                            # 404 error
```

---

## 3. DATABASE & BACKEND STRUCTURE (`/supabase/`)

### 3.1 Database Schema Overview

#### Core Tables (40+ tables total)
```
supabase/migrations/
├── Users & Auth
│   ├── auth.users               # Built-in Supabase auth
│   ├── profiles                 # User profiles
│   └── user_settings            # User preferences
│
├── Drivers
│   ├── drivers                  # Driver accounts
│   ├── driver_profiles          # Detailed driver info
│   ├── driver_documents         # License, insurance, etc.
│   ├── driver_verification      # Verification status
│   ├── driver_earnings          # Earnings tracking
│   └── driver_settings          # Driver preferences
│
├── Vehicles
│   ├── vehicles                 # Vehicle registry
│   ├── vehicle_documents        # Registration, insurance
│   ├── service_vehicle_types    # Service type mapping
│   └── vehicle_types            # Car, bike, etc.
│
├── Rides
│   ├── rides                    # Individual rides
│   ├── ride_history             # Archived rides
│   └── ride_ratings             # User & driver ratings
│
├── Shuttles (Schedule-based service)
│   ├── shuttles                 # Shuttle vehicles
│   ├── shuttle_routes           # Pre-defined routes
│   ├── shuttle_schedules        # Service schedules
│   ├── shuttle_bookings         # Passenger bookings
│   ├── shuttle_seats            # Seat inventory
│   ├── shuttle_rayons           # Service areas/zones
│   ├── shuttle_pickup_points    # Pickup locations
│   └── shuttle_services         # Service configurations
│
├── Payments & Wallets
│   ├── wallets                  # User wallet balances
│   ├── transactions             # Payment transactions
│   ├── withdrawals              # Cash-out requests
│   ├── payment_gateways         # Payment provider configs
│   └── pricing_rules            # Dynamic pricing
│
├── Hotels (Partner hotels)
│   ├── hotels                   # Hotel listings
│   ├── hotel_rooms              # Room inventory
│   └── hotel_bookings           # Room reservations
│
├── Communication
│   ├── email_templates          # Email designs
│   ├── email_logs               # Sent emails history
│   ├── sms_logs                 # SMS history
│   └── notifications            # User notifications
│
├── Admin & Settings
│   ├── app_settings             # Global settings
│   ├── admin_audit_logs         # Admin actions
│   ├── session_management       # Session tracking
│   └── ads                      # Banner advertisements
│
└── Analytics
    ├── ad_metrics               # Ad performance
    └── activity_logs            # General activity tracking
```

### 3.2 Database Migrations (61 migration files)

**Migration Categories:**

1. **Schema Foundation** (2026-04-12)
   - Initial user, driver, vehicle tables
   - Shuttle core schema
   - Payment and wallet setup

2. **Shuttle Enhancement** (2026-04-13)
   - Seat management
   - Route assignments
   - Rayon (zone) mapping
   - Booking atomicity

3. **Driver Profile & Verification** (2026-04-13)
   - Driver documents
   - Verification workflows
   - Profile completeness

4. **Advanced Features** (2026-04-13-14)
   - PostGIS spatial indexing
   - Real-time event setup
   - Session management
   - Email system

5. **Security & Access Control** (2026-04-13-14)
   - RLS (Row-Level Security) policies
   - Role-based permissions
   - Audit logging

6. **Operational Data** (2026-04-14)
   - Route seeding
   - Service schedule seeding
   - Rayon and pickup point setup

---

### 3.3 Supabase Edge Functions (`/supabase/functions/`)

**Serverless Functions:** 15 functions

#### Payment Processing
```
calculate-fare/                  # Fare calculation logic
├── Zone detection
├── Distance-based calculation
├── Surge pricing
└── Service type pricing
```

#### Payment Gateway
```
payment-webhook/                 # Webhook handler
process-ride-payment/            # Payment processing
create-topup/                    # Wallet top-up
create-shuttle-payment/          # Shuttle booking payment
withdraw-to-bank/                # Bank withdrawal
withdraw-earnings/               # Driver earnings withdrawal
```

#### Ride Operations
```
complete-ride/                   # Ride completion logic
dispatch-driver/                 # Driver assignment
├── Matching algorithm
├── Location optimization
└── Availability checks
```

#### Communications
```
send-email/                      # Email dispatch
send-welcome-email/              # Onboarding emails
send-verification-email/         # Email verification
send-reset-password/             # Password reset
handle-email-webhooks/           # Email status tracking
```

#### Admin Tools
```
manage-gateway-keys/             # Payment gateway config
```

---

### 3.4 Supabase Configuration (`config.toml`)

```toml
project_id = "trtqwaovkgrobwvzqtyn"
# Configured for:
- PostgreSQL 14.5
- Real-time subscriptions
- Auth with PKCE flow
- Email services
- Webhook handling
```

---

## 4. MOBILE APPLICATIONS

### 4.1 Driver Mobile App (`/driver_app/` - Flutter)

**Architecture:** Clean Architecture (Domain-Driven Design)

```
driver_app/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── features/
│   │   ├── auth/
│   │   │   └── domain/          # Authentication business logic
│   │   └── ride/
│   │       ├── domain/          # Ride business logic
│   │       └── presentation/    # UI for rides
│   └── services/
│       ├── supabase_service.dart # Backend integration
│       ├── location_service.dart # GPS and location
│       └── notification_service.dart # Push notifications
│
├── pubspec.yaml                  # Flutter dependencies
├── android/                      # Android-specific code
├── ios/                          # iOS-specific code
├── web/                          # Web build
└── test/                         # Unit tests
```

**Key Features:**
- Driver authentication
- Real-time ride requests
- Location tracking and updates
- Earnings dashboard
- Shuttle operations

---

### 4.2 User Mobile App (`/users_app/` - Flutter)

**Architecture:** Similar clean architecture

```
users_app/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── features/
│   │   └── ride/
│   │       ├── domain/          # Ride business logic
│   │       └── presentation/    # Ride booking UI
│   └── services/
│       ├── supabase_service.dart # Backend integration
│       └── notification_service.dart # Push notifications
│
├── pubspec.yaml                  # Flutter dependencies
├── android/                      # Android build
├── ios/                          # iOS build
├── web/                          # Web build
└── test/                         # Unit tests
```

**Key Features:**
- User authentication
- Ride booking
- Shuttle booking
- Hotel reservations
- Wallet management
- Notifications

---

## 5. CONFIGURATION FILES

### 5.1 Build & Development

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite bundler configuration |
| `tsconfig.json` | TypeScript compiler options |
| `tsconfig.app.json` | App-specific TS config |
| `tsconfig.node.json` | Build tools TS config |
| `components.json` | shadcn/ui CLI configuration |

### 5.2 Styling & CSS

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Tailwind CSS theme & plugins |
| `postcss.config.js` | PostCSS processors (Tailwind, autoprefixer) |

### 5.3 Code Quality

| File | Purpose |
|------|---------|
| `eslint.config.js` | ESLint rules |
| `vitest.config.ts` | Vitest testing framework |

### 5.4 Deployment

| File | Purpose |
|------|---------|
| `.vercelignore` | Files to ignore in Vercel |
| `vercel.json` | Vercel deployment config |
| `.vercelignore` | Build optimization |

### 5.5 Environment Variables (`.env`)

```
VITE_SUPABASE_URL=https://trtqwaovkgrobwvzqtyn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=trtqwaovkgrobwvzqtyn
VITE_MIDTRANS_CLIENT_KEY=Mid-client-6krOwci0v0iMtQqA
```

---

## 6. KEY FEATURES & MODULES

### 6.1 Authentication & Authorization

**Files:**
- [useAuth.ts](src/hooks/useAuth.ts) - Auth state management
- [useRBAC.tsx](src/hooks/useRBAC.tsx) - Role-based access
- [ProtectedRoute.tsx](src/components/layout/ProtectedRoute.tsx) - Route protection
- [Auth.tsx](src/pages/Auth.tsx) - Login/registration page

**Features:**
- Email/password authentication (Supabase Auth)
- PKCE flow for security
- Role-based access control (user, moderator/driver, admin)
- Session management with auto-refresh
- Email verification
- Password reset functionality

---

### 6.2 Ride Management System

**Components:**
- [Ride.tsx](src/pages/Ride.tsx) - Booking interface
- [RideStatusOverlay.tsx](src/components/ride/RideStatusOverlay.tsx) - Real-time status
- [RideRatingDialog.tsx](src/components/ride/RideRatingDialog.tsx) - Post-ride feedback

**Services:**
- Ride booking and assignment
- Driver matching and dispatch
- Real-time location tracking
- Fare calculation
- Payment processing
- Rating and reviews

**Database Tables:**
- `rides` - Individual rides
- `ride_history` - Archived rides
- `ride_ratings` - User and driver ratings

---

### 6.3 Shuttle Service (Schedule-based)

**Components:** 16 shuttle-specific components
- [ShuttleRefactored.tsx](src/pages/ShuttleRefactored.tsx) - Main booking
- [SeatLayout.tsx](src/components/shuttle/SeatLayout.tsx) - Seat visualization
- [ScheduleSelector.tsx](src/components/shuttle/ScheduleSelector.tsx) - Schedule selection
- [RayonSelector.tsx](src/components/shuttle/RayonSelector.tsx) - Zone selection
- [PriceBreakdown.tsx](src/components/shuttle/PriceBreakdown.tsx) - Pricing display

**Services:**
- [ShuttleService.ts](src/services/ShuttleService.ts) - Business logic

**Features:**
- Pre-defined routes and schedules
- Zone-based service areas (Rayons)
- Seat availability management
- Multi-passenger bookings
- Group booking discounts
- Dynamic pricing
- Ticket generation

**Database Tables:**
- `shuttles` - Vehicle registry
- `shuttle_routes` - Route definitions
- `shuttle_schedules` - Service times
- `shuttle_bookings` - Passenger reservations
- `shuttle_seats` - Seat inventory
- `shuttle_rayons` - Service zones
- `shuttle_pickup_points` - Passenger pickup locations

---

### 6.4 Hotel Integration

**Components:**
- [Hotel.tsx](src/pages/Hotel.tsx) - Hotel listing
- [HotelDetail.tsx](src/pages/HotelDetail.tsx) - Hotel detail
- [HotelCard.tsx](src/components/hotel/HotelCard.tsx) - Hotel preview
- [RoomCard.tsx](src/components/hotel/RoomCard.tsx) - Room options
- [BookingDialog.tsx](src/components/hotel/BookingDialog.tsx) - Booking form

**Features:**
- Hotel listing and search
- Room availability and pricing
- Booking management
- Integration with ride services

**Database Tables:**
- `hotels` - Hotel listings
- `hotel_rooms` - Room inventory
- `hotel_bookings` - Room reservations

---

### 6.5 Driver Management System

**Admin Pages:**
- [AdminDrivers.tsx](src/pages/admin/AdminDrivers.tsx) - Driver list & management
- [DriverVehicleManagement.tsx](src/components/admin/DriverVehicleManagement.tsx) - Vehicle admin
- [DriverActivityLog.tsx](src/components/admin/DriverActivityLog.tsx) - Activity tracking
- [DriverEarningsAnalytics.tsx](src/components/admin/DriverEarningsAnalytics.tsx) - Analytics

**Driver Pages:**
- [DriverDashboard.tsx](src/pages/driver/DriverDashboard.tsx) - Driver overview
- [DriverActiveRide.tsx](src/pages/driver/DriverActiveRide.tsx) - Current ride
- [DriverEarnings.tsx](src/pages/driver/DriverEarnings.tsx) - Earnings dashboard
- [DriverProfile.tsx](src/pages/driver/DriverProfile.tsx) - Profile management

**Services:**
- [DriverAdminService.ts](src/services/DriverAdminService.ts) - Admin operations
- [DriverProfileService.ts](src/services/DriverProfileService.ts) - Profile management

**Features:**
- Driver onboarding and verification
- Document management (License, Insurance, Vehicle Registration)
- Real-time availability status
- Earnings tracking and payouts
- Performance analytics
- Activity audit logs
- Withdrawal requests
- Vehicle management

**Database Tables:**
- `drivers` - Driver accounts
- `driver_profiles` - Detailed info
- `driver_documents` - Verification docs
- `driver_verification` - Status tracking
- `driver_earnings` - Earnings history
- `driver_settings` - Preferences

---

### 6.6 Payment & Wallet System

**Components:**
- [Wallet.tsx](src/pages/Wallet.tsx) - Wallet dashboard
- [TopUpDialog.tsx](src/components/wallet/TopUpDialog.tsx) - Top-up form
- [TransactionList.tsx](src/components/wallet/TransactionList.tsx) - Transaction history
- [PaymentForm.tsx](src/components/shuttle/PaymentForm.tsx) - Payment checkout

**Payment Processors:**
- Midtrans (Primary gateway)
- Support for multiple payment methods

**Database Tables:**
- `wallets` - User wallet balances
- `transactions` - All transactions
- `withdrawals` - Cash-out requests
- `payment_gateways` - Gateway configurations
- `pricing_rules` - Dynamic pricing

**Edge Functions:**
- `calculate-fare/` - Fare computation
- `create-topup/` - Top-up processing
- `process-ride-payment/` - Ride payment
- `create-shuttle-payment/` - Shuttle payment
- `withdraw-earnings/` - Payout to drivers
- `withdraw-to-bank/` - Bank withdrawal

---

### 6.7 Session Management

**Components:**
- [SessionInitializer.tsx](src/components/auth/SessionInitializer.tsx) - Session setup
- [SessionManager.tsx](src/components/auth/SessionManager.tsx) - Lifecycle management
- [SessionRecoveryDialog.tsx](src/components/auth/SessionRecoveryDialog.tsx) - Recovery UI
- [SessionRecoveryWrapper.tsx](src/components/layout/SessionRecoveryWrapper.tsx) - Wrapper

**Services:**
- [SessionManagementService.ts](src/services/SessionManagementService.ts) - Core logic

**Features:**
- Automatic session expiration detection
- Session recovery with new credentials
- Warning dialogs before expiration
- Auto-refresh token handling
- Audit logging of session events

**Database Tables:**
- `session_management` - Active sessions
- `session_audit_logs` - Session history

---

### 6.8 Admin Dashboard

**Main Admin Panel:**
- [AdminLayout.tsx](src/pages/admin/AdminLayout.tsx) - Admin layout
- [AdminOverview.tsx](src/pages/admin/AdminOverview.tsx) - Dashboard overview
- [AdminRides.tsx](src/pages/admin/AdminRides.tsx) - Ride analytics
- [AdminShuttles.tsx](src/pages/admin/AdminShuttles.tsx) - Shuttle admin
- [AdminUsers.tsx](src/pages/admin/AdminUsers.tsx) - User management
- [AdminPayments.tsx](src/pages/admin/AdminPayments.tsx) - Payment tracking
- [AdminWithdrawals.tsx](src/pages/admin/AdminWithdrawals.tsx) - Withdrawal approvals
- [AdminSettings.tsx](src/pages/admin/AdminSettings.tsx) - System settings

**Email Management:**
- [EmailSettings.tsx](src/pages/admin/EmailSettings.tsx) - SMTP configuration
- [EmailTemplateEditor.tsx](src/pages/admin/EmailTemplateEditor.tsx) - Template design
- [EmailWebhookTracking.tsx](src/pages/admin/EmailWebhookTracking.tsx) - Email logs

**Features:**
- System overview and KPIs
- Real-time analytics
- User management (activate, suspend, ban)
- Driver verification and approval
- Vehicle management
- Ride dispute resolution
- Payment management
- Withdrawal processing
- Email template management
- System configuration

---

### 6.9 Email & Communication System

**Edge Functions:**
- `send-email/` - Email dispatcher
- `send-welcome-email/` - Onboarding emails
- `send-verification-email/` - Account verification
- `send-reset-password/` - Password recovery
- `handle-email-webhooks/` - Status tracking (bounces, opens, clicks)

**Database Tables:**
- `email_templates` - Email designs
- `email_logs` - Sent email history
- `sms_logs` - SMS messages
- `notifications` - In-app notifications

---

## 7. STATE MANAGEMENT & DATA FLOW

### 7.1 Authentication State (`authStore.ts`)
```typescript
- currentUser
- authStatus
- userRoles
- isAuthenticated
- isDriverMode
```

### 7.2 Driver State (`driverStore.ts`)
```typescript
- currentLocation
- activeRide
- availabilityStatus
- vehicleInfo
- earnings
```

### 7.3 Ride State (`rideStore.ts`)
```typescript
- bookingDetails
- rideStatus
- driverLocation
- paymentInfo
- estimatedFare
```

### 7.4 Server State (`TanStack React Query`)
```typescript
- useQuery for data fetching
- useMutation for updates
- Automatic caching and synchronization
```

---

## 8. UTILITY FUNCTIONS & HELPERS

### 8.1 Business Logic

| Utility | Purpose |
|---------|---------|
| [fareCalculation.ts](src/lib/fareCalculation.ts) | Base + distance + surge pricing |
| [otp.ts](src/utils/otp.ts) | OTP generation and validation |
| [PriceCalculator.ts](src/utils/PriceCalculator.ts) | Advanced pricing engine |
| [location.ts](src/lib/location.ts) | Geocoding, distance, zones |

### 8.2 Access Control

| Utility | Purpose |
|---------|---------|
| [rbac.ts](src/lib/rbac.ts) | Permission and role validation |
| [useRBAC.tsx](src/hooks/useRBAC.tsx) | React RBAC hook |

### 8.3 Internationalization

| Utility | Purpose |
|---------|---------|
| [i18n.ts](src/lib/i18n.ts) | Translation management |

### 8.4 Testing

| Utility | Purpose |
|---------|---------|
| [ab-test.ts](src/lib/ab-test.ts) | A/B testing framework |

---

## 9. DEPENDENCIES & TECH STACK

### 9.1 Frontend Dependencies
```
Framework: React 19
Build Tool: Vite
Language: TypeScript
Styling: Tailwind CSS, PostCSS
UI Components: shadcn/ui (45+ primitives), Radix UI
Form Handling: React Hook Form, Zod
State Management: Zustand, TanStack React Query
HTTP Client: @supabase/supabase-js
Maps: Leaflet
Routing: React Router v7
Notifications: Sonner (toast notifications)
Modals: Dialog primitives from Radix UI
```

### 9.2 Backend (Supabase)
```
Database: PostgreSQL 14.5
Auth: Supabase Auth with PKCE
Storage: Supabase Storage
Real-time: PostgreSQL Subscriptions
Serverless: Edge Functions (Deno)
Spatial: PostGIS for location queries
```

### 9.3 Mobile (Flutter)
```
SDK: Flutter 3.x
State: Clean Architecture + Riverpod/Provider
Backend: Supabase SDK
Location: GeoLocator, Google Maps
Notifications: Firebase Cloud Messaging
```

### 9.4 Payment Integration
```
Primary: Midtrans
Features: Credit Card, Bank Transfer, E-wallet
Webhooks: Payment status tracking
```

---

## 10. FILE STATISTICS

### 10.1 Source Code Breakdown

| Directory | Files | Type |
|-----------|-------|------|
| /src/components | 90+ | TSX components |
| /src/pages | 25+ | Page components |
| /src/services | 6 | TypeScript services |
| /src/hooks | 9 | Custom hooks |
| /src/stores | 3 | State stores |
| /src/lib | 5+ | Utility functions |
| /src/utils | 3 | Helpers |
| /src/integrations | 2 | Integration files |
| /src/test | 4 | Test files |

### 10.2 Database Migrations

| Category | Files | Purpose |
|----------|-------|---------|
| Schema Foundation | 12 | Core tables |
| Shuttle System | 8 | Shuttle features |
| Driver System | 6 | Driver management |
| Payment/Security | 12 | Payments, RLS, auth |
| Operational | 15 | Seed data, indexes |
| Features | 8 | Advanced features |

### 10.3 Supabase Edge Functions

| Category | Count | Purpose |
|----------|-------|---------|
| Payment | 6 | Payment processing |
| Communication | 4 | Email/notifications |
| Ride Ops | 2 | Ride management |
| Admin | 1 | Configuration |
| **Total** | **15** | Serverless backend |

---

## 11. FEATURE MATRIX

| Feature | User | Driver | Admin | Mobile |
|---------|------|--------|-------|--------|
| **Authentication** | ✓ | ✓ | ✓ | ✓ |
| **Profile Management** | ✓ | ✓ | ✓ | ✓ |
| **Ride Booking** | ✓ | - | View | ✓ |
| **Shuttle Booking** | ✓ | - | Manage | ✓ |
| **Hotel Booking** | ✓ | - | Manage | ✓ |
| **Real-time Tracking** | ✓ | ✓ | View | ✓ |
| **Wallet/Payments** | ✓ | ✓ | Manage | ✓ |
| **Earnings Dashboard** | - | ✓ | - | ✓ |
| **Document Upload** | - | ✓ | Verify | ✓ |
| **Ratings & Reviews** | ✓ | ✓ | Moderate | ✓ |
| **Analytics** | - | ✓ | ✓ | - |
| **User Management** | - | - | ✓ | - |
| **Driver Management** | - | - | ✓ | - |
| **Payment Management** | - | - | ✓ | - |
| **Email Templates** | - | - | ✓ | - |

---

## 12. DEPLOYMENT & ENVIRONMENT

### 12.1 Hosting
- **Frontend:** Vercel (SPA)
- **Database:** Supabase (Cloud PostgreSQL)
- **Serverless:** Supabase Edge Functions
- **CDN:** Vercel Edge Network

### 12.2 Environment Configuration
```
Development: Local Vite server on port 8080
Production: Vercel deployments
Database: Single Supabase project
API: Supabase REST API + Real-time subscriptions
```

---

## 13. ARCHITECTURAL PATTERNS & BEST PRACTICES

### 13.1 Component Architecture
- **Atomic Design:** Organized by component type (ui, features)
- **Lazy Loading:** Critical pages lazy-loaded with React.lazy()
- **Code Splitting:** Route-based splitting for performance
- **Suspense Boundaries:** Loading states with PageSkeleton

### 13.2 State Management
- **Client State:** Zustand stores
- **Server State:** TanStack React Query
- **Auth State:** Supabase Auth + authStore

### 13.3 Data Access Patterns
- **Repositories:** For database queries (DriverProfileRepository, UserProfileRepository)
- **Services:** For business logic (ShuttleService, DriverAdminService)
- **Hooks:** For reusable logic (useAuth, useShuttleBooking)

### 13.4 Authentication & Authorization
- **PKCE Flow:** Secure OAuth flow
- **RLS Policies:** PostgreSQL Row-Level Security
- **Role-Based Access:** Admin, Moderator (Driver), User roles
- **Session Management:** Auto-refresh with recovery

### 13.5 API Integration
- **Edge Functions:** Deno-based serverless for backend logic
- **Real-time Subscriptions:** PostgreSQL listen/notify
- **Webhooks:** For payment status and email tracking

### 13.6 Error Handling
- **Global Error Boundary:** ProtectedRoute wrapper
- **Toast Notifications:** User-friendly error messages
- **Session Recovery:** Automatic session restoration

---

## 14. TESTING STRATEGY

### Test Files
- **Unit Tests:** `*.test.ts` files
- **Component Tests:** `*.test.tsx` files
- **Test Framework:** Vitest
- **Configuration:** vitest.config.ts

**Covered Areas:**
- Authentication & RBAC
- Shuttle booking logic
- Price calculation
- Component rendering (PromoSection, SplashScreen)

---

## 15. DOCUMENTATION FILES

The workspace contains 40+ comprehensive documentation files:
- Architecture analyses
- Implementation guides
- Database migration documentation
- Driver/Admin system specifics
- Session management guides
- Performance reports
- Testing resources
- Webhook documentation

---

## 16. KEY DEVELOPMENT COMMANDS

```bash
# Development
npm run dev                    # Start Vite dev server on :8080

# Build & Preview
npm run build                  # Production build
npm run preview               # Preview production build

# Code Quality
npm run lint                  # ESLint checks
npm test                      # Run tests
npm run test:watch           # Watch mode testing

# Package Management
npm install                   # Install dependencies
bun install                  # Install with Bun package manager
```

---

## 17. PROJECT SUMMARY

**PyU Go Connect** is a comprehensive multi-platform ridesharing application featuring:

✓ **Multi-service:** On-demand rides, scheduled shuttles, hotel bookings  
✓ **Multi-platform:** Web (React), Driver app (Flutter), User app (Flutter)  
✓ **Advanced Features:** Real-time tracking, dynamic pricing, multi-language  
✓ **Enterprise Admin:** Complete dashboard with analytics and management  
✓ **Payment Processing:** Integrated with Midtrans for multiple payment methods  
✓ **Communication:** Email templates, SMS, push notifications  
✓ **Security:** PKCE auth, RLS policies, comprehensive audit logging  

**Total Codebase:**
- **~150 components** (React + Flutter)
- **~25 pages** (web application)
- **6+ services** (business logic)
- **61 database migrations** (40+ tables)
- **15 edge functions** (serverless backend)
- **45+ UI primitives** (shadcn/ui)

---

**Generated:** April 15, 2026  
**Last Updated:** Analysis complete
