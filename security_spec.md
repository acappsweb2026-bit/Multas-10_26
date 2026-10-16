# Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **Zero-Trust Global Catch-All**: The first rule inside `match /databases/{database}/documents` is `match /{document=**} { allow read, write: if false; }`.
2. **Identity & Ownership Invariant**: Every domain entity (`drivers`, `vehicles`, `fines`, `terms`) must contain an immutable `ownerId` string matching `request.auth.uid` upon creation and remaining unchanged on updates (`incoming().ownerId == existing().ownerId`).
3. **Verified Email Gate**: All mutations (`create`, `update`, `delete`) require `request.auth != null && request.auth.token.email_verified == true`.
4. **Admin Verification without Custom Claims**: Administrator privileges (`isAdmin()`) require a verified email (`email_verified == true`) and either an existing document at `/databases/$(database)/documents/admins/$(request.auth.uid)` or the bootstrapped runtime email (`ac.appsweb2026@gmail.com`). Users cannot self-assign admin records (`allow write: if false` on `/admins/{adminId}`).
5. **PII Isolation & Query Enforcement**: Collections containing PII (`cpf`, `cnhNumber`, `phone`, `email`) strictly restrict `get` to the document owner or verified admin, and `list` strictly enforces `existing().ownerId == request.auth.uid` without `get()`/`exists()` calls inside `allow list`.
6. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; on update, `createdAt` must equal `existing().createdAt` and `updatedAt` must equal `request.time`.
7. **Terminal State Locking**:
   - `drivers`: Once `existing().status == 'CASSADA'`, no updates are permitted unless `isAdmin()`.
   - `fines`: Once `existing().status == 'PAGA'`, no updates are permitted unless `isAdmin()`.
   - `terms`: Once `existing().status == 'ASSINADO'`, no updates are permitted unless `isAdmin()`.
8. **Strict Key & Size Boundaries**: Every `create` validates `hasAll` and `hasOnly` for allowed keys; every `update` begins with `isValid[Entity](incoming())` and restricts changed keys via `incoming().diff(existing()).affectedKeys().hasOnly(...)`. Every string check includes `.size()` bounds and ID regex validation (`^[a-zA-Z0-9_\-]+$`).

---

## 2. The "Dirty Dozen" Adversarial Payloads

### Payload 1: Identity Spoofing on Driver Creation (`ownerId` mismatch)
```json
{
  "collection": "/drivers/drv-01",
  "operation": "create",
  "auth": { "uid": "attacker-uid", "token": { "email": "attacker@test.com", "email_verified": true } },
  "data": {
    "id": "drv-01",
    "ownerId": "victim-uid",
    "name": "CARLOS SILVA",
    "cpf": "123.456.789-00",
    "cnhNumber": "12345678901",
    "cnhCategory": "E",
    "cnhExpiration": "2028-10-10",
    "currentPoints": 0,
    "status": "REGULAR",
    "phone": "(11) 99999-9999",
    "email": "carlos@frota.com.br",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 2: Unverified Email Spoofing Bootstrapped Admin
```json
{
  "collection": "/drivers/drv-01",
  "operation": "get",
  "auth": { "uid": "spoof-uid", "token": { "email": "ac.appsweb2026@gmail.com", "email_verified": false } }
}
```

### Payload 3: Self-Assigned Admin Privilege Escalation
```json
{
  "collection": "/admins/attacker-uid",
  "operation": "create",
  "auth": { "uid": "attacker-uid", "token": { "email": "attacker@test.com", "email_verified": true } },
  "data": {
    "uid": "attacker-uid",
    "email": "attacker@test.com",
    "createdAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 4: Shadow Field Injection on Vehicle Creation
```json
{
  "collection": "/vehicles/veh-01",
  "operation": "create",
  "auth": { "uid": "user-1", "token": { "email": "user1@test.com", "email_verified": true } },
  "data": {
    "id": "veh-01",
    "ownerId": "user-1",
    "plate": "BRA2E19",
    "renavam": "01234567890",
    "chassis": "9BWZZZ377VT001122",
    "brandModel": "Scania R450",
    "yearFabMod": "2023/2024",
    "vehicleType": "Cavalo Mecânico",
    "fuel": "Diesel S10",
    "color": "Branco",
    "ownerName": "Frota",
    "ownerCnpjCpf": "00.000.000/0001-00",
    "cityUf": "São Paulo/SP",
    "licensingStatus": "EM_DIA",
    "activeFinesCount": 0,
    "totalFinesValue": 0,
    "isVerifiedAdmin": true,
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 5: Update-Gap Value Poisoning on Fine Update
```json
{
  "collection": "/fines/fine-01",
  "operation": "update",
  "auth": { "uid": "user-1", "token": { "email": "user1@test.com", "email_verified": true } },
  "data": {
    "status": "INVALID_ENUM_STATUS",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 6: Terminal State Bypass on Paid Fine (`status == 'PAGA'`)
```json
{
  "collection": "/fines/fine-paid-01",
  "operation": "update",
  "auth": { "uid": "user-1", "token": { "email": "user1@test.com", "email_verified": true } },
  "existingData": { "status": "PAGA", "ownerId": "user-1" },
  "data": {
    "status": "PENDENTE",
    "fineAmount": 0,
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 7: Terminal State Bypass on Signed Receipt Term (`status == 'ASSINADO'`)
```json
{
  "collection": "/terms/term-signed-01",
  "operation": "update",
  "auth": { "uid": "user-1", "token": { "email": "user1@test.com", "email_verified": true } },
  "existingData": { "status": "ASSINADO", "ownerId": "user-1" },
  "data": {
    "finalDeductedAmount": 10.0,
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 8: Immortal Field Mutation (`createdAt` or `ownerId` modified on update)
```json
{
  "collection": "/drivers/drv-01",
  "operation": "update",
  "auth": { "uid": "user-1", "token": { "email": "user1@test.com", "email_verified": true } },
  "existingData": { "ownerId": "user-1", "createdAt": "2026-01-01T00:00:00Z", "status": "REGULAR" },
  "data": {
    "ownerId": "user-2",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 9: Client-Forged Timestamp (`createdAt != request.time`)
```json
{
  "collection": "/terms/term-01",
  "operation": "create",
  "auth": { "uid": "user-1", "token": { "email": "user1@test.com", "email_verified": true } },
  "data": {
    "id": "term-01",
    "ownerId": "user-1",
    "protocolNumber": "TRM-2026-001",
    "aitNumber": "R1234567-1",
    "plate": "BRA2E19",
    "driverName": "CARLOS SILVA",
    "driverCpf": "123.456.789-00",
    "driverCnh": "12345678901",
    "originalFineAmount": 195.23,
    "finalDeductedAmount": 195.23,
    "installments": 1,
    "installmentValue": 195.23,
    "payrollMonth": "2026-10",
    "status": "PENDENTE_ASSINATURA",
    "createdAt": "2020-01-01T00:00:00Z",
    "updatedAt": "2020-01-01T00:00:00Z"
  }
}
```

### Payload 10: Cross-Tenant PII Leak (`get` on another user's Driver record)
```json
{
  "collection": "/drivers/drv-victim",
  "operation": "get",
  "auth": { "uid": "attacker-uid", "token": { "email": "attacker@test.com", "email_verified": true } },
  "existingData": { "ownerId": "victim-uid" }
}
```

### Payload 11: Unconstrained List Scraping (`list` without `where('ownerId', '==', auth.uid)`)
```json
{
  "collection": "/fines",
  "operation": "list",
  "auth": { "uid": "attacker-uid", "token": { "email": "attacker@test.com", "email_verified": true } },
  "query": "collection(db, 'fines') // without ownerId filter"
}
```

### Payload 12: Path ID Poisoning (Invalid characters / oversized document ID)
```json
{
  "collection": "/drivers/invalid$id!with@spaces",
  "operation": "create",
  "auth": { "uid": "user-1", "token": { "email": "user1@test.com", "email_verified": true } },
  "data": { "id": "invalid$id!with@spaces", "ownerId": "user-1" }
}
```

---

## 3. Test Runner Specification
All 12 adversarial payloads are codified in `firestore.rules.test.ts` to assert `PERMISSION_DENIED`.
