import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  setLogLevel,
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Driver, Vehicle, TrafficFine, DriverReceiptTerm } from './types';

// Initialize Firebase App, Firestore (with explicit firestoreDatabaseId & long polling for iframe reliability), and Auth
const app = initializeApp(firebaseConfig);
// Set log level to avoid false-positive offline noise in preview iframe
try {
  setLogLevel('error');
} catch {
  // Ignore in environments where setLogLevel is already configured
}

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Blueprint validation constants synchronized with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_VALIDATION = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  ID_MAX_LENGTH: 128,
  NAME_MAX_LENGTH: 160,
  CPF_MIN_LENGTH: 11,
  CPF_MAX_LENGTH: 20,
  CNH_MIN_LENGTH: 5,
  CNH_MAX_LENGTH: 30,
  PLATE_MIN_LENGTH: 5,
  PLATE_MAX_LENGTH: 15,
  LOCATION_MAX_LENGTH: 250,
  DESCRIPTION_MAX_LENGTH: 500,
} as const;

export function sanitizeDocumentId(rawId: string): string {
  const cleaned = (rawId || `doc-${Date.now()}`)
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, BLUEPRINT_VALIDATION.ID_MAX_LENGTH);
  return cleaned.length > 0 ? cleaned : `doc-${Date.now()}`;
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' ? val.trim() : fallback;
  const effective = str.length > 0 ? str : fallback;
  return effective.slice(0, maxLen);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Authentication Helpers
export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User as FirebaseUser };

// Cloud Persistence Helpers (Synchronized with firebase-blueprint.json & firestore.rules)

export async function saveDriverToCloud(driver: Driver): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const docId = sanitizeDocumentId(driver.id);
  const path = `drivers/${docId}`;
  const docRef = doc(db, 'drivers', docId);

  const validCategory = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'].includes(driver.cnhCategory)
    ? driver.cnhCategory
    : 'B';
  const validStatus = ['REGULAR', 'ALERTA', 'SUSPENSA', 'CASSADA'].includes(driver.status)
    ? driver.status
    : 'REGULAR';

  const mutableFields: Record<string, unknown> = {
    name: clampString(driver.name, BLUEPRINT_VALIDATION.NAME_MAX_LENGTH, 'Motorista'),
    cpf: clampString(driver.cpf, BLUEPRINT_VALIDATION.CPF_MAX_LENGTH, '000.000.000-00'),
    cnhNumber: clampString(driver.cnhNumber, BLUEPRINT_VALIDATION.CNH_MAX_LENGTH, '00000000000'),
    cnhCategory: validCategory,
    cnhExpiration: clampString(driver.cnhExpiration, 25, '2028-01-01'),
    currentPoints: Math.max(0, Math.min(1000, Number(driver.currentPoints) || 0)),
    status: validStatus,
    phone: clampString(driver.phone, 40, ''),
    email: clampString(driver.email, 254, ''),
    assignedVehiclePlate: clampString(driver.assignedVehiclePlate || '', 20, ''),
  };

  let exists = false;
  try {
    const snap = await getDoc(docRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (!exists) {
      await setDoc(docRef, {
        id: docId,
        ownerId: user.uid,
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteDriverFromCloud(driverId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeDocumentId(driverId);
  const path = `drivers/${docId}`;
  try {
    await deleteDoc(doc(db, 'drivers', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveVehicleToCloud(vehicle: Vehicle): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const docId = sanitizeDocumentId(vehicle.id);
  const path = `vehicles/${docId}`;
  const docRef = doc(db, 'vehicles', docId);

  const validLicensing = ['EM_DIA', 'PENDENTE', 'VENCIDO'].includes(vehicle.licensingStatus)
    ? vehicle.licensingStatus
    : 'EM_DIA';

  const mutableFields: Record<string, unknown> = {
    plate: clampString(vehicle.plate, BLUEPRINT_VALIDATION.PLATE_MAX_LENGTH, 'AAA0A00'),
    renavam: clampString(vehicle.renavam, 20, '00000000000'),
    chassis: clampString(vehicle.chassis, 30, '9BW00000000000000'),
    brandModel: clampString(vehicle.brandModel, 120, 'Veículo'),
    yearFabMod: clampString(vehicle.yearFabMod, 20, '2024/2024'),
    vehicleType: clampString(vehicle.vehicleType, 40, 'Caminhão'),
    fuel: clampString(vehicle.fuel, 40, 'Diesel S10'),
    color: clampString(vehicle.color, 40, 'Branco'),
    ownerName: clampString(vehicle.ownerName, 160, 'Frota Própria'),
    ownerCnpjCpf: clampString(vehicle.ownerCnpjCpf, 30, ''),
    cityUf: clampString(vehicle.cityUf, 80, 'São Paulo/SP'),
    licensingStatus: validLicensing,
    activeFinesCount: Math.max(0, Math.min(100000, Number(vehicle.activeFinesCount) || 0)),
    totalFinesValue: Math.max(0, Math.min(100000000, Number(vehicle.totalFinesValue) || 0)),
  };

  let exists = false;
  try {
    const snap = await getDoc(docRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (!exists) {
      await setDoc(docRef, {
        id: docId,
        ownerId: user.uid,
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteVehicleFromCloud(vehicleId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeDocumentId(vehicleId);
  const path = `vehicles/${docId}`;
  try {
    await deleteDoc(doc(db, 'vehicles', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveFineToCloud(fine: TrafficFine): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const docId = sanitizeDocumentId(fine.id);
  const path = `fines/${docId}`;
  const docRef = doc(db, 'fines', docId);

  const validStatus = ['PENDENTE', 'VENCIDA', 'PAGA', 'EM_RECURSO'].includes(fine.status)
    ? fine.status
    : 'PENDENTE';
  const validSeverity = ['LEVE', 'MEDIA', 'GRAVE', 'GRAVISSIMA'].includes(fine.severity)
    ? fine.severity
    : 'MEDIA';

  const mutableFields: Record<string, unknown> = {
    aitNumber: clampString(fine.aitNumber, 60, 'AIT-000000'),
    plate: clampString(fine.plate, BLUEPRINT_VALIDATION.PLATE_MAX_LENGTH, 'AAA0A00'),
    infractionDate: clampString(fine.infractionDate, 35, new Date().toISOString().slice(0, 16)),
    infractionLocation: clampString(
      fine.infractionLocation,
      BLUEPRINT_VALIDATION.LOCATION_MAX_LENGTH,
      'Via Pública'
    ),
    city: clampString(fine.city, 100, 'São Paulo'),
    state: clampString(fine.state, 10, 'SP'),
    infractionCode: clampString(fine.infractionCode, 20, '7455-0'),
    infractionDescription: clampString(
      fine.infractionDescription,
      BLUEPRINT_VALIDATION.DESCRIPTION_MAX_LENGTH,
      'Infração de Trânsito'
    ),
    fineAmount: Math.max(0, Math.min(10000000, Number(fine.fineAmount) || 0)),
    originalAmount: Math.max(
      0,
      Math.min(10000000, Number(fine.originalAmount ?? fine.fineAmount) || 0)
    ),
    isDoubledFine: Boolean(fine.isDoubledFine),
    multiplierFactor: Math.max(1, Math.min(20, Number(fine.multiplierFactor) || 1)),
    ownerCnpjRazaoSocial: clampString(fine.ownerCnpjRazaoSocial, 200, 'Frota Registrada'),
    driverId: clampString(fine.driverId || '', 128, ''),
    driverName: clampString(fine.driverName || '', 160, ''),
    dueDate: clampString(fine.dueDate, 25, new Date().toISOString().slice(0, 10)),
    status: validStatus,
    severity: validSeverity,
    points: Math.max(0, Math.min(100, Number(fine.points) || 0)),
    issuingAuthority: clampString(fine.issuingAuthority, 40, 'DETRAN'),
    pdfFileName: clampString(fine.pdfFileName || '', 200, ''),
  };

  let exists = false;
  try {
    const snap = await getDoc(docRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (!exists) {
      await setDoc(docRef, {
        id: docId,
        ownerId: user.uid,
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteFineFromCloud(fineId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeDocumentId(fineId);
  const path = `fines/${docId}`;
  try {
    await deleteDoc(doc(db, 'fines', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveTermToCloud(term: DriverReceiptTerm): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const docId = sanitizeDocumentId(term.id);
  const path = `terms/${docId}`;
  const docRef = doc(db, 'terms', docId);

  const validStatus = ['PENDENTE_ASSINATURA', 'ASSINADO'].includes(term.status)
    ? term.status
    : 'PENDENTE_ASSINATURA';

  const mutableFields: Record<string, unknown> = {
    protocolNumber: clampString(term.protocolNumber, 60, 'TRM-0001'),
    aitNumber: clampString(term.aitNumber, 60, 'AIT-000000'),
    plate: clampString(term.plate, BLUEPRINT_VALIDATION.PLATE_MAX_LENGTH, 'AAA0A00'),
    driverName: clampString(term.driverName, 160, 'Condutor'),
    driverCpf: clampString(term.driverCpf, 25, '000.000.000-00'),
    driverCnh: clampString(term.driverCnh, 30, '00000000000'),
    originalFineAmount: Math.max(0, Math.min(10000000, Number(term.originalFineAmount) || 0)),
    finalDeductedAmount: Math.max(0, Math.min(10000000, Number(term.finalDeductedAmount) || 0)),
    installments: Math.max(1, Math.min(60, Number(term.installments) || 1)),
    installmentValue: Math.max(0, Math.min(10000000, Number(term.installmentValue) || 0)),
    payrollMonth: clampString(term.payrollMonth, 20, '2026-10'),
    status: validStatus,
  };

  let exists = false;
  try {
    const snap = await getDoc(docRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  try {
    if (!exists) {
      await setDoc(docRef, {
        id: docId,
        ownerId: user.uid,
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteTermFromCloud(termId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeDocumentId(termId);
  const path = `terms/${docId}`;
  try {
    await deleteDoc(doc(db, 'terms', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Real-time listeners (strictly scoped by ownerId == user.uid as enforced by allow list)
export function subscribeToUserCollections(
  uid: string,
  callbacks: {
    onDrivers: (drivers: Driver[]) => void;
    onVehicles: (vehicles: Vehicle[]) => void;
    onFines: (fines: TrafficFine[]) => void;
    onTerms: (terms: DriverReceiptTerm[]) => void;
  }
): Unsubscribe {
  const driversQuery = query(collection(db, 'drivers'), where('ownerId', '==', uid));
  const vehiclesQuery = query(collection(db, 'vehicles'), where('ownerId', '==', uid));
  const finesQuery = query(collection(db, 'fines'), where('ownerId', '==', uid));
  const termsQuery = query(collection(db, 'terms'), where('ownerId', '==', uid));

  const unsubDrivers = onSnapshot(
    driversQuery,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          name: data.name || '',
          cpf: data.cpf || '',
          cnhNumber: data.cnhNumber || '',
          cnhCategory: data.cnhCategory || 'B',
          cnhExpiration: data.cnhExpiration || '',
          currentPoints: Number(data.currentPoints) || 0,
          status: data.status || 'REGULAR',
          phone: data.phone || '',
          email: data.email || '',
          assignedVehiclePlate: data.assignedVehiclePlate || undefined,
          createdAt:
            typeof data.createdAt?.toDate === 'function'
              ? data.createdAt.toDate().toISOString().slice(0, 10)
              : new Date().toISOString().slice(0, 10),
        } as Driver;
      });
      callbacks.onDrivers(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'drivers');
    }
  );

  const unsubVehicles = onSnapshot(
    vehiclesQuery,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          plate: data.plate || '',
          renavam: data.renavam || '',
          chassis: data.chassis || '',
          brandModel: data.brandModel || '',
          yearFabMod: data.yearFabMod || '',
          vehicleType: data.vehicleType || 'Caminhão',
          fuel: data.fuel || 'Diesel S10',
          color: data.color || 'Branco',
          ownerName: data.ownerName || '',
          ownerCnpjCpf: data.ownerCnpjCpf || '',
          cityUf: data.cityUf || '',
          licensingStatus: data.licensingStatus || 'EM_DIA',
          activeFinesCount: Number(data.activeFinesCount) || 0,
          totalFinesValue: Number(data.totalFinesValue) || 0,
          createdAt:
            typeof data.createdAt?.toDate === 'function'
              ? data.createdAt.toDate().toISOString().slice(0, 10)
              : new Date().toISOString().slice(0, 10),
        } as Vehicle;
      });
      callbacks.onVehicles(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vehicles');
    }
  );

  const unsubFines = onSnapshot(
    finesQuery,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        const fineAmount = Number(data.fineAmount) || 0;
        return {
          id: data.id || d.id,
          aitNumber: data.aitNumber || '',
          plate: data.plate || '',
          infractionDate: data.infractionDate || '',
          infractionLocation: data.infractionLocation || '',
          city: data.city || '',
          state: data.state || 'SP',
          infractionCode: data.infractionCode || '',
          infractionDescription: data.infractionDescription || '',
          fineAmount,
          discountAmount: Number((fineAmount * 0.8).toFixed(2)),
          originalAmount: Number(data.originalAmount ?? fineAmount) || fineAmount,
          isDoubledFine: Boolean(data.isDoubledFine),
          multiplierFactor: Number(data.multiplierFactor) || 1,
          isNicFine: Boolean(data.isDoubledFine),
          ownerCnpjRazaoSocial: data.ownerCnpjRazaoSocial || '',
          driverId: data.driverId || undefined,
          driverName: data.driverName || undefined,
          dueDate: data.dueDate || '',
          status: data.status || 'PENDENTE',
          severity: data.severity || 'MEDIA',
          points: Number(data.points) || 0,
          issuingAuthority: data.issuingAuthority || 'DETRAN',
          pdfFileName: data.pdfFileName || undefined,
          createdAt:
            typeof data.createdAt?.toDate === 'function'
              ? data.createdAt.toDate().toISOString().slice(0, 10)
              : new Date().toISOString().slice(0, 10),
        } as TrafficFine;
      });
      callbacks.onFines(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fines');
    }
  );

  const unsubTerms = onSnapshot(
    termsQuery,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          protocolNumber: data.protocolNumber || '',
          aitNumber: data.aitNumber || '',
          plate: data.plate || '',
          vehicleModel: 'Veículo da Frota',
          driverName: data.driverName || '',
          driverCpf: data.driverCpf || '',
          driverCnh: data.driverCnh || '',
          infractionDate: new Date().toISOString().slice(0, 10),
          infractionLocation: 'Registrado no AIT',
          cityState: 'SP',
          infractionCode: '7455-0',
          infractionDescription: 'Infração vinculada ao Termo de Ciência',
          points: 4,
          issuingAuthority: 'DETRAN',
          originalFineAmount: Number(data.originalFineAmount) || 0,
          finalDeductedAmount: Number(data.finalDeductedAmount) || 0,
          useSneDiscount: false,
          installments: Number(data.installments) || 1,
          installmentValue: Number(data.installmentValue) || 0,
          payrollMonth: data.payrollMonth || '2026-10',
          companyName: 'Gestão de Frota / RH',
          companyCnpj: '',
          status: data.status || 'PENDENTE_ASSINATURA',
          createdAt:
            typeof data.createdAt?.toDate === 'function'
              ? data.createdAt.toDate().toISOString().slice(0, 10)
              : new Date().toISOString().slice(0, 10),
        } as DriverReceiptTerm;
      });
      callbacks.onTerms(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'terms');
    }
  );

  return () => {
    unsubDrivers();
    unsubVehicles();
    unsubFines();
    unsubTerms();
  };
}
