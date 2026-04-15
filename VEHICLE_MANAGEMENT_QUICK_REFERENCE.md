# Vehicle Management - Quick Reference & Architecture

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    DRIVER APPLICATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  DriverProfile.tsx ───► DriverVehiclesTab ────┐                │
│                                                 │                │
│                    VehicleInfo.tsx              │                │
│          (Add/Edit/Delete/Select Vehicle)      │                │
│                  ❌ NO VALIDATION               │                │
│                                                 │                │
│              [MISSING] VehicleDocumentUpload    ├─ Forms        │
│              (Upload STNK/KIR/Insurance)       │                │
│              ❌ NOT INTEGRATED                  │                │
│                                                 │                │
│              DocumentVerification.tsx           │                │
│              (Driver/Personal Docs)             │                │
│                                                 │                │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│             SERVICE LAYER (DriverProfileService)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ createVehicle(driverId, vehicle)                            │
│     - Plate format validation                                    │
│     - Year/capacity bounds check                                │
│     - ❌ NO verification status update                           │
│                                                                   │
│  ✅ updateVehicle(vehicleId, vehicle)                           │
│     - Same validations                                          │
│     - ❌ NO verification check                                   │
│                                                                   │
│  ❌ MISSING: validateVehicleDocuments(vehicleId)                │
│     Should check expiry, status, eligibility                    │
│                                                                   │
│  ❌ MISSING: checkVehicleEligibilityForRide(vehicleId)         │
│     Should verify + check document expiry                       │
│                                                                   │
│  ✅ uploadDocument(driverId, docType, file, expiry)            │
│     - File type validation                                       │
│     - Size limit (10MB)                                         │
│     - ❌ NO server-side content validation                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│          REPOSITORY LAYER (DriverProfileRepository)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Vehicles Table CRUD:                                           │
│  ✅ getVehicles(driverId)                                       │
│  ✅ createVehicle(vehicle)                                      │
│  ✅ updateVehicle(vehicleId, vehicle)                           │
│  ✅ deleteVehicle(vehicleId)                                    │
│                                                                   │
│  Vehicle Documents CRUD:                                        │
│  ✅ uploadVehicleDocument(vehicleId, docType, file, expiry)    │
│  ✅ getVehicleDocuments(vehicleId)                              │
│                                                                   │
│  Storage:                                                        │
│  ✅ vehicles bucket (public)                                    │
│  ❌ vehicle-documents bucket (MISSING - should be private)     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│                 SUPABASE (Database + Storage)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tables:                                                         │
│  ┌─ vehicles                                                     │
│  │  ├─ id (PK)                                                  │
│  │  ├─ driver_id (FK)                              ✅           │
│  │  ├─ plate_number                                ✅           │
│  │  ├─ vehicle_type (car/bike/suv)                ✅           │
│  │  ├─ model                                       ✅           │
│  │  ├─ color                                       ✅           │
│  │  ├─ year                                        ✅           │
│  │  ├─ capacity                                    ✅           │
│  │  ├─ image_url                                   ✅           │
│  │  ├─ is_verified                                 ✅           │
│  │  ├─ status (MISSING)                            ❌           │
│  │  ├─ last_maintenance_date (MISSING)             ❌           │
│  │  ├─ odometer_km (MISSING)                       ❌           │
│  │  ├─ created_at, updated_at                      ✅           │
│  │                                                               │
│  ┌─ vehicle_documents                                            │
│  │  ├─ id (PK)                                     ✅           │
│  │  ├─ vehicle_id (FK)                             ✅           │
│  │  ├─ document_type (stnk/insurance/tax_paid)    ⚠️ (No KIR)  │
│  │  ├─ file_url                                    ✅           │
│  │  ├─ status (pending/verified/rejected/expired)  ✅           │
│  │  ├─ expiry_date                                 ✅           │
│  │  ├─ verified_at                                 ✅           │
│  │  ├─ verified_by (MISSING)                       ❌           │
│  │  ├─ verification_reason (MISSING)               ❌           │
│  │  ├─ rejected_at, rejection_reason               ✅           │
│  │  ├─ created_at, updated_at                      ✅           │
│  │                                                               │
│  ┌─ [MISSING] vehicle_verification_audit_log                    │
│  │  (To track who verified what and when)                       │
│                                                                   │
│  Storage Buckets:                                                │
│  ├─ vehicles (public) ✅                                        │
│  │  └─ vehicle-images/{user_id}/{timestamp}                    │
│  │                                                               │
│  └─ [MISSING] vehicle-documents (private)                       │
│     └─ {user_id}/{vehicle_id}/{document_type}/{timestamp}      │
│                                                                   │
│  RLS Policies:                                                   │
│  ├─ Drivers can CRUD their own vehicles ✅                      │
│  ├─ Drivers can manage vehicle documents ✅                     │
│  ├─ Admins can verify vehicles (MISSING) ❌                     │
│  ├─ Admins can view vehicle documents (MISSING) ❌              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 DATA FLOW - VEHICLE REGISTRATION WORKFLOW

### Current Flow (❌ Missing Validations)

```
1. Driver fills vehicle form
   ↓
2. VehicleInfo validates form locally
   - Plate format ✅
   - Year/capacity bounds ✅
   ↓
3. Insert into vehicles table
   - ❌ NO is_verified validation
   - ❌ NO document requirement check
   ↓
4. Driver selects vehicle as active
   - ❌ NO verification check
   - ❌ NO document expiry check
   ↓
5. Driver accepts ride
   - ❌ NO vehicle validation
   - ❌ Can accept with unverified vehicle
   - ❌ Can accept with expired documents
   ↓
6. CRITICAL BUG: Ride accepted with invalid vehicle 🔴
```

### Recommended Flow (✅ With Validations)

```
1. Driver fills vehicle form
   ↓
2. VehicleInfo validates form locally
   - Plate format ✅
   - Year/capacity bounds ✅
   ↓
3. DriverProfileService.createVehicle()
   - Server-side validation ✅
   - Insert into vehicles table
   - Set is_verified = false ✅
   ↓
4. Upload documents (NEW REQUIRED FLOW)
   - VehicleDocumentUpload component
   - Upload STNK ✅
   - Upload KIR ✅
   - Upload Insurance ✅
   - Mark documents as pending ✅
   ↓
5. Admin reviews and verifies
   - DriverAdminService.getVehiclesAwaitingVerification() ✅
   - Admin reviews documents
   - Verify vehicle → is_verified = true ✅
   - Audit log created ✅
   ↓
6. Driver selects vehicle as active
   - Check is_verified = true ✅
   - Check document expiry ✅
   - Check document status = verified ✅
   - Only then allow selection ✅
   ↓
7. Driver tries to accept ride
   - Check vehicle eligibility ✅
   - Check document expiry < 30 days ✅
   - Block if any expired ✅
   ✅ Only accept if all valid
   ↓
8. SAFE: Ride accepted only with valid vehicle ✓
```

---

## 🔍 CODE LOCATIONS QUICK MAP

### Vehicle Creation/Management
- **Component:** [src/components/driver/profile/VehicleInfo.tsx](src/components/driver/profile/VehicleInfo.tsx)
- **Form validation:** Lines 130-160
- **Issue:** No service layer integration, direct DB calls
- **Database:** vehicles table in [supabase/migrations/20260412125708](supabase/migrations/20260412125708_703be763-3ea7-4cef-9df0-ff3a136776ae.sql#L104)

### Document Upload
- **Component:** [src/components/driver/profile/DocumentVerification.tsx](src/components/driver/profile/DocumentVerification.tsx)
- **Issue:** Only uploads driver docs, not vehicle docs
- **Missing:** VehicleDocumentUpload component
- **Database:** vehicle_documents table in [supabase/migrations/20260413280000](supabase/migrations/20260413280000_create_user_and_driver_settings.sql#L95)

### Service Layer
- **File:** [src/services/DriverProfileService.ts](src/services/DriverProfileService.ts)
- **createVehicle:** Lines 95-145 ✅ Has validation
- **updateVehicle:** Lines 148-165 ✅ Has validation
- **Missing:** validateVehicleDocuments(), checkVehicleEligibility()
- **Admin service:** [src/services/DriverAdminService.ts](src/services/DriverAdminService.ts)
  - Missing: verifyVehicle(), getVehiclesAwaitingVerification()

### Repository Layer
- **File:** [src/repositories/DriverProfileRepository.ts](src/repositories/DriverProfileRepository.ts)
- **Vehicle CRUD:** Lines 190-250 ✅
- **Document CRUD:** Lines 320-345 ✅
- **Issue:** Methods exist but never called from components

### Database Schema
- **Vehicles:** [20260412125708](supabase/migrations/20260412125708_703be763-3ea7-4cef-9df0-ff3a136776ae.sql#L104) + [20260413200000](supabase/migrations/20260413200000_comprehensive_driver_profile.sql#L5)
- **Vehicle Documents:** [20260413280000](supabase/migrations/20260413280000_create_user_and_driver_settings.sql#L95)
- **RLS Policies:** [20260413250000](supabase/migrations/20260413250000_secure_vehicle_management.sql)

### Integration Points
- **Driver Profile Page:** [src/pages/driver/DriverProfile.tsx](src/pages/driver/DriverProfile.tsx#L52)
  - Loads vehicle data but doesn't validate
- **Admin Service:** [src/services/DriverAdminService.ts](src/services/DriverAdminService.ts)
  - Has getDriversWithFilters() but no vehicle verification methods

---

## 🎯 IMPLEMENTATION PRIORITIES

### PHASE 0: Emergency Hotfix (TODAY - 4 hours)
```
1. Add vehicle validation before ride acceptance
   - File: src/repositories/DriverProfileRepository.ts
   - Add: checkVehicleEligibilityForRide(vehicleId)
   - Check: is_verified = true
   - Check: All documents verified

2. Block ride acceptance in ride acceptance logic
   - Wherever acceptRide() is implemented
   - Call checkVehicleEligibilityForRide() first
   - Throw error if not eligible

ESTIMATED IMPACT: Prevents rides with unverified vehicles ✅
```

### PHASE 1: Document Verification (WEEK 1 - 16 hours)
```
1. Create vehicle_documents upload component
   - File: src/components/driver/profile/VehicleDocumentUpload.tsx
   - Support: STNK, KIR, Insurance, Tax Paid
   - With: Expiry date picker

2. Add to DriverProfile.tsx tabs
   - New tab: "Vehicle Documents"
   - Show upload status
   - Show verification status

3. Create admin verification workflow
   - File: src/pages/admin/VehicleVerification.tsx
   - List pending vehicle documents
   - Show verification form
   - Track audit log

4. Add database audit table
   - Migration: vehicle_verification_audit_log
   - Track: who, what, when, why

ESTIMATED IMPACT: Manual verification workflow enabled ✅
```

### PHASE 2: Automation & Safety (WEEK 2 - 12 hours)
```
1. Auto-expiry check function
   - File: src/services/DriverProfileService.ts
   - Add: validateVehicleDocuments(vehicleId)
   - Check expiry dates daily (via trigger or job)

2. Real-time updates
   - File: src/hooks/useVehicleDocumentUpdates.ts
   - Subscribe to document changes
   - Update UI instantly (not 5min delay)

3. Vehicle eligibility badge
   - Show in VehicleInfo component
   - "Ready", "Missing Docs", "Expired", "Pending Review"
   - Update in real-time

4. Pre-expiry warnings
   - Show 30-day warning badge
   - Notify driver in dashboard
   - Add to notifications system

ESTIMATED IMPACT: Drivers alerted before documents expire ✅
```

### PHASE 3: UX & Performance (WEEK 3 - 8 hours)
```
1. Image optimization
   - Add: src/utils/imageOptimization.ts
   - Compress to 1024x768 WebP @ 0.8 quality
   - Save ~60% storage

2. Upload retry logic
   - Add: src/utils/uploadRetry.ts
   - 3 retries with exponential backoff
   - Better mobile UX

3. Batch upload UI
   - Allow drag-drop multiple documents
   - Show progress for each
   - Retry failed individually

ESTIMATED IMPACT: Better performance, less uploads fail ✅
```

---

## 💡 KEY RECOMMENDATIONS

| Issue | Priority | Risk | Fix Time | Owner |
|-------|----------|------|----------|-------|
| No vehicle verification | 🔴 P0 | CRITICAL | 4h | Backend |
| No doc expiry enforcement | 🔴 P0 | CRITICAL | 5h | Backend |
| No admin verification UI | 🔴 P1 | HIGH | 6h | Full Stack |
| Missing doc upload component | 🟠 P1 | HIGH | 4h | Frontend |
| No real-time updates | 🟠 P2 | MEDIUM | 3h | Backend |
| No audit trail | 🟠 P2 | MEDIUM | 3h | Backend |
| Image optimization | 🟡 P3 | LOW | 2h | Frontend |
| Upload retry logic | 🟡 P3 | LOW | 2h | Frontend |

---

## ✅ ACCEPTANCE CRITERIA

Vehicle Management is production-ready when:

- [ ] Vehicle can only be selected if is_verified = true
- [ ] Vehicle selection blocked if any document is expired
- [ ] Admin can verify vehicles with audit trail
- [ ] Documents expire automatically on expiry_date
- [ ] Driver warned 30 days before document expiry
- [ ] Real-time document status updates (< 1 second)
- [ ] All forms have server-side validation
- [ ] 80%+ test coverage for vehicle validation logic
- [ ] No N+1 queries when loading vehicles + documents
- [ ] Image uploads < 500KB average file size

---

## 📞 CONTACTS & ESCALATION

**If production deployment is attempted without fixes:**
- Critical Business Risk: 🔴 HIGH
- Liability Exposure: Unverified drivers operating vehicles
- Recommendation: **BLOCK** deployment until Phase 0 fixes merged
