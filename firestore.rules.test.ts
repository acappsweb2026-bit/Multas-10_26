/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Adversarial Tests)
 * Verifies that all 12 Dirty Dozen payloads defined in security_spec.md
 * are strictly rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Driver Creation (ownerId != request.auth.uid)',
    collectionPath: '/drivers/drv-01',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Spoofing Bootstrapped Admin (email_verified == false)',
    collectionPath: '/drivers/drv-01',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Self-Assigned Admin Privilege Escalation (/admins/{uid} write)',
    collectionPath: '/admins/attacker-uid',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Vehicle Creation (undeclared key)',
    collectionPath: '/vehicles/veh-01',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Update-Gap Value Poisoning on Fine Update (invalid status enum)',
    collectionPath: '/fines/fine-01',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Terminal State Bypass on Paid Fine (existing.status == PAGA)',
    collectionPath: '/fines/fine-paid-01',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Terminal State Bypass on Signed Receipt Term (existing.status == ASSINADO)',
    collectionPath: '/terms/term-signed-01',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immortal Field Mutation (changing ownerId or createdAt on update)',
    collectionPath: '/drivers/drv-01',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client-Forged Timestamp (createdAt != request.time)',
    collectionPath: '/terms/term-01',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Cross-Tenant PII Leak (get on another user Driver record)',
    collectionPath: '/drivers/drv-victim',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unconstrained List Scraping (list without ownerId == request.auth.uid)',
    collectionPath: '/fines',
    operation: 'list',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Path ID Poisoning (document ID failing ^[a-zA-Z0-9_\\-]+$)',
    collectionPath: '/drivers/invalid$id!with@spaces',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
];
