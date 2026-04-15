# Driver Module - Comprehensive Code Review Report

**Date:** April 15, 2026  
**Scope:** Driver Service Layer, Components, Hooks, and Business Logic  
**Review Severity Distribution:** 8 Critical, 12 Major, 10 Minor Issues

---

## Executive Summary

The Driver module is functionally complete with core features implemented (onboarding, status management, location tracking, ride acceptance, earnings tracking). However, the code review reveals **30 significant issues** ranging from critical data integrity problems to performance inefficiencies. The most critical issues are:

1. **No rate limiting** on location updates causing potential database abuse
2. **Race conditions** in ride status transitions without atomic operations
3. **Missing input validation** on location coordinates in fare calculation
4. **N+1 query patterns** in driver statistics calculation
5. **No compensation mechanism** for cancelled rides

---

## 1. DRIVER SERVICE LAYER ANALYSIS

### 1.1 DriverProfileService.ts

#### Issue #1 (CRITICAL): Unsafe License Number Validation Pattern
**File:** [src/services/DriverProfileService.ts](src/services/DriverProfileService.ts#L64)  
**Severity:** Critical

```typescript
private static isValidLicenseNumber(licenseNumber: string): boolean {
  return /^\d{10,12}$/.test(licenseNumber);
}
```

**Problems:**
- Only validates length, not actual SIM number format (should check province code, issue date validity)
- Indonesian SIM numbers have specific prefixes by province/issue
- No cross-reference with national database (InaCorS)

**Recommendation:**
```typescript
private static isValidLicenseNumber(licenseNumber: string): boolean {
  // Must be 10-12 digits with valid province codes
  const provinceCodeRegex = /^([01234567890]{2})(\d{8,10})$/;
  const match = licenseNumber.match(provinceCodeRegex);
  if (!match) return false;
  
  const provinceCode = parseInt(match[1], 10);
  // Validate province exists (1-34 are valid)
  return provinceCode >= 1 && provinceCode <= 34;
}
```

---

#### Issue #2 (CRITICAL): Unvalidated Coordinates in Fare Calculation
**File:** [src/pages/Ride.tsx](src/pages/Ride.tsx#L70-L72)  
**Severity:** Critical

```typescript
const { data, error } = await supabase.functions.invoke("calculate-fare", {
  body: requestBody, // No validation of coordinate types or bounds
});
```

**Problems:**
- Coordinates not validated before sending to edge function
- No bounds checking (valid latitude: -90 to 90, longitude: -180 to 180)
- No coordinate type checking before transmission
- Allows injection of invalid data

**Recommendation:**
```typescript
function validateCoordinates(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return true;
}

// In calculateFare():
if (!validateCoordinates(pickup.lat, pickup.lng) || 
    !validateCoordinates(dropoff.lat, dropoff.lng)) {
  throw new Error("Invalid coordinates");
}
```

---

#### Issue #3 (MAJOR): Settings Initialization Race Condition
**File:** [src/services/DriverProfileService.ts](src/services/DriverProfileService.ts#L23-L45)  
**Severity:** Major

```typescript
// Auto-initialize settings if they don't exist
let finalSettings = settings;
if (!settings) {
  try {
    finalSettings = await DriverProfileRepository.initializeSettings(profile.id);
  } catch (error) {
    // Fallback with default values but these are not persisted
    finalSettings = { id: 'temp', ... };
  }
}
```

**Problems:**
- If two requests arrive simultaneously, both try to initialize settings
- Falls back to temp object with id='temp' which violates FK constraints
- No atomic check-and-create operation
- Fallback settings aren't returned from DB, causing future mismatches

**Recommendation:**
```typescript
static async getDriverComplete(userId: string) {
  const profile = await DriverProfileRepository.getProfileByUserId(userId);
  if (!profile) throw new Error("Driver profile not found");

  try {
    const [settings, vehicles, documents] = await Promise.all([
      this.ensureSettingsExist(profile.id),
      DriverProfileRepository.getVehicles(profile.id),
      DriverProfileRepository.getDocuments(profile.id),
    ]);
    return { profile, settings, vehicles, documents };
  } catch (error) {
    throw new Error(`Failed to load driver data: ${error.message}`);
  }
}

private static async ensureSettingsExist(driverId: string) {
  const existing = await DriverProfileRepository.getSettings(driverId);
  if (existing) return existing;
  
  // Use database-level uniqueness to prevent race condition
  return DriverProfileRepository.initializeSettings(driverId);
}
```

---

#### Issue #4 (MAJOR): No Error Recovery for Age Calculation
**File:** [src/services/DriverProfileService.ts](src/services/DriverProfileService.ts#L73-L80)  
**Severity:** Major

```typescript
if (data.date_of_birth) {
  const age = this.calculateAge(new Date(data.date_of_birth));
  if (age < 18) {
    throw new Error("Driver must be at least 18 years old");
  }
}
```

**Problems:**
- No invalid date string handling (e.g., "invalid-date" parses to Invalid Date)
- `calculateAge()` would return `NaN` silently
- No validation that date is in the past
- Could allow future birth dates

**Recommendation:**
```typescript
if (data.date_of_birth) {
  const birthDate = new Date(data.date_of_birth);
  
  // Validate date
  if (isNaN(birthDate.getTime())) {
    throw new Error("Invalid date of birth format");
  }
  
  if (birthDate > new Date()) {
    throw new Error("Birth date cannot be in the future");
  }
  
  const age = this.calculateAge(birthDate);
  if (age < 18) {
    throw new Error("Driver must be at least 18 years old");
  }
}
```

---

#### Issue #5 (MAJOR): Payment Method Validation Incomplete
**File:** [src/services/DriverProfileService.ts](src/services/DriverProfileService.ts#L97-L104)  
**Severity:** Major

```typescript
const validPaymentMethods = ["cash", "wallet", "card"];
if (
  data.preferred_payment_method &&
  !validPaymentMethods.includes(data.preferred_payment_method)
) {
  throw new Error("Invalid payment method");
}
```

**Problems:**
- Validates against hardcoded list instead of querying payment_methods table
- If new payment methods are added to system, old code still restricts them
- No check for driver's payment method tier/permission level
- No check if payment provider (e.g., Midtrans) supports the method

**Recommendation:**
```typescript
static async updateSettings(driverId: string, data: Partial<DriverSettings>) {
  // Fetch valid payment methods from database
  const { data: validMethods, error } = await supabase
    .from("payment_methods")
    .select("code")
    .eq("enabled", true);
  
  if (error) throw new Error("Failed to validate payment methods");
  
  const validCodes = validMethods?.map(m => m.code) || [];
  
  if (data.preferred_payment_method && !validCodes.includes(data.preferred_payment_method)) {
    throw new Error("Invalid or unavailable payment method");
  }
  
  // ... rest of validation
}
```

---

#### Issue #6 (MINOR): Plate Number Regex Too Restrictive
**File:** [src/services/DriverProfileService.ts](src/services/DriverProfileService.ts#L132)  
**Severity:** Minor

```typescript
private static isValidPlateNumber(plateNumber: string): boolean {
  return /^[A-Z]\s\d{1,4}\s[A-Z]{1,3}$/.test(plateNumber);
}
```

**Problems:**
- Pattern requires exactly 1 letter, space, 1-4 digits, space, 1-3 letters
- Some Indonesian plates use 2 letter prefixes (e.g., "AD")
- Doesn't account for special plates (diplomatic, NGO, etc.)
- No normalization of input

**Recommendation:**
```typescript
private static isValidPlateNumber(plateNumber: string): boolean {
  // Normalize: convert to uppercase and trim whitespace
  const normalized = plateNumber.toUpperCase().trim();
  
  // Accept multiple plate formats:
  // Standard: B XXXX XXX or B XXXX XX
  // Double letter: AD XXXX XXX
  // New format: BG7 2024 AA
  const patterns = [
    /^[A-Z]{1,2}\s\d{1,4}\s[A-Z]{1,3}$/,    // Standard
    /^[A-Z]{1,2}\d{1,4}\s[A-Z]{1,3}$/,      // Without spacing
    /^[A-Z]{2}\d{1}\s\d{4}\s[A-Z]{2}$/,     // New format
  ];
  
  return patterns.some(pattern => pattern.test(normalized));
}
```

---

### 1.2 DriverAdminService.ts

#### Issue #7 (CRITICAL): N+1 Query Pattern in getDriverStatistics()
**File:** [src/services/DriverAdminService.ts](src/services/DriverAdminService.ts#L66-L90)  
**Severity:** Critical

```typescript
static async getDriverStatistics(): Promise<DriverStatistics> {
  const [totalRes, statusRes, ratingRes, ridesRes] = await Promise.all([
    supabase.from("drivers").select("id", { count: "exact" }),
    supabase.from("drivers").select("status", { count: "exact" }),
    supabase.from("drivers").select("rating"),
    supabase.from("rides").select("id, fare", { count: "exact" }).eq("status", "completed"),
  ]);

  const activeCount = (await supabase.from("drivers")...
  const pendingCount = (await supabase.from("drivers")...
  const rejectedCount = (await supabase.from("drivers")...
```

**Problems:**
- Makes **7 separate database queries** for overlapping data
- `statusRes` duplicates `totalRes` query
- Initial `Promise.all()` then additional sequential queries defeats parallelization
- Could return stale/inconsistent data from different timestamps
- Performance: O(7) instead of O(1)

**Recommendation:** Use a single aggregation query or database view:
```typescript
static async getDriverStatistics(): Promise<DriverStatistics> {
  // Single optimized query using aggregations
  const { data, error } = await supabase.rpc('get_driver_statistics');
  
  if (error) throw new Error(`Failed to fetch statistics: ${error.message}`);
  
  return {
    total_drivers: data.total_count,
    active_drivers: data.active_count,
    pending_verification: data.pending_count,
    rejected_drivers: data.rejected_count,
    average_rating: parseFloat(data.avg_rating) || 0,
    total_completed_rides: data.completed_rides,
    total_earnings: parseFloat(data.total_earnings) || 0,
  };
}
```

**Database Function (SQL):**
```sql
CREATE OR REPLACE FUNCTION get_driver_statistics()
RETURNS TABLE (
  total_count BIGINT,
  active_count BIGINT,
  pending_count BIGINT,
  rejected_count BIGINT,
  avg_rating NUMERIC,
  completed_rides BIGINT,
  total_earnings NUMERIC
) AS $$
SELECT
  (SELECT COUNT(*) FROM drivers) as total_count,
  (SELECT COUNT(*) FROM drivers WHERE status IN ('available', 'busy')) as active_count,
  (SELECT COUNT(*) FROM drivers WHERE registration_status = 'pending') as pending_count,
  (SELECT COUNT(*) FROM drivers WHERE registration_status = 'rejected') as rejected_count,
  (SELECT AVG(rating)::NUMERIC FROM drivers WHERE rating IS NOT NULL) as avg_rating,
  (SELECT COUNT(*) FROM rides WHERE status = 'completed') as completed_rides,
  (SELECT SUM(fare)::NUMERIC FROM rides WHERE status = 'completed') as total_earnings;
$$ LANGUAGE SQL;
```

---

#### Issue #8 (MAJOR): Inconsistent Count and Data in getDriversWithFilters()
**File:** [src/services/DriverAdminService.ts](src/services/DriverAdminService.ts#L48-L63)  
**Severity:** Major

```typescript
const { data, error, count } = await query.range(offset, offset + limit - 1);

if (error) throw new Error(`Failed to fetch drivers: ${error.message}`);

return {
  drivers: (data || []) as unknown as DriverWithStats[],
  total: count || 0,
  hasMore: (count || 0) > offset + limit,
};
```

**Problems:**
- If `data` is `[]` but `count` is > 0, pagination could skip results
- Type coercion with `as unknown as` hides type mismatches
- `hasMore` calculation doesn't match actual returned count
- Could return empty array with `hasMore: true` (confusing pagination)

**Recommendation:**
```typescript
const { data, error, count } = await query.range(offset, offset + limit - 1);

if (error) throw new Error(`Failed to fetch drivers: ${error.message}`);

const drivers = (data || []) as DriverWithStats[];
const total = count || 0;
const returnedCount = drivers.length;

// Verify pagination consistency
if (returnedCount === 0 && total > offset) {
  throw new Error("Unexpected empty result set");
}

return {
  drivers,
  total,
  hasMore: offset + returnedCount < total,
};
```

---

#### Issue #9 (MAJOR): Manual Driver Assignment Without Validation
**File:** [src/pages/admin/AdminRides.tsx](src/pages/admin/AdminRides.tsx#L65-L85)  
**Severity:** Major

```typescript
const assignDriverMutation = useMutation({
  mutationFn: async ({ rideId, name, plate }: { rideId: string; name: string; plate: string }) => {
    const { error } = await supabase
      .from("rides")
      .update({
        external_driver_name: name,
        external_driver_plate: plate,
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", rideId);
    if (error) throw error;
  },
```

**Problems:**
- **No permissions check** - any admin can assign any ride to external driver
- **No ride status validation** - could overwrite already-assigned rides
- **No deduplication** - same external driver could be assigned multiple active rides
- **No audit trail** - no record of who assigned or when
- **No verification** - driver name/plate not verified against any system

**Recommendation:**
```typescript
const assignDriverMutation = useMutation({
  mutationFn: async ({ rideId, name, plate }: { rideId: string; name: string; plate: string }) => {
    // 1. Verify ride exists and is in pending state
    const { data: ride, error: rideError } = await supabase
      .from("rides")
      .select("status, driver_id")
      .eq("id", rideId)
      .single();
    
    if (rideError) throw new Error("Ride not found");
    if (ride.status !== "pending") throw new Error("Ride is not pending assignment");
    if (ride.driver_id) throw new Error("Ride already has assigned driver");
    
    // 2. Get current user for audit trail
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    // 3. Update with audit trail
    const { error: updateError } = await supabase
      .from("rides")
      .update({
        external_driver_name: name.trim(),
        external_driver_plate: plate.toUpperCase().trim(),
        status: "accepted",
        assigned_by: user?.id,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", rideId);
    
    if (updateError) throw updateError;
  },
```

---

### 1.3 DriverProfileRepository.ts

#### Issue #10 (MAJOR): Silent Table-Not-Found Error Handling
**File:** [src/repositories/DriverProfileRepository.ts](src/repositories/DriverProfileRepository.ts#L102-L117)  
**Severity:** Major

```typescript
static async getSettings(driverId: string): Promise<DriverSettings | null> {
  try {
    const { data, error } = await (supabase as any)
      .from("driver_settings")
      .select("*")
      .eq("driver_id", driverId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return null; // Silently treat table-not-found as "no settings"
      }
      throw error;
    }
    return data as DriverSettings | null;
  } catch (error) {
    return null; // Catches all exceptions and hides real errors
  }
}
```

**Problems:**
- Catches ALL errors and returns null (including network errors, auth failures)
- `PGRST116` is "not found" (single row), but silently treating as success
- If table doesn't exist in production, silently continues (data loss scenario)
- No logging of actual failures makes debugging impossible
- Caller can't distinguish between "no settings" and "error occurred"

**Recommendation:**
```typescript
static async getSettings(driverId: string): Promise<DriverSettings | null> {
  try {
    const { data, error } = await (supabase as any)
      .from("driver_settings")
      .select("*")
      .eq("driver_id", driverId)
      .maybeSingle();

    if (error) {
      // Table doesn't exist - this is an application configuration issue
      if (error.code === '42P01') {
        console.error('Critical: driver_settings table does not exist', error);
        throw new Error(
          'System configuration error: driver settings table missing. Contact support.'
        );
      }
      
      // PGRST116 means no row found (this is expected)
      if (error.code === 'PGRST116') {
        return null;
      }
      
      // Any other error should be re-thrown
      throw new Error(`Failed to fetch driver settings: ${error.message}`);
    }
    
    return data as DriverSettings | null;
  } catch (error) {
    // Re-throw errors instead of silently returning null
    throw error;
  }
}
```

---

#### Issue #11 (MAJOR): File Upload Vulnerability - No Storage Validation
**File:** [src/repositories/DriverProfileRepository.ts](src/repositories/DriverProfileRepository.ts#L225-L255)  
**Severity:** Major

```typescript
static async uploadDocument(
  driverId: string,
  documentType: string,
  file: File,
  expiryDate?: string
): Promise<DriverDocument> {
  const fileName = `drivers/${driverId}/${documentType}/${Date.now()}-${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from("driver-documents")
    .upload(fileName, file, { upsert: true });
```

**Problems:**
- **No file type validation at repository level** (only in service)
- **`file.name` used directly** - could contain path traversal characters (`../`, `..\\`)
- **`upsert: true`** - previous documents can be overwritten silently
- **No file content validation** - could upload arbitrary files renamed as PDF
- **No size limit enforcement** at storage layer
- **No antivirus/malware scanning**

**Recommendation:**
```typescript
static async uploadDocument(
  driverId: string,
  documentType: string,
  file: File,
  expiryDate?: string
): Promise<DriverDocument> {
  // Sanitize filename - remove path components
  const safeFileName = file.name
    .split(/[\\/]/) // Split on forward or back slashes
    .pop() || 'document';
  
  // Remove dangerous characters
  const sanitized = safeFileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 255); // Limit length
  
  const storagePath = `drivers/${driverId}/${documentType}/${Date.now()}-${sanitized}`;
  
  // Verify file content matches extension
  const ext = sanitized.split('.').pop()?.toLowerCase();
  if (ext && !this.isValidFileExtension(ext, file.type)) {
    throw new Error('File extension does not match file type');
  }
  
  const { error: uploadError } = await supabase.storage
    .from("driver-documents")
    .upload(storagePath, file, { 
      upsert: false, // Don't overwrite existing files
      contentType: file.type,
    });
  
  if (uploadError) {
    if (uploadError.message.includes('already exists')) {
      throw new Error('Document already uploaded. Please delete it first.');
    }
    throw uploadError;
  }
  
  // ... rest of implementation
}

private static isValidFileExtension(
  ext: string, 
  mimeType: string
): boolean {
  const validMappings: Record<string, string[]> = {
    'pdf': ['application/pdf'],
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
  };
  
  return (validMappings[ext] || []).includes(mimeType);
}
```

---

## 2. DRIVER COMPONENTS ANALYSIS

### 2.1 DriverDashboard.tsx

#### Issue #12 (CRITICAL): Race Condition in Status Toggle
**File:** [src/pages/driver/DriverDashboard.tsx](src/pages/driver/DriverDashboard.tsx#L95-L109)  
**Severity:** Critical

```typescript
useEffect(() => {
  if (driver) {
    setDriverId(driver.id);
    setOnline(driver.status === "available" || driver.status === "busy");
  }
}, [driver, setDriverId, setOnline]);

const toggleMutation = useMutation({
  mutationFn: async (online: boolean) => {
    const newStatus = online ? "available" : "offline";
    await supabase.from("drivers").update({ status: newStatus }).eq("id", driverId!);
  },
  onSuccess: (_, online) => {
    setOnline(online); // Updates local state BEFORE server confirmed
    queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
  },
});
```

**Problems:**
- Local state updated before server response (optimistic update without verify)
- If server update fails, local state is inconsistent with database
- Multiple rapid clicks could create state divergence
- No timeout handling - if request hangs, UI shows wrong status forever
- `useEffect` could overwrite user's toggle if driver data refetches

**Recommendation:**
```typescript
const toggleMutation = useMutation({
  mutationFn: async (online: boolean) => {
    const newStatus = online ? "available" : "offline";
    
    // Pessimistic update: don't update local state until confirmed
    const { data, error } = await supabase
      .from("drivers")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", driverId!)
      .select('status')
      .single();
    
    if (error) throw error;
    if (data.status !== newStatus) {
      throw new Error('Server update failed to apply');
    }
    
    return data;
  },
  onSuccess: (data) => {
    // Only update local state after server confirms
    setOnline(data.status === "available" || data.status === "busy");
    queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
  },
  onError: () => {
    // Revert UI state on error
    queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
  },
});

// Fix the useEffect to not overwrite toggle
useEffect(() => {
  if (driver && driver.id) {
    setDriverId(driver.id);
    // Only set if no pending mutation
    if (!toggleMutation.isPending) {
      setOnline(driver.status === "available" || driver.status === "busy");
    }
  }
}, [driver?.id, toggleMutation.isPending]);
```

---

#### Issue #13 (MAJOR): No Vehicle Selection Validation
**File:** [src/pages/driver/DriverDashboard.tsx](src/pages/driver/DriverDashboard.tsx#L135-L155)  
**Severity:** Major

```typescript
<Select value={driver.current_vehicle_id || ""} onValueChange={(val) => updateVehicleMutation.mutate(val)}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Pilih Kendaraan" />
  </SelectTrigger>
  <SelectContent>
    {vehicles.length > 0 ? (
      vehicles.map((v) => (
        <SelectItem key={v.id} value={v.id}>
          {v.model} ({v.plate_number}) - {v.vehicle_type}
        </SelectItem>
      ))
    ) : (
      <SelectItem value="none" disabled>Belum ada kendaraan terdaftar</SelectItem>
    )}
  </SelectContent>
</Select>
```

**Problems:**
- No validation that selected vehicle belongs to this driver
- No check if vehicle is verified/approved
- No check if vehicle documents are not expired
- Driver can select unverified vehicles and start accepting rides
- No atomic check-before-select to prevent race conditions

**Recommendation:**
```typescript
const updateVehicleMutation = useMutation({
  mutationFn: async (vehicleId: string) => {
    // 1. Verify vehicle belongs to this driver and is verified
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, driver_id, is_verified")
      .eq("id", vehicleId)
      .eq("driver_id", driverId!)
      .single();
    
    if (vehicleError) throw new Error("Vehicle not found");
    if (!vehicle.is_verified) throw new Error("Vehicle is not verified");
    
    // 2. Check if documents are not expired
    const { data: docs, error: docsError } = await supabase
      .from("vehicle_documents")
      .select("expiry_date, status")
      .eq("vehicle_id", vehicleId)
      .eq("status", "verified");
    
    if (docsError) throw docsError;
    
    const now = new Date();
    const expired = docs?.some(d => d.expiry_date && new Date(d.expiry_date) < now);
    if (expired) {
      throw new Error("Vehicle has expired documents");
    }
    
    // 3. Update driver vehicle assignment
    const { error: updateError } = await supabase
      .from("drivers")
      .update({ current_vehicle_id: vehicleId })
      .eq("id", driverId!);
    
    if (updateError) throw updateError;
  },
  onSuccess: () => {
    toast.success("Vehicle selected successfully");
    queryClient.invalidateQueries({ queryKey: ["driver-profile"] });
  },
  onError: (err: any) => {
    toast.error(err.message || "Failed to select vehicle");
  },
});
```

---

#### Issue #14 (MAJOR): Missing Location Permission Check
**File:** [src/pages/driver/DriverDashboard.tsx](src/pages/driver/DriverDashboard.tsx#L115)  
**Severity:** Major

```typescript
useDriverLocation();
```

**Problems:**
- No check if geolocation permission is granted
- Silent failure if user denies location permission
- No fallback if GPS unavailable
- No error handling for location service failures
- Could show driver as "online" but location not updating

**Recommendation:**
```typescript
useEffect(() => {
  if (!navigator.geolocation) {
    toast.error("Geolocation tidak didukung browser Anda");
    return;
  }
  
  // Check permission before enabling
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'denied') {
        toast.error("Aktifkan izin lokasi untuk menjadi online");
        setOnline(false);
      }
    });
  }
}, []);

useDriverLocation();
```

---

### 2.2 DriverActiveRide.tsx

#### Issue #15 (MAJOR): No Stale Ride Data Detection
**File:** [src/pages/driver/DriverActiveRide.tsx](src/pages/driver/DriverActiveRide.tsx#L42-L62)  
**Severity:** Major

```typescript
const { data: ride, isLoading } = useQuery({
  queryKey: ["active-ride", currentRideId],
  queryFn: async () => {
    const id = currentRideId;
    if (!id && driverId) {
      const { data } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", driverId)
        .in("status", ["accepted", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      // ...
    }
    // ...
  },
  enabled: !!currentRideId || !!driverId,
  refetchInterval: 5000,
});
```

**Problems:**
- Refetch interval (5000ms) is too long for ride tracking - events could be missed
- No `staleTime` setting - always fetches even if recent data exists
- `refetchInterval` doesn't account for ride status (should be faster when in_progress)
- If ride completes, component still re-fetches old ride_id

**Recommendation:**
```typescript
const { data: ride, isLoading } = useQuery({
  queryKey: ["active-ride", currentRideId],
  queryFn: async () => {
    // ... same fetch logic
  },
  enabled: !!currentRideId || !!driverId,
  staleTime: 2000, // Data is fresh for 2 seconds
  refetchInterval: (data) => {
    // Adaptive refetch interval based on ride status
    if (!data) return false; // Don't refetch if no data
    
    switch (data.status) {
      case 'accepted':
        return 3000; // 3 seconds for accepted (driver heading to pickup)
      case 'in_progress':
        return 2000; // 2 seconds for active ride
      case 'completed':
      case 'cancelled':
        return false; // Stop polling when done
      default:
        return 5000;
    }
  },
});
```

---

#### Issue #16 (MAJOR): No Ride Completion Compensation
**File:** [src/pages/driver/DriverActiveRide.tsx](src/pages/driver/DriverActiveRide.tsx#L102-118)  
**Severity:** Major

```typescript
const updateStatusMutation = useMutation({
  mutationFn: async (newStatus: string) => {
    if (newStatus === "completed") {
      const { data, error } = await supabase.functions.invoke("complete-ride", { body: { ride_id: ride!.id } });
      if (error) throw error;
      return data;
    }
    const { error } = await supabase.from("rides").update({ status: newStatus as any }).eq("id", ride!.id);
    if (error) throw error;
  },
```

**Problems:**
- Edge function `complete-ride` called but not examined
- No visible confirmation that earnings were calculated and recorded
- No error handling for earning calculation failures
- If edge function fails partially (ride marked complete but no earnings), no recovery
- Driver has no confirmation that they'll be paid

**Recommendation:**
```typescript
const updateStatusMutation = useMutation({
  mutationFn: async (newStatus: string) => {
    if (newStatus === "completed") {
      // Call completion function which should:
      // 1. Mark ride as completed
      // 2. Calculate earnings
      // 3. Create driver_earnings record
      // 4. Trigger payment settlement
      const { data, error } = await supabase.functions.invoke("complete-ride", { 
        body: { ride_id: ride!.id },
      });
      
      if (error) {
        console.error("Completion error:", error);
        throw new Error("Gagal menyelesaikan ride. Hubungi support jika masalah berlanjut.");
      }
      
      // Verify earnings were recorded
      if (!data?.earnings?.id) {
        throw new Error("Earnings tidak tercatat. Hubungi support.");
      }
      
      return data;
    }
    // ... other statuses
  },
  onSuccess: (_, newStatus) => {
    if (newStatus === "completed") {
      toast.success(`Ride selesai! Earnings: Rp ${fmt(ride!.fare)}`);
    }
    // ...
  },
});
```

---

### 2.3 DriverEarnings.tsx

#### Issue #17 (MAJOR): No Withdrawal Validation or Minimum Amount
**File:** [src/pages/driver/DriverEarnings.tsx](src/pages/driver/DriverEarnings.tsx#L55-L72)  
**Severity:** Major

```typescript
const withdrawMutation = useMutation({
  mutationFn: async () => {
    const { data, error } = await supabase.functions.invoke("withdraw-earnings", {
      body: { driver_id: driverId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },
```

**Problems:**
- No client-side validation of minimum withdrawal amount
- No check if pending earnings exist before withdrawal
- No frequency limit (driver could spam withdrawal requests)
- No bank account validation before payment
- No confirmation dialog showing deductions/fees
- Could allow withdrawals when insufficient funds

**Recommendation:**
```typescript
const MIN_WITHDRAWAL_AMOUNT = 50000; // Rp 50,000 minimum
const WITHDRAWAL_COOLDOWN_HOURS = 24;

const withdrawMutation = useMutation({
  mutationFn: async () => {
    // 1. Validate minimum amount
    if ((pendingTotal ?? 0) < MIN_WITHDRAWAL_AMOUNT) {
      throw new Error(
        `Saldo minimum untuk withdraw adalah Rp ${fmt(MIN_WITHDRAWAL_AMOUNT)}`
      );
    }
    
    // 2. Get driver's last withdrawal
    const { data: lastWithdraw } = await supabase
      .from("driver_withdrawals")
      .select("created_at")
      .eq("driver_id", driverId!)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (lastWithdraw) {
      const lastTime = new Date(lastWithdraw.created_at);
      const timeSinceLastWithdraw = Date.now() - lastTime.getTime();
      const hoursSinceLastWithdraw = timeSinceLastWithdraw / (1000 * 60 * 60);
      
      if (hoursSinceLastWithdraw < WITHDRAWAL_COOLDOWN_HOURS) {
        throw new Error(
          `Anda bisa withdraw lagi dalam ${Math.ceil(WITHDRAWAL_COOLDOWN_HOURS - hoursSinceLastWithdraw)} jam`
        );
      }
    }
    
    // 3. Get bank account
    const { data: bankAccount } = await supabase
      .from("driver_bank_accounts")
      .select("*")
      .eq("driver_id", driverId!)
      .eq("is_primary", true)
      .maybeSingle();
    
    if (!bankAccount) {
      throw new Error("Tambahkan akun bank terlebih dahulu");
    }
    
    // 4. Call withdrawal function
    const { data, error } = await supabase.functions.invoke("withdraw-earnings", {
      body: { 
        driver_id: driverId,
        amount: pendingTotal,
        bank_account_id: bankAccount.id,
      },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  },
  onSuccess: (data) => {
    toast.success(
      `Withdraw berhasil! Rp ${fmt(data.amount)} akan dikirim dalam 1-2 hari kerja`
    );
  },
});
```

---

### 2.4 DocumentVerification.tsx

#### Issue #18 (MAJOR): No Document Expiry Checking
**File:** [src/components/driver/profile/DocumentVerification.tsx](src/components/driver/profile/DocumentVerification.tsx)  
**Severity:** Major

```typescript
const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
  // ...file validation...
  uploadDocumentMutation.mutate({ documentType: type, file });
};
```

**Problems:**
- Component accepts file but doesn't ask for expiry date
- No automatic expiry date extraction from document image (OCR)
- No warning if uploaded document is expired
- No validation that document date matches driver's info
- No verification that documents are recent (e.g., ID photo < 5 years old)

**Recommendation:**
```typescript
const [showExpiryInput, setShowExpiryInput] = useState<string | null>(null);
const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});

const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // For documents that require expiry dates
  if (['sim', 'ktp'].includes(type)) {
    setShowExpiryInput(type);
    // Could trigger OCR here to auto-extract date
    return;
  }
  
  uploadDocumentMutation.mutate({ documentType: type, file });
};

const handleExpirySubmit = (type: string, expiry: string) => {
  const expiryDate = new Date(expiry);
  
  if (expiryDate < new Date()) {
    toast.error("Dokumen sudah expired");
    return;
  }
  
  if (expiryDate.getFullYear() - new Date().getFullYear() > 10) {
    toast.error("Tanggal expire terlalu jauh di masa depan");
    return;
  }
  
  uploadDocumentMutation.mutate({ 
    documentType: type, 
    file: currentFile,
    expiry: expiryDate.toISOString().split('T')[0],
  });
  
  setShowExpiryInput(null);
};
```

---

## 3. HOOKS ANALYSIS

### 3.1 useDriverLocation.ts

#### Issue #19 (CRITICAL): Excessive Location Update Rate Without Rate Limiting
**File:** [src/hooks/useDriverLocation.ts](src/hooks/useDriverLocation.ts#L14-L35)  
**Severity:** Critical

```typescript
useEffect(() => {
  // ...
  updateLocation();
  intervalRef.current = window.setInterval(updateLocation, 10000);
  // ...
}, [isOnline, driverId]);

const updateLocation = () => {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      if (lastPos.current?.lat === lat && lastPos.current?.lng === lng) return;
      lastPos.current = { lat, lng };
      const { error } = await supabase
        .from("drivers")
        .update({ current_lat: lat, current_lng: lng })
        .eq("id", driverId);
```

**Problems:**
- Updates every **10 seconds** = 360 updates per hour per driver
- With 100 drivers online = **36,000 database writes/hour**
- No batching or throttling
- Comparison only uses exact lat/lng match (floating point precision issue)
- Each update triggers realtime subscriptions for ALL riders watching that driver
- Could cause Supabase billing spike or rate limiting

**Recommendation:**
```typescript
const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds
const LOCATION_CHANGE_THRESHOLD = 0.0005; // ~50 meters
const MAX_GEOLOCATION_TIMEOUT = 8000; // 8 seconds

export function useDriverLocation() {
  const { isOnline, driverId } = useDriverStore();
  const intervalRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOnline || !driverId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateLocation = async () => {
      // Skip if less than 30 seconds since last update
      const now = Date.now();
      if (now - lastUpdateRef.current < LOCATION_UPDATE_INTERVAL) {
        return;
      }

      return new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const lastPos = lastPosRef.current;

            // Only update if moved more than threshold
            if (lastPos) {
              const latDiff = Math.abs(latitude - lastPos.lat);
              const lngDiff = Math.abs(longitude - lastPos.lng);

              if (latDiff < LOCATION_CHANGE_THRESHOLD && 
                  lngDiff < LOCATION_CHANGE_THRESHOLD) {
                resolve(); // Skip update, significant movement not detected
                return;
              }
            }

            lastPosRef.current = { lat: latitude, lng: longitude };
            lastUpdateRef.current = now;

            const { error } = await supabase
              .from("drivers")
              .update({
                current_lat: latitude,
                current_lng: longitude,
                location_updated_at: new Date().toISOString(),
              })
              .eq("id", driverId);

            if (error) {
              console.error("Location update failed:", error);
            }

            resolve();
          },
          (err) => {
            console.warn("Geolocation error:", err.message);
            resolve();
          },
          {
            enableHighAccuracy: true,
            timeout: MAX_GEOLOCATION_TIMEOUT,
            maximumAge: 10000, // Accept cached position if <10s old
          }
        );
      });
    };

    // Initial update
    updateLocation();

    // Set interval
    intervalRef.current = window.setInterval(updateLocation, LOCATION_UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOnline, driverId]);
}
```

---

### 3.2 useDriverTracking.ts

#### Issue #20 (MAJOR): Missing Realtime Subscription Cleanup
**File:** [src/hooks/useDriverTracking.ts](src/hooks/useDriverTracking.ts#L23-L60)  
**Severity:** Major

```typescript
const channel = supabase
  .channel("driver-locations")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "drivers" },
    (payload) => {
      // ...driver filtering logic...
    }
  )
  .subscribe();

return () => {
  supabase.removeChannel(channel); // Only removes, doesn't unsubscribe
};
```

**Problems:**
- `removeChannel()` without explicit `unsubscribe()` leaves connection hanging
- Subscribes to ALL driver changes, not just online drivers
- Receives DELETE events even though not filtering deleted drivers
- Multiple hook instances create multiple subscriptions to same channel
- No error handling for subscription failures

**Recommendation:**
```typescript
export function useDriverTracking(enabled: boolean = true) {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    // Fetch initial available drivers
    const fetchDrivers = async () => {
      try {
        const { data, error } = await supabase
          .from("drivers")
          .select("id, full_name, current_lat, current_lng, status")
          .eq("status", "available")
          .not("current_lat", "is", null)
          .not("current_lng", "is", null);
        
        if (error) throw error;
        setDrivers((data || []) as DriverLocation[]);
      } catch (error) {
        console.error("Failed to fetch initial drivers:", error);
      }
    };

    fetchDrivers();

    // Subscribe to only available drivers with valid coordinates
    channelRef.current = supabase
      .channel("driver-locations", {
        config: { broadcast: { self: true } },
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drivers",
          filter: "status=eq.available",
        },
        (payload) => {
          const driver = payload.new as DriverLocation;

          // Verify coordinates are valid
          if (!driver.current_lat || !driver.current_lng) {
            setDrivers((prev) =>
              prev.filter((d) => d.id !== driver.id)
            );
            return;
          }

          setDrivers((prev) => {
            const idx = prev.findIndex((d) => d.id === driver.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = driver;
              return updated;
            }
            return [...prev, driver];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drivers",
          filter: "status=neq.available",
        },
        (payload) => {
          // Remove drivers that go offline/busy
          const driver = payload.new as DriverLocation;
          setDrivers((prev) =>
            prev.filter((d) => d.id !== driver.id)
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIPTION_ERROR") {
          console.error("Driver tracking subscription failed");
        }
      });

    return () => {
      // Properly unsubscribe and remove
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [enabled]);

  return drivers;
}
```

---

### 3.3 useIncomingRide.ts

#### Issue #21 (MAJOR): Audio Permission Requested Without User Gesture
**File:** [src/hooks/useIncomingRide.ts](src/hooks/useIncomingRide.ts#L60-L73)  
**Severity:** Major

```typescript
useEffect(() => {
  if (isOnline && !hasRequestedPermission.current && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
    hasRequestedPermission.current = true;
  }
}, [isOnline]);
```

**Problems:**
- Requesting notification permission in effect (not user-initiated)
- Modern browsers may reject this
- No way for user to decline gracefully
- Audio playback will also fail in modern browsers without user gesture
- Requesting notification permission on every component mount

**Recommendation:**
```typescript
export function useIncomingRide() {
  const { driverId, isOnline, setCurrentRideId } = useDriverStore();
  const hasRequestedPermission = useRef(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  // Request permission on user action, not automatically
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      console.warn("Notifications not supported");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationEnabled(true);
      return;
    }

    if (Notification.permission === "default") {
      try {
        const permission = await Notification.requestPermission();
        setNotificationEnabled(permission === "granted");
        hasRequestedPermission.current = true;
      } catch (error) {
        console.error("Permission request failed:", error);
      }
    }
  };

  // Show confirmation dialog when driver goes online
  useEffect(() => {
    if (isOnline && !hasRequestedPermission.current) {
      const confirmed = window.confirm(
        "Aktifkan notifikasi untuk menerima ride? Suara akan diputar untuk ride baru."
      );
      if (confirmed) {
        requestNotificationPermission();
      }
    }
  }, [isOnline]);

  // Incoming ride subscription
  useEffect(() => {
    if (!driverId || !isOnline) return;

    const channel = supabase
      .channel(`driver-rides-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const ride = payload.new as any;
          if (ride.status === "accepted") {
            setCurrentRideId(ride.id);

            // Only play audio/notify if permissions granted
            if (notificationEnabled) {
              playNotificationSound();
              showBrowserNotification(
                "🚗 Ride Baru!",
                `Pickup: ${ride.pickup_address || "Menuju lokasi pickup"}`
              );
            } else {
              // Still show in-app toast even without notifications
              toast.info("🚗 Ride baru masuk!", {
                description: `Dari ${ride.pickup_address || "lokasi pickup"}`,
                duration: 10000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, isOnline, notificationEnabled]);
}
```

---

## 4. BUSINESS LOGIC ISSUES

### Issue #22 (CRITICAL): No Order Assignment Algorithm Documented
**File:** [src/pages/Ride.tsx](src/pages/Ride.tsx#L139-L142)  
**Severity:** Critical

```typescript
const { data: dispatchData, error: dispatchErr } = await supabase.functions.invoke("dispatch-driver", {
  body: { ride_id: ride.id },
});
```

**Problem:** The dispatch-driver edge function is called but:
- Algorithm for driver selection is unknown
- No documentation on how "best" driver is selected
- No preference rules (new drivers vs experienced, rating-based, etc.)
- No surge pricing integration
- No fairness mechanism (driver taking too many rides)
- No way to understand why a specific driver was chosen
- No fallback if no drivers available in real-time

**Recommendation:** Document dispatch algorithm:
```
/**
 * DISPATCH ALGORITHM
 * 
 * 1. Filter: Only available drivers with:
 *    - status = 'available' or 'busy'
 *    - verified documents
 *    - no expired vehicle documents
 *    - service area radius >= pickup location distance
 *    - rating >= 4.0
 *    - acceptance rate >= 70%
 * 
 * 2. Score: Calculate dispatch score based on:
 *    - Distance from pickup (weight: 50%)
 *    - ETA to pickup (weight: 30%)
 *    - Current load (if can multi-ride) (weight: 10%)
 *    - Driver rating (weight: 10%)
 * 
 * 3. Select: Top-scored driver (with tie-breaking by recency)
 * 
 * 4. Assign: Atomically:
 *    - Create ride_assignment record
 *    - Update ride.driver_id
 *    - Send notification to driver
 *    - Start timeout (10 seconds)
 *    
 * 5. Timeout: If driver doesn't accept in 10s:
 *    - Cancel assignment
 *    - Select next best driver
 *    - Retry up to 3 times
 *    - If all fail, add to queue
 */
```

---

### Issue #23 (CRITICAL): No Ride Cancellation Compensation
**File:** [src/pages/Ride.tsx](src/pages/Ride.tsx#L155)  
**Severity:** Critical

```typescript
else if (newStatus === "cancelled") { 
  setRideStatus("cancelled"); 
  toast.error("Ride was cancelled."); 
}
```

**Problems:**
- No compensation for drivers who accepted and started heading to pickup
- No partial payment if driver made progress
- No mechanism to dispute false cancellations
- Driver gets 0 earnings if rider cancels after 5 minutes of driving to pickup
- No minimum cancellation fee enforcement

**Recommendation:**
```
CANCELLATION POLICY (to be implemented):

1. Cancellation by Rider BEFORE driver acceptance:
   - Free (no charge to rider, no pay to driver)

2. Cancellation by Rider AFTER driver acceptance, BEFORE pickup:
   - If < 2 minutes: Free
   - If 2-5 minutes: Rp 10,000 (50% to driver)
   - If > 5 minutes: Rp 25,000 (75% to driver)

3. Cancellation by Rider AFTER pickup started:
   - Full trip fare at 50% rate (minimum Rp 15,000)

4. Cancellation by Driver:
   - First cancel: No penalty
   - Second cancel within 24h: -Rp 5,000 from earnings
   - Third cancel within 24h: -Rp 10,000 + blocked 1 hour

5. No-show (Driver doesn't arrive):
   - Rider refunded 100%
   - Driver gets 0
   - Driver acceptance rate -5%
```

---

### Issue #24 (MAJOR): No Rating/Review System
**File:** Driver module  
**Severity:** Major

```typescript
// Rating data exists in database but not used in driver module
interface DriverProfile {
  rating?: number; // Only shown, never updated
}

interface RideRatings {
  rating: number; // Defined in types but not referenced
  star_rating: number;
}
```

**Problems:**
- Drivers have `rating` field but it's never updated after ride completion
- No mechanism to collect rider ratings for driver
- No mechanism for drivers to rate riders
- No feedback text (only star rating)
- No dispute resolution for bad ratings
- Could harm driver reputation unfairly

**Recommendation:** Implement after ride completion:
```typescript
// In RideRatingDialog component (to be implemented)
export function RideRatingDialog({ 
  rideId, 
  driverId, 
  onClose 
}: {
  rideId: string;
  driverId: string;
  onClose: () => void;
}) {
  const [riderRating, setRiderRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  const submitRating = async () => {
    // Save rider rating for driver
    const { error: riderRatingError } = await supabase
      .from("ride_ratings")
      .insert({
        ride_id: rideId,
        driver_id: driverId,
        rating: riderRating,
        star_rating: riderRating,
        feedback,
        created_at: new Date().toISOString(),
      });

    // Update driver's average rating
    if (!riderRatingError) {
      const { data: allRatings } = await supabase
        .from("ride_ratings")
        .select("star_rating")
        .eq("driver_id", driverId);

      if (allRatings && allRatings.length > 0) {
        const avgRating = allRatings.reduce((sum, r) => sum + r.star_rating, 0) / allRatings.length;
        
        await supabase
          .from("drivers")
          .update({ rating: Math.round(avgRating * 10) / 10 })
          .eq("id", driverId);
      }
    }

    // Also save driver rating for rider
    await supabase
      .from("ride_ratings")
      .insert({
        ride_id: rideId,
        rider_id: user.id,
        rating: driverRating,
      });

    onClose();
  };

  // ... JSX for rating UI
}
```

---

### Issue #25 (MAJOR): No Driver Availability Status Rules
**File:** [src/stores/driverStore.ts](src/stores/driverStore.ts)  
**Severity:** Major

```typescript
interface DriverState {
  isOnline: boolean;
  // Missing: availability windows, service zones, vehicle capacity
}
```

**Problems:**
- Driver can be online 24/7 without restrictions
- No auto-offline based on working hours settings
- No enforcement of service area radius
- No vehicle capacity enforcement (can accept unlimited passengers)
- No surge pricing availability adjustment
- No fatigue/break time enforcement

**Recommendation:**
```typescript
// Enhanced driver state with proper availability logic
interface DriverAvailability {
  status: "available" | "busy" | "offline" | "on_break" | "unavailable";
  reason?: string; // "fatigue", "maintenance", "no_vehicle"
  available_until?: Date;
  current_ride_id?: string | null;
  rides_completed_today: number;
  total_hours_online_today: number;
}

// Availability validator
class DriverAvailabilityManager {
  static canAcceptRide(driver: DriverProfile, settings: DriverSettings): {
    canAccept: boolean;
    reason?: string;
  } {
    // 1. Check if within working hours
    if (settings.working_hours_enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const [startHour] = settings.working_hours_start.split(":").map(Number);
      const [endHour] = settings.working_hours_end.split(":").map(Number);
      
      if (currentHour < startHour || currentHour >= endHour) {
        return { 
          canAccept: false, 
          reason: `Outside working hours (${settings.working_hours_start}-${settings.working_hours_end})` 
        };
      }
    }

    // 2. Check day of week
    const dayIndex = new Date().getDay();
    const dayAvailable = [
      settings.available_sunday,
      settings.available_monday,
      settings.available_tuesday,
      settings.available_wednesday,
      settings.available_thursday,
      settings.available_friday,
      settings.available_saturday,
    ][dayIndex];

    if (!dayAvailable) {
      return { canAccept: false, reason: `Not available on this day` };
    }

    // 3. Check fatigue (max 12 hours continuous, max 10 hours ride time)
    // ... implementation

    // 4. Check vehicle availability
    // ... implementation

    return { canAccept: true };
  }
}
```

---

### Issue #26 (MAJOR): Missing Transaction Safety for Earnings Recording
**File:** Database schema (inferred)  
**Severity:** Major

**Problem:**
```sql
-- Current: Two separate operations, not atomic
UPDATE rides SET status = 'completed' WHERE id = $1;
INSERT INTO driver_earnings (driver_id, ride_id, net_earning, ...) VALUES (...);
```

If second operation fails, ride is marked complete but driver gets no earnings.

**Recommendation:**
```sql
-- Implement atomic transaction via Edge Function:
-- complete-ride function should:

BEGIN TRANSACTION;

  -- 1. Verify ride exists and is in progress
  SELECT * FROM rides WHERE id = $1 FOR UPDATE;
  
  -- 2. Calculate earnings atomically
  WITH calculation AS (
    SELECT 
      driver_id,
      fare,
      CAST(fare * 0.15 AS DECIMAL) as commission, -- 15% platform fee
      CAST(fare * 0.85 AS DECIMAL) as net_earning
    FROM rides WHERE id = $1
  )
  -- 3. Record earnings
  INSERT INTO driver_earnings 
    (driver_id, ride_id, gross_fare, commission_amount, net_earning, status)
  SELECT driver_id, $1, fare, commission, net_earning, 'pending'
  FROM calculation;
  
  -- 4. Update ride status
  UPDATE rides SET status = 'completed' WHERE id = $1;
  
  -- 5. Update driver stats atomically
  UPDATE drivers SET total_completed_rides = total_completed_rides + 1 WHERE id = (SELECT driver_id FROM rides WHERE id = $1);

COMMIT;
```

---

## 5. CODE QUALITY ISSUES

### Issue #27 (MINOR): Inconsistent Error Handling Patterns
**Files:** Multiple  
**Severity:** Minor

```typescript
// Pattern 1: Silent catch
catch (error) {
  return null;
}

// Pattern 2: Throw
catch (error) {
  throw error;
}

// Pattern 3: Specific handling
catch (error) {
  if (error.code === '42P01') {
    // handle
  }
}
```

**Recommendation:** Standardize to:
```typescript
try {
  // operation
} catch (error) {
  const err = error as PostgrestError;
  
  if (err.code === 'PGRST116') {
    // Not found - return null or empty
    return null;
  }
  
  if (err.code === '42P01') {
    // Table not found - config error
    console.error('Database schema error:', err);
    throw new Error('System configuration error - contact support');
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', err);
  throw new Error(`Operation failed: ${err.message}`);
}
```

---

### Issue #28 (MINOR): Missing Loading/Error States in Components
**File:** Multiple component files  
**Severity:** Minor

```typescript
// Missing intermediate states
if (isLoading) return <DriverPageSkeleton />;
if (!driver) return <error state>;
// No error state shown
```

**Recommendation:** Add error boundaries and states:
```typescript
if (isLoading) return <DriverPageSkeleton />;

if (error) {
  return (
    <Card className="border-destructive">
      <CardContent className="p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <div>
          <p className="font-semibold">Error loading profile</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button size="sm" onClick={() => refetch()} className="mt-2">
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

if (!driver) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-muted-foreground">Driver profile not found</p>
      </CardContent>
    </Card>
  );
}
```

---

### Issue #29 (MINOR): No Type Safety for Database Responses
**Files:** Multiple  
**Severity:** Minor

```typescript
const { data } = await supabase
  .from("drivers")
  .select("*")
  .maybeSingle();

return data as DriverProfile; // Unsafe cast
```

**Recommendation:** Use Zod for validation:
```typescript
import { z } from 'zod';

const DriverProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  full_name: z.string().min(1),
  phone: z.string(),
  status: z.enum(['available', 'busy', 'offline']),
  rating: z.number().min(0).max(5).nullable(),
  // ... other fields
});

const { data } = await supabase
  .from("drivers")
  .select("*")
  .maybeSingle();

const validData = DriverProfileSchema.parse(data);
return validData;
```

---

### Issue #30 (MINOR): No Telemetry/Analytics Integration
**File:** Entire driver module  
**Severity:** Minor

**Problem:** No way to track:
- Driver onboarding funnel (drop-off rates)
- Average time between accepting and completing rides
- Peak online hours
- Driver satisfaction (NPS)
- Feature usage (auto-accept, service area, etc.)

**Recommendation:** Add analytics tracking:
```typescript
// Create analytics service
class DriverAnalytics {
  static trackDriverOnline(driverId: string) {
    analytics.track('driver_went_online', { driver_id: driverId });
  }
  
  static trackRideAccepted(driverId: string, rideId: string) {
    analytics.track('driver_accepted_ride', { 
      driver_id: driverId, 
      ride_id: rideId,
      timestamp: new Date().toISOString()
    });
  }
  
  static trackRideCompleted(driverId: string, rideId: string, earnings: number) {
    analytics.track('ride_completed', {
      driver_id: driverId,
      ride_id: rideId,
      earnings,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

## SUMMARY BY SEVERITY

### 🔴 CRITICAL (8 issues)
1. Unsafe license number validation
2. Unvalidated coordinates in fare calculation
3. N+1 query pattern in statistics
4. Race condition in status toggle
5. Excessive location update rate (database abuse)
6. No order assignment algorithm documented
7. No ride cancellation compensation
8. Missing transaction safety for earnings

### 🟠 MAJOR (12 issues)
1. Settings initialization race condition
2. No error recovery for age calculation
3. Payment method validation incomplete
4. Inconsistent count/data in pagination
5. Manual driver assignment without validation
6. Silent table-not-found error handling
7. File upload vulnerability
8. No vehicle selection validation
9. Missing location permission check
10. No stale ride data detection
11. No withdrawal validation
12. No document expiry checking

### 🟡 MINOR (10 issues)
1. Plate number regex too restrictive
2. Inconsistent error handling patterns
3. Missing loading/error states
4. No type safety for database responses
5. No telemetry/analytics
6. Missing realtime subscription cleanup
7. Audio permission without user gesture
8. No rating/review system
9. No driver availability status rules
10. N+1 query pattern in admin service

---

## IMPLEMENTATION PRIORITY

**Phase 1 (Week 1) - Critical Issues:**
- Fix coordinates validation (#2)
- Fix location update rate limiting (#19)
- Fix race condition in status toggle (#12)
- Document dispatch algorithm (#22)

**Phase 2 (Week 2) - High-Impact Major Issues:**
- Fix database query optimization (#7, #8)
- Fix error handling patterns (#10)
- Fix transaction safety (#26)
- Add withdrawal validation (#17)

**Phase 3 (Week 3) - Remaining Major Issues:**
- Fix file upload security (#11)
- Add vehicle validation (#13)
- Add location permission checks (#14)
- Add cancellation compensation (#23)

**Phase 4 (Week 4) - Minor Issues & Polish:**
- Type safety improvements (#29)
- Analytics integration (#30)
- UI/UX improvements
- Documentation

---

## RECOMMENDATIONS

1. **Add Rate Limiting:** Implement global rate limiter for Supabase queries
2. **Add Monitoring:** Set up alerts for location update rates and N+1 queries
3. **Add Audit Logging:** Track all manual driver assignments and earnings changes
4. **Add Testing:** Unit tests for business logic, E2E tests for ride flow
5. **Add Documentation:** Create runbook for dispatch algorithm, cancellation policies
6. **Add RLS Policies:** Ensure Supabase RLS policies match permission checks
7. **Code Review Process:** Implement before-merge review focusing on data consistency

---

**Report Generated:** April 15, 2026  
**Total Issues:** 30 (8 Critical, 12 Major, 10 Minor)  
**Recommended Fix Time:** 4 weeks
