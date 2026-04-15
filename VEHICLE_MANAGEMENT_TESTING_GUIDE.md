# Vehicle Management - Testing & Validation Guide

## 🧪 TEST COVERAGE REQUIREMENTS

### Unit Tests (Backend - DriverProfileService)

#### Test Suite 1: Vehicle Creation & Validation
```typescript
describe('DriverProfileService.createVehicle', () => {
  // ✅ Existing validation tests needed
  test('should validate plate number format (Indonesian)', () => {
    expect(() => createVehicle('ABC1234')).toThrow('Invalid plate format');
    expect(() => createVehicle('B 1234 ABC')).not.toThrow();
  });

  test('should validate year (1900 to current+1)', () => {
    expect(() => createVehicle({ year: 1800 })).toThrow();
    expect(() => createVehicle({ year: 2026 })).not.toThrow();
  });

  test('should validate capacity (1-50)', () => {
    expect(() => createVehicle({ capacity: 0 })).toThrow();
    expect(() => createVehicle({ capacity: 51 })).toThrow();
    expect(() => createVehicle({ capacity: 4 })).not.toThrow();
  });

  // ❌ MISSING: New tests needed
  test('should set is_verified = false on creation', () => {
    const vehicle = await createVehicle(validData);
    expect(vehicle.is_verified).toBe(false);
  });

  test('should require associated documents before verification', () => {
    const vehicle = await createVehicle(validData);
    expect(vehicle.is_verified).toBe(false);
    // Would verify after admin review
  });
});
```

#### Test Suite 2: Document Expiry Validation
```typescript
describe('DriverProfileService.validateVehicleDocuments', () => {
  // ❌ MISSING: All tests needed
  test('should detect expired documents', () => {
    const expiredDoc = {
      status: 'verified',
      expiry_date: '2025-01-01', // Past date
    };
    const result = await validateVehicleDocuments(vehicleId);
    expect(result.isValid).toBe(false);
    expect(result.expiredDocs).toContain('stnk');
  });

  test('should flag documents expiring within 30 days', () => {
    const expiringDoc = {
      status: 'verified',
      expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    };
    const result = await validateVehicleDocuments(vehicleId);
    expect(result.expiringDocs.length).toBe(1);
    expect(result.expiringDocs[0].daysLeft).toBe(15);
  });

  test('should return isValid = false if any doc expired', () => {
    // Mix of valid and expired
    const result = await validateVehicleDocuments(vehicleId);
    expect(result.isValid).toBe(false);
  });

  test('should return empty arrays if all docs valid', () => {
    const result = await validateVehicleDocuments(vehicleId);
    expect(result.isValid).toBe(true);
    expect(result.expiredDocs).toEqual([]);
    expect(result.expiringDocs).toEqual([]);
  });
});
```

#### Test Suite 3: Vehicle Eligibility Check
```typescript
describe('DriverProfileService.checkVehicleEligibilityForRide', () => {
  // ❌ MISSING: All tests needed
  test('should reject unverified vehicle', () => {
    const unverifiedVehicle = { is_verified: false };
    expect(() => checkVehicleEligibility(unverifiedVehicle))
      .toThrow('Vehicle not verified');
  });

  test('should reject vehicle with expired documents', () => {
    const vehicleWithExpiredDoc = { 
      is_verified: true,
      documents: [{ status: 'expired' }]
    };
    expect(() => checkVehicleEligibility(vehicleWithExpiredDoc))
      .toThrow('Vehicle has expired documents');
  });

  test('should reject vehicle with pending documents', () => {
    const vehicleWithPendingDoc = {
      is_verified: true,
      documents: [{ status: 'pending' }]
    };
    expect(() => checkVehicleEligibility(vehicleWithPendingDoc))
      .toThrow('Vehicle has pending documents');
  });

  test('should allow vehicle with all verified non-expired docs', () => {
    const eligibleVehicle = {
      is_verified: true,
      documents: [
        { document_type: 'stnk', status: 'verified', expiry_date: futureDate },
        { document_type: 'kir', status: 'verified', expiry_date: futureDate },
        { document_type: 'insurance', status: 'verified', expiry_date: futureDate },
      ]
    };
    expect(() => checkVehicleEligibility(eligibleVehicle))
      .not.toThrow();
  });
});
```

---

### Component Tests (Frontend - React Testing Library)

#### Test Suite 4: VehicleInfo Component
```typescript
describe('VehicleInfo Component', () => {
  // ⚠️ PARTIAL: Some tests may exist
  test('should display vehicle list', () => {
    const { getByText } = render(
      <VehicleInfo vehicles={[{ model: 'Toyota Avanza' }]} />
    );
    expect(getByText('Toyota Avanza')).toBeInTheDocument();
  });

  test('should show verification status badge', () => {
    const vehicles = [
      { id: '1', is_verified: true, model: 'Car A' },
      { id: '2', is_verified: false, model: 'Car B' },
    ];
    const { getByText } = render(<VehicleInfo vehicles={vehicles} />);
    expect(getByText('VERIFIED')).toBeInTheDocument();
    expect(getByText('PENDING')).toBeInTheDocument();
  });

  // ❌ MISSING: New tests needed
  test('should show document expiry warning', () => {
    const vehicleWithExpiringDoc = {
      id: '1',
      documents: [{ document_type: 'stnk', daysLeft: 15 }]
    };
    const { getByText } = render(
      <VehicleInfo vehicles={[vehicleWithExpiringDoc]} />
    );
    expect(getByText(/expires in 15 days/i)).toBeInTheDocument();
  });

  test('should disable selection for unverified vehicle', () => {
    const unverifiedVehicle = { id: '1', is_verified: false };
    const { getByText } = render(
      <VehicleInfo vehicles={[unverifiedVehicle]} />
    );
    expect(getByText('Gunakan Kendaraan Ini')).toBeDisabled();
  });

  test('should disable selection for vehicle with expired docs', () => {
    const expiredDocVehicle = {
      id: '1',
      is_verified: true,
      documents: [{ status: 'expired' }]
    };
    const { getByText } = render(
      <VehicleInfo vehicles={[expiredDocVehicle]} />
    );
    expect(getByText('Gunakan Kendaraan Ini')).toBeDisabled();
  });

  test('should validate plate format on input', async () => {
    const { getByPlaceholderText, getByText } = render(<VehicleInfo />);
    const plateInput = getByPlaceholderText('B 1234 ABC');
    
    fireEvent.change(plateInput, { target: { value: 'INVALID' } });
    fireEvent.click(getByText('Tambah Kendaraan'));
    
    expect(getByText(/format nomor polisi tidak valid/i)).toBeInTheDocument();
  });

  test('should show error when image exceeds 2MB', async () => {
    const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const { getByText } = render(<VehicleInfo />);
    
    // Trigger file input
    const fileInput = screen.getByRole('button', { name: /unggah foto/i });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    
    expect(getByText(/maksimal 2MB/i)).toBeInTheDocument();
  });
});
```

#### Test Suite 5: VehicleDocumentUpload Component (NEW)
```typescript
describe('VehicleDocumentUpload Component', () => {
  // ❌ MISSING: Component doesn't exist yet, but tests should be written for it
  test('should display upload boxes for all document types', () => {
    const { getByText } = render(
      <VehicleDocumentUpload vehicleId="123" />
    );
    expect(getByText(/STNK/i)).toBeInTheDocument();
    expect(getByText(/KIR/i)).toBeInTheDocument();
    expect(getByText(/Insurance/i)).toBeInTheDocument();
    expect(getByText(/Tax Paid/i)).toBeInTheDocument();
  });

  test('should accept expiry date for each document', () => {
    const { getByPlaceholderText } = render(
      <VehicleDocumentUpload vehicleId="123" />
    );
    const expiryInput = getByPlaceholderText(/expiry/i);
    expect(expiryInput).toBeInTheDocument();
  });

  test('should show upload progress', async () => {
    const { getByText, getByRole } = render(
      <VehicleDocumentUpload vehicleId="123" />
    );
    const file = new File(['content'], 'stnk.pdf', { type: 'application/pdf' });
    const fileInput = getByRole('input', { name: /upload/i });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(getByText(/uploading/i)).toBeInTheDocument();
  });

  test('should validate document expiry is in future', () => {
    const { getByText, getByPlaceholderText } = render(
      <VehicleDocumentUpload vehicleId="123" />
    );
    const expiryInput = getByPlaceholderText(/expiry/i);
    fireEvent.change(expiryInput, { target: { value: '2025-01-01' } });
    fireEvent.click(getByText(/upload/i));
    
    expect(getByText(/must be in future/i)).toBeInTheDocument();
  });

  test('should retry on upload failure', async () => {
    const mockUpload = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ url: 'https://...' });
    
    const { getByText } = render(
      <VehicleDocumentUpload vehicleId="123" />
    );
    
    // Simulate upload
    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledTimes(2); // First attempt + 1 retry
    });
  });
});
```

---

### Integration Tests (E2E - Playwright/Cypress)

#### Test Suite 6: Driver Vehicle Registration Journey
```gherkin
Feature: Driver Vehicle Registration and Verification

  Scenario: Complete vehicle registration workflow
    Given a driver is logged in
    When they navigate to Driver Profile > Vehicles
    And click "Tambah Kendaraan" button
    Then they see vehicle registration form
    
    When they enter valid vehicle data:
      | Field      | Value            |
      | Model      | Toyota Avanza    |
      | Plate      | B 1234 ABC       |
      | Year       | 2022             |
      | Capacity   | 4                |
    And upload vehicle photo
    And click "Tambah Kendaraan"
    Then vehicle is created with is_verified = false
    And status shows "PENDING VERIFICATION"
    
    When they navigate to Vehicle Documents tab
    Then they see upload fields for:
      | Document     | Status   |
      | STNK         | Missing  |
      | KIR          | Missing  |
      | Insurance    | Missing  |
      | Tax Paid     | Missing  |
    
    When they upload STNK document with expiry 2027-12-31
    And upload KIR document with expiry 2027-06-30
    And upload Insurance with expiry 2026-12-31
    And upload Tax Paid with expiry 2026-01-31
    Then all documents show status "PENDING VERIFICATION"
    
    When admin navigates to Vehicle Verification page
    Then they see vehicle in "Awaiting Verification" queue
    When admin reviews documents and clicks "Verify"
    Then vehicle status changes to "VERIFIED"
    And vehicle has audit log entry: "Verified by admin_name at timestamp"
    
    When driver selects this vehicle as active
    Then selection succeeds (vehicle is eligible)
    
    When driver accepts a ride
    Then ride is accepted (vehicle validation passed)
```

#### Test Suite 7: Document Expiry Enforcement
```gherkin
Feature: Document Expiry Management

  Scenario: Driver cannot use vehicle with expired documents
    Given a vehicle has all verified documents
    When 30 days before document expiry
    Then driver sees warning badge: "STNK expires in 30 days"
    
    When document expiry date passes
    Then vehicle status changes to "EXPIRED DOCUMENTS"
    And vehicle cannot be selected as active
    And driver cannot accept rides with this vehicle
    
    When driver uploads updated document
    Then status returns to "PENDING VERIFICATION"
    When admin verifies new document
    Then vehicle is eligible again

  Scenario: Auto-expiry trigger runs daily
    Given vehicle documents with various expiry dates
    When daily job runs at 00:00 UTC
    Then all documents with expiry_date < today are marked as 'expired'
    And vehicle.is_verified is set to false
    And all drivers with this vehicle get notification
```

#### Test Suite 8: Real-time Updates
```gherkin
Feature: Real-time Document Verification

  Scenario: Driver sees instant verification status
    Given driver has uploaded vehicle documents
    When admin verifies documents
    Then driver sees status update within 1 second
    And driver receives in-app notification "STNK verified"
    
  Scenario: Websocket connection maintained
    Given driver is on vehicle profile page
    When network disconnects for 30 seconds
    Then reconnect happens automatically
    When admin verifies documents during disconnect
    Then driver sees update immediately after reconnect
```

---

## ✅ MANUAL TESTING CHECKLIST

### Device Testing

- [ ] Desktop (Chrome, Firefox, Safari)
- [ ] Mobile (iOS Safari 13+)
- [ ] Mobile (Android Chrome 90+)
- [ ] Tablet (iPad, Android tablets)

### Network Conditions

- [ ] Fast 4G (25 Mbps)
- [ ] Slow 4G (5 Mbps)
- [ ] 3G (1 Mbps)
- [ ] Offline then online
- [ ] Upload timeout and recovery

### Vehicle Registration Flow

- [ ] Add vehicle with valid data ✅
- [ ] Validate plate format on blur ✅
- [ ] Show error for invalid year ✅
- [ ] Upload vehicle photo
  - [ ] Success with JPEG/PNG/WebP
  - [ ] Error for BMP/GIF
  - [ ] Error for file > 2MB
  - [ ] Compression on mobile
- [ ] Edit vehicle ✅
- [ ] Delete vehicle ✅
- [ ] Select vehicle as active
  - [ ] Success if verified + docs valid
  - [ ] Error if unverified
  - [ ] Error if docs expired

### Document Upload Flow (NEW)

- [ ] Upload STNK document
  - [ ] Show upload progress
  - [ ] Accept PDF/JPG/PNG
  - [ ] Reject if > 10MB
  - [ ] Require expiry date
  - [ ] Reject if expiry in past
- [ ] Upload KIR document ✅
- [ ] Upload Insurance ✅
- [ ] Verify document appears in list ✅
- [ ] Try replacing document
  - [ ] Old file replaced
  - [ ] Status reset to "pending"
- [ ] Retry on network failure
  - [ ] Auto-retry on timeout
  - [ ] Show retry count
  - [ ] Success after retry

### Admin Verification (NEW)

- [ ] Access vehicle verification dashboard
- [ ] See list of pending vehicles
  - [ ] Correct count
  - [ ] Sortable by date/vehicle
  - [ ] Searchable by driver name
- [ ] Review vehicle documents
  - [ ] Show all document types
  - [ ] Verify documents still accessible
- [ ] Verify vehicle
  - [ ] Status changes to "VERIFIED"
  - [ ] Audit log created
- [ ] Reject vehicle
  - [ ] Can enter rejection reason
  - [ ] Driver sees rejection notification
  - [ ] Driver can resubmit
- [ ] Bulk actions
  - [ ] Verify multiple vehicles
  - [ ] Reject multiple vehicles

### Document Expiry (NEW)

- [ ] Set document expiry date in past
- [ ] Vehicle status: "EXPIRED DOCUMENTS"
- [ ] Vehicle cannot be selected
- [ ] Driver sees warning badge
- [ ] Cannot accept rides
- [ ] Replace with new document
  - [ ] Status: "PENDING VERIFICATION"
  - [ ] Driver still can't use
- [ ] Admin verifies new doc
  - [ ] Vehicle eligible again

### Real-time Updates (NEW)

- [ ] Admin verifies doc
- [ ] Driver page updates < 1 second
- [ ] Show notification
- [ ] Pull down to refresh (mobile)
- [ ] Offline: Queue update, sync on reconnect
- [ ] Multiple drivers: Each sees own updates

### Performance

- [ ] Vehicle list loads < 2s
- [ ] Documents load < 2s
- [ ] Upload image < 5s on 4G
- [ ] Upload PDF < 10s on 4G
- [ ] No memory leaks (DevTools)
- [ ] No repeated DB queries (Network tab)

### Error Cases

- [ ] Upload non-image as photo
- [ ] Upload oversized photo
- [ ] Network error during upload
- [ ] Submit form with missing fields
- [ ] Delete vehicle in use
- [ ] Race condition: Select vehicle while verifying

### Analytics

- [ ] Track vehicle registration time
- [ ] Track document upload duration
- [ ] Track verification time
- [ ] Alert if verification > 48 hours

---

## 📊 TEST COVERAGE TARGETS

| Component | Unit | Integration | E2E | Total |
|-----------|------|-------------|-----|-------|
| Vehicle CRUD | 80% | 90% | 100% | 90% |
| Document Upload | 75% | 85% | 100% | 87% |
| Expiry Check | 90% | 90% | 100% | 93% |
| Admin Workflow | 70% | 80% | 90% | 80% |
| Real-time Updates | 60% | 85% | 100% | 82% |
| **OVERALL TARGET** | **75%** | **86%** | **98%** | **86%** |

---

## 🚀 DEPLOYMENT VALIDATION

### Pre-deployment Checklist

- [ ] All critical tests passing
- [ ] All major issues marked as fixed
- [ ] Code review approved by 2+ seniors
- [ ] Security review passed (no SQL injection, XSS, CSRF)
- [ ] Performance benchmarks met:
  - [ ] Vehicle load: < 2s
  - [ ] Document upload: < 10s
  - [ ] Admin verification: < 5s
- [ ] Database migrations tested on staging
- [ ] RLS policies verified
- [ ] Storage buckets created
- [ ] Monitoring setup (errors, latency)
- [ ] Rollback plan documented

### Smoke Tests (Post-deployment)

```bash
# Basic vehicle CRUD operations
curl -X GET /api/vehicles/{driverId}      # Should return 200
curl -X POST /api/vehicles                 # Should validate
curl -X PUT /api/vehicles/{id}             # Should require auth

# Document operations
curl -X POST /api/vehicle-documents        # Should validate
curl -X GET /api/vehicle-documents/{vehicleId} # Should return 200

# Admin operations
curl -X GET /api/admin/vehicles/pending    # Should require admin
curl -X POST /api/admin/vehicles/verify    # Should verify

# Real-time
WebSocket connection to /realtime/vehicle-docs should establish ✅
```

---

## 🎯 SUCCESS CRITERIA

Vehicle Management testing is complete when:

✅ **All unit tests passing** (90%+ coverage)  
✅ **All integration tests passing** (85%+ coverage)  
✅ **All E2E tests passing** (98%+ coverage)  
✅ **Manual testing checklist 100% complete**  
✅ **Performance benchmarks met**  
✅ **Security review passed**  
✅ **Staging deployment successful**  
✅ **Monitoring alerts configured**  
✅ **Rollback procedure documented**  
✅ **Team trained on new workflow**  

**Estimated Testing Effort:** 40-50 hours  
**Estimated Automation Effort:** 30-40 hours  
**Total QA Timeline:** 2-3 weeks
