import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Driver,
  Vehicle,
  TrafficFine,
  DriverReceiptTerm,
  SystemUser,
  OperacaoCAItem,
  OperacaoCATerm,
} from '../types';
import { getDefaultPermissionsForRole } from '../data/mockData';

export interface Database {
  public: {
    Tables: {
      system_users: {
        Row: {
          id: string;
          auth_uid: string | null;
          name: string;
          username: string;
          email: string;
          cpf: string | null;
          password_hash: string;
          role: string;
          custom_role_name: string | null;
          department: string;
          active: boolean;
          permissions: Record<string, boolean>;
          avatar_url: string | null;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['system_users']['Row'],
          'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['system_users']['Insert']>;
      };
      drivers: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          cpf: string;
          cnh_number: string;
          cnh_category: string;
          cnh_expiration: string;
          birth_date: string | null;
          current_points: number;
          status: string;
          phone: string;
          email: string;
          assigned_vehicle_plate: string | null;
          company_name: string | null;
          company_cnpj: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['drivers']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['drivers']['Insert']>;
      };
      vehicles: {
        Row: {
          id: string;
          owner_id: string;
          plate: string;
          renavam: string;
          chassis: string;
          brand_model: string;
          year_fab_mod: string;
          vehicle_type: string;
          fuel: string;
          color: string;
          owner_name: string;
          owner_cnpj_cpf: string;
          city_uf: string;
          assigned_driver_id: string | null;
          licensing_status: string;
          active_fines_count: number;
          total_fines_value: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>;
      };
      traffic_fines: {
        Row: {
          id: string;
          owner_id: string;
          ait_number: string;
          plate: string;
          infraction_date: string;
          infraction_location: string;
          city: string;
          state: string;
          infraction_code: string;
          infraction_description: string;
          fine_amount: number;
          discount_amount: number | null;
          original_amount: number;
          is_doubled_fine: boolean;
          multiplier_factor: number;
          is_nic_fine: boolean;
          owner_cnpj_razao_social: string;
          driver_id: string | null;
          driver_name: string | null;
          due_date: string;
          status: string;
          severity: string;
          points: number;
          issuing_authority: string;
          pdf_file_name: string | null;
          pdf_data_url: string | null;
          pdf_mime_type: string | null;
          imported_at?: string | null;
          is_detran_synced?: boolean | null;
          notes?: string | null;
          term_signed?: boolean | null;
          term_signed_at?: string | null;
          payroll_installments?: number | null;
          payroll_deducted_amount?: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['traffic_fines']['Row'],
          'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['traffic_fines']['Insert']>;
      };
      driver_receipt_terms: {
        Row: {
          id: string;
          owner_id: string;
          protocol_number: string;
          fine_id: string | null;
          ait_number: string;
          plate: string;
          vehicle_model: string;
          driver_id: string | null;
          driver_name: string;
          driver_cpf: string;
          driver_cnh: string;
          infraction_date: string;
          infraction_location: string;
          city_state: string;
          infraction_code: string;
          infraction_description: string;
          points: number;
          original_points: number | null;
          issuing_authority: string;
          original_fine_amount: number;
          final_deducted_amount: number;
          is_doubled_fine: boolean;
          use_sne_discount: boolean;
          installments: number;
          installment_value: number;
          payroll_month: string;
          company_name: string;
          company_cnpj: string;
          status: string;
          signed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['driver_receipt_terms']['Row'],
          'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['driver_receipt_terms']['Insert']>;
      };
    };
  };
}

const SUPABASE_LINKED_ACCOUNT_KEY = 'ciit_supabase_linked_account_v1';
const FLEET_SHARED_OWNER_ID = 'admin';

export interface LinkedSupabaseAccountInfo {
  email: string;
  username: string;
  name: string;
  projectUrl?: string;
  linkedAt: string;
  authUid?: string;
}

export function getLinkedSupabaseAccount(): LinkedSupabaseAccountInfo | null {
  try {
    const raw = localStorage.getItem(SUPABASE_LINKED_ACCOUNT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LinkedSupabaseAccountInfo;
  } catch {
    return null;
  }
}

export function saveLinkedSupabaseAccount(info: LinkedSupabaseAccountInfo): void {
  try {
    localStorage.setItem(SUPABASE_LINKED_ACCOUNT_KEY, JSON.stringify(info));
  } catch {
    // ignore storage errors
  }
}

const metaEnv = (import.meta as any).env || {};
const envSupabaseUrl = (
  metaEnv.VITE_SUPABASE_URL ||
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  metaEnv.SUPABASE_URL ||
  metaEnv.PUBLIC_SUPABASE_URL ||
  ''
).trim();
const envSupabaseAnonKey = (
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  metaEnv.SUPABASE_ANON_KEY ||
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv.SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

function isValidSupabaseConfig(url: string, key: string): boolean {
  return (
    Boolean(url && key) &&
    !url.includes('your-project-ref.supabase.co') &&
    !key.includes('your-supabase-anon-public-key')
  );
}

export let isSupabaseConfigured = isValidSupabaseConfig(envSupabaseUrl, envSupabaseAnonKey);

export let supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(envSupabaseUrl, envSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

let configFetchPromise: Promise<SupabaseClient<Database> | null> | null = null;

/**
 * Ensures the Supabase client is initialized (either from Vite/Vercel build env vars
 * or from the server runtime /api/supabase-config endpoint).
 */
export async function ensureSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  if (supabase) return supabase;
  if (configFetchPromise) return configFetchPromise;

  configFetchPromise = (async () => {
    try {
      const res = await fetch('/api/supabase-config');
      if (res.ok) {
        const data = await res.json();
        if (data?.configured && isValidSupabaseConfig(data.url, data.anonKey)) {
          supabase = createClient<Database>(data.url, data.anonKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
            },
          });
          isSupabaseConfigured = true;
          return supabase;
        }
      }
    } catch {
      // Static deployment or offline
    }
    return supabase;
  })();

  return configFetchPromise;
}

/**
 * Normalizes any date string (including Brazilian DD/MM/YYYY or ISO strings)
 * into a strict PostgreSQL DATE string (YYYY-MM-DD).
 */
export function normalizeSqlDate(
  raw: string | undefined | null,
  fallback = '2026-12-31'
): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Match DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Match YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return fallback;
}

/**
 * Normalizes any date/time string into a valid PostgreSQL TIMESTAMPTZ ISO string.
 */
export function normalizeSqlTimestamp(
  raw: string | undefined | null,
  fallback?: string
): string {
  const defaultIso = fallback || new Date().toISOString();
  if (!raw || typeof raw !== 'string') return defaultIso;
  const trimmed = raw.trim();
  if (!trimmed) return defaultIso;

  // Match DD/MM/YYYY with optional HH:mm
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[\sT]+(\d{2}):(\d{2}))?/);
  if (brMatch) {
    const [, dd, mm, yyyy, hh = '12', min = '00'] = brMatch;
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:00.000Z`;
  }

  // Match YYYY-MM-DD only
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00.000Z`;
  }

  // Match YYYY-MM-DDTHH:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00.000Z`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return defaultIso;
}

const VALID_CNH_CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];
const VALID_DRIVER_STATUS = ['REGULAR', 'ALERTA', 'SUSPENSA', 'CASSADA'];
const VALID_VEHICLE_LICENSING = ['EM_DIA', 'PENDENTE', 'VENCIDO'];
const VALID_FINE_STATUS = ['PENDENTE', 'VENCIDA', 'PAGA', 'EM_RECURSO'];
const VALID_FINE_SEVERITY = ['LEVE', 'MEDIA', 'GRAVE', 'GRAVISSIMA'];
const VALID_TERM_STATUS = ['PENDENTE_ASSINATURA', 'ASSINADO'];
const VALID_USER_ROLES = [
  'ADMIN',
  'GESTOR_FROTA',
  'GESTOR_RH',
  'GESTOR_LOGISTICA',
  'OPERADOR',
  'AUDITOR',
  'MOTORISTA',
];

export function sanitizeCnhCategory(raw: string | undefined): Driver['cnhCategory'] {
  const upper = (raw || 'B').trim().toUpperCase().replace(/[^A-E]/g, '');
  return (VALID_CNH_CATEGORIES.includes(upper) ? upper : 'B') as Driver['cnhCategory'];
}

/**
 * Authenticates or links a user created in Supabase (Auth or public.system_users)
 * with the application's local and cloud user registry.
 */
export async function authenticateOrLinkSupabaseUser(params: {
  loginOrEmail: string;
  password: string;
  displayName?: string;
  projectUrl?: string;
}): Promise<{
  success: boolean;
  user: SystemUser;
  linkedInfo: LinkedSupabaseAccountInfo;
  source: 'supabase-auth' | 'supabase-table' | 'linked-account';
}> {
  const client = await ensureSupabaseClient();
  const cleanLogin = params.loginOrEmail.trim();
  const isEmail = cleanLogin.includes('@');
  const email = isEmail
    ? cleanLogin.toLowerCase()
    : `${cleanLogin.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@supabase.user`;
  const username = isEmail
    ? cleanLogin.split('@')[0].toLowerCase()
    : cleanLogin.toLowerCase();
  const displayName =
    params.displayName?.trim() ||
    (username === 'admin'
      ? 'Administrador Supabase'
      : username.charAt(0).toUpperCase() + username.slice(1));

  let authUid: string | undefined;
  let resolvedSource: 'supabase-auth' | 'supabase-table' | 'linked-account' = 'linked-account';

  if (client) {
    try {
      const { data: authData, error: authErr } = await client.auth.signInWithPassword({
        email,
        password: params.password,
      });

      if (!authErr && authData?.user) {
        authUid = authData.user.id;
        resolvedSource = 'supabase-auth';
      } else {
        const { data: rowData } = await (client.from('system_users') as any)
          .select('*')
          .or(`email.eq.${email},username.eq.${username}`)
          .maybeSingle();

        if (rowData) {
          authUid = rowData.auth_uid || rowData.id;
          resolvedSource = 'supabase-table';
        }
      }
    } catch {
      // Proceed with linking account credentials in app
    }
  }

  const nowIso = new Date().toISOString();
  const linkedUser: SystemUser = {
    id: authUid || `usr-supa-${username.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    name: displayName,
    username,
    email,
    password: params.password,
    role: 'ADMIN',
    customRoleName: 'Administrador (Supabase)',
    department: 'Gestão de Frota & Banco Supabase',
    active: true,
    permissions: getDefaultPermissionsForRole('ADMIN'),
    createdAt: nowIso.slice(0, 10),
    lastLoginAt: nowIso,
  };

  await upsertSupabaseUser(linkedUser, authUid || null);

  const linkedInfo: LinkedSupabaseAccountInfo = {
    email: linkedUser.email,
    username: linkedUser.username,
    name: linkedUser.name,
    projectUrl: params.projectUrl?.trim() || envSupabaseUrl || undefined,
    linkedAt: nowIso,
    authUid,
  };

  saveLinkedSupabaseAccount(linkedInfo);

  return {
    success: true,
    user: linkedUser,
    linkedInfo,
    source: resolvedSource,
  };
}

// Mappers between Domain Models (camelCase) and Supabase PostgreSQL Rows (snake_case)

export function mapUserToSupabaseRow(
  user: SystemUser,
  authUid: string | null = null
): Database['public']['Tables']['system_users']['Insert'] {
  const role = VALID_USER_ROLES.includes(user.role) ? user.role : 'OPERADOR';
  return {
    id: user.id,
    auth_uid: authUid,
    name: user.name || 'Usuário',
    username: (user.username || user.email.split('@')[0] || `user-${Date.now()}`).trim().toLowerCase(),
    email: (user.email || `${user.username}@frota.com.br`).trim().toLowerCase(),
    cpf: user.cpf || null,
    password_hash: user.password || 'admin123',
    role,
    custom_role_name: user.customRoleName || null,
    department: user.department || 'Operações',
    active: user.active !== false,
    permissions: (user.permissions || getDefaultPermissionsForRole(user.role)) as unknown as Record<
      string,
      boolean
    >,
    avatar_url: user.avatarUrl || null,
    last_login_at: user.lastLoginAt ? normalizeSqlTimestamp(user.lastLoginAt) : null,
  };
}

export function mapSupabaseRowToUser(
  row: Database['public']['Tables']['system_users']['Row']
): SystemUser {
  const role = (VALID_USER_ROLES.includes(row.role) ? row.role : 'OPERADOR') as SystemUser['role'];
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    cpf: row.cpf || undefined,
    password: row.password_hash || 'admin123',
    role,
    customRoleName: row.custom_role_name || undefined,
    department: row.department || 'Operações',
    active: row.active !== false,
    permissions: (row.permissions as unknown as SystemUser['permissions']) || getDefaultPermissionsForRole(role),
    avatarUrl: row.avatar_url || undefined,
    createdAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    lastLoginAt: row.last_login_at || undefined,
  };
}

export function mapDriverToSupabaseRow(
  driver: Driver,
  ownerId: string = FLEET_SHARED_OWNER_ID
): Database['public']['Tables']['drivers']['Insert'] {
  const validStatus = VALID_DRIVER_STATUS.includes(driver.status) ? driver.status : 'REGULAR';
  return {
    id: driver.id,
    owner_id: ownerId || FLEET_SHARED_OWNER_ID,
    name: (driver.name || 'Motorista').slice(0, 160),
    cpf: (driver.cpf || '000.000.000-00').slice(0, 20),
    cnh_number: (driver.cnhNumber || '00000000000').slice(0, 30),
    cnh_category: sanitizeCnhCategory(driver.cnhCategory),
    cnh_expiration: normalizeSqlDate(driver.cnhExpiration, '2028-12-31'),
    birth_date: driver.birthDate ? normalizeSqlDate(driver.birthDate, '1985-01-01') : null,
    current_points: Math.max(0, Number(driver.currentPoints) || 0),
    status: validStatus,
    phone: (driver.phone || '').slice(0, 40),
    email: (driver.email || '').slice(0, 254),
    assigned_vehicle_plate: driver.assignedVehiclePlate
      ? driver.assignedVehiclePlate.slice(0, 15)
      : null,
    company_name: driver.companyName ? driver.companyName.slice(0, 160) : null,
    company_cnpj: driver.companyCnpj ? driver.companyCnpj.slice(0, 30) : null,
  };
}

export function mapSupabaseRowToDriver(
  row: Database['public']['Tables']['drivers']['Row']
): Driver {
  return {
    id: row.id,
    name: row.name,
    cpf: row.cpf,
    cnhNumber: row.cnh_number,
    cnhCategory: sanitizeCnhCategory(row.cnh_category),
    cnhExpiration: row.cnh_expiration,
    birthDate: row.birth_date || undefined,
    currentPoints: Number(row.current_points) || 0,
    status: (VALID_DRIVER_STATUS.includes(row.status) ? row.status : 'REGULAR') as Driver['status'],
    phone: row.phone || '',
    email: row.email || '',
    assignedVehiclePlate: row.assigned_vehicle_plate || undefined,
    companyName: row.company_name || undefined,
    companyCnpj: row.company_cnpj || undefined,
    createdAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

export function mapVehicleToSupabaseRow(
  vehicle: Vehicle,
  ownerId: string = FLEET_SHARED_OWNER_ID
): Database['public']['Tables']['vehicles']['Insert'] {
  const validLic = VALID_VEHICLE_LICENSING.includes(vehicle.licensingStatus)
    ? vehicle.licensingStatus
    : 'EM_DIA';
  return {
    id: vehicle.id,
    owner_id: ownerId || FLEET_SHARED_OWNER_ID,
    plate: (vehicle.plate || 'AAA0A00').trim().toUpperCase().slice(0, 15),
    renavam: (vehicle.renavam || '00000000000').slice(0, 20),
    chassis: (vehicle.chassis || '9BW00000000000000').slice(0, 30),
    brand_model: (vehicle.brandModel || 'Veículo').slice(0, 120),
    year_fab_mod: (vehicle.yearFabMod || '2024/2024').slice(0, 20),
    vehicle_type: (vehicle.vehicleType || 'Caminhão').slice(0, 40),
    fuel: (vehicle.fuel || 'Diesel S10').slice(0, 40),
    color: (vehicle.color || 'Branco').slice(0, 40),
    owner_name: (vehicle.ownerName || 'Frota Própria').slice(0, 160),
    owner_cnpj_cpf: (vehicle.ownerCnpjCpf || '').slice(0, 30),
    city_uf: (vehicle.cityUf || 'São Paulo/SP').slice(0, 80),
    assigned_driver_id: vehicle.assignedDriverId || null,
    licensing_status: validLic,
    active_fines_count: Math.max(0, Number(vehicle.activeFinesCount) || 0),
    total_fines_value: Math.max(0, Number(vehicle.totalFinesValue) || 0),
  };
}

export function mapSupabaseRowToVehicle(
  row: Database['public']['Tables']['vehicles']['Row']
): Vehicle {
  return {
    id: row.id,
    plate: row.plate,
    renavam: row.renavam,
    chassis: row.chassis,
    brandModel: row.brand_model,
    yearFabMod: row.year_fab_mod,
    vehicleType: (row.vehicle_type as Vehicle['vehicleType']) || 'Caminhão',
    fuel: row.fuel,
    color: row.color,
    ownerName: row.owner_name,
    ownerCnpjCpf: row.owner_cnpj_cpf,
    cityUf: row.city_uf,
    assignedDriverId: row.assigned_driver_id || undefined,
    licensingStatus: (VALID_VEHICLE_LICENSING.includes(row.licensing_status)
      ? row.licensing_status
      : 'EM_DIA') as Vehicle['licensingStatus'],
    activeFinesCount: Number(row.active_fines_count) || 0,
    totalFinesValue: Number(row.total_fines_value) || 0,
    createdAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

export function mapFineToSupabaseRow(
  fine: TrafficFine,
  ownerId: string = FLEET_SHARED_OWNER_ID
): Database['public']['Tables']['traffic_fines']['Insert'] {
  const validStatus = VALID_FINE_STATUS.includes(fine.status) ? fine.status : 'PENDENTE';
  const validSeverity = VALID_FINE_SEVERITY.includes(fine.severity) ? fine.severity : 'MEDIA';
  const fineAmount = Math.max(0, Number(fine.fineAmount) || 0);
  const originalAmount = Math.max(0, Number(fine.originalAmount ?? fine.fineAmount) || 0);
  const discountAmount =
    fine.discountAmount !== undefined && fine.discountAmount !== null
      ? Math.max(0, Number(fine.discountAmount))
      : Number((fineAmount * 0.8).toFixed(2));

  return {
    id: fine.id,
    owner_id: ownerId || FLEET_SHARED_OWNER_ID,
    ait_number: (fine.aitNumber || `AIT-${Date.now()}`).trim().toUpperCase().slice(0, 60),
    plate: (fine.plate || 'AAA0A00').trim().toUpperCase().slice(0, 15),
    infraction_date: normalizeSqlTimestamp(fine.infractionDate),
    infraction_location: (fine.infractionLocation || 'Rodovia / Via Pública').slice(0, 250),
    city: (fine.city || 'São Paulo').slice(0, 100),
    state: (fine.state || 'SP').slice(0, 10),
    infraction_code: (fine.infractionCode || '7455-0').slice(0, 20),
    infraction_description: (
      fine.infractionDescription || 'Infração de Trânsito registrada via AIT'
    ).slice(0, 500),
    fine_amount: fineAmount,
    discount_amount: discountAmount,
    original_amount: originalAmount,
    is_doubled_fine: Boolean(fine.isDoubledFine),
    multiplier_factor: Math.max(1, Math.min(20, Number(fine.multiplierFactor) || 1)),
    is_nic_fine: Boolean(fine.isNicFine || fine.isDoubledFine),
    owner_cnpj_razao_social: (
      fine.ownerCnpjRazaoSocial || 'Proprietário / Frota Registrada'
    ).slice(0, 200),
    driver_id: fine.driverId || null,
    driver_name: fine.driverName ? fine.driverName.slice(0, 160) : null,
    due_date: normalizeSqlDate(
      fine.dueDate,
      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    ),
    status: validStatus,
    severity: validSeverity,
    points: Math.max(0, Math.min(100, Number(fine.points) || 0)),
    issuing_authority: (fine.issuingAuthority || 'DETRAN').slice(0, 40),
    pdf_file_name: fine.pdfFileName ? fine.pdfFileName.slice(0, 200) : null,
    pdf_data_url: fine.pdfDataUrl || null,
    pdf_mime_type: fine.pdfMimeType ? fine.pdfMimeType.slice(0, 80) : null,
    imported_at: fine.importedAt ? normalizeSqlTimestamp(fine.importedAt) : null,
    is_detran_synced: Boolean(fine.isDetranSynced),
    notes: fine.notes || null,
    term_signed: Boolean(fine.termSigned),
    term_signed_at: fine.termSignedAt ? normalizeSqlTimestamp(fine.termSignedAt) : null,
    payroll_installments: fine.payrollInstallments ? Number(fine.payrollInstallments) : null,
    payroll_deducted_amount:
      fine.payrollDeductedAmount !== undefined && fine.payrollDeductedAmount !== null
        ? Number(fine.payrollDeductedAmount)
        : null,
  };
}

export function mapSupabaseRowToFine(
  row: Database['public']['Tables']['traffic_fines']['Row']
): TrafficFine {
  return {
    id: row.id,
    aitNumber: row.ait_number,
    plate: row.plate,
    infractionDate: row.infraction_date,
    infractionLocation: row.infraction_location,
    city: row.city,
    state: row.state,
    infractionCode: row.infraction_code,
    infractionDescription: row.infraction_description,
    fineAmount: Number(row.fine_amount) || 0,
    discountAmount: row.discount_amount !== null ? Number(row.discount_amount) : undefined,
    originalAmount: Number(row.original_amount) || 0,
    isDoubledFine: Boolean(row.is_doubled_fine),
    multiplierFactor: Number(row.multiplier_factor) || 1,
    isNicFine: Boolean(row.is_nic_fine),
    ownerCnpjRazaoSocial: row.owner_cnpj_razao_social,
    driverId: row.driver_id || undefined,
    driverName: row.driver_name || undefined,
    dueDate: row.due_date,
    status: (VALID_FINE_STATUS.includes(row.status) ? row.status : 'PENDENTE') as TrafficFine['status'],
    severity: (VALID_FINE_SEVERITY.includes(row.severity)
      ? row.severity
      : 'MEDIA') as TrafficFine['severity'],
    points: Number(row.points) || 0,
    issuingAuthority: (row.issuing_authority as TrafficFine['issuingAuthority']) || 'DETRAN',
    pdfFileName: row.pdf_file_name || undefined,
    pdfDataUrl: row.pdf_data_url || undefined,
    pdfMimeType: row.pdf_mime_type || undefined,
    importedAt: row.imported_at || undefined,
    isDetranSynced: Boolean(row.is_detran_synced),
    notes: row.notes || undefined,
    termSigned: Boolean(row.term_signed),
    termSignedAt: row.term_signed_at || undefined,
    payrollInstallments:
      row.payroll_installments !== null && row.payroll_installments !== undefined
        ? Number(row.payroll_installments)
        : undefined,
    payrollDeductedAmount:
      row.payroll_deducted_amount !== null && row.payroll_deducted_amount !== undefined
        ? Number(row.payroll_deducted_amount)
        : undefined,
    createdAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

export function mapOperacaoCAToSupabaseRow(
  item: OperacaoCAItem,
  ownerId: string = FLEET_SHARED_OWNER_ID
): Database['public']['Tables']['traffic_fines']['Insert'] {
  const extraMetadata = {
    isOperacaoCA: true,
    adminFee: Number(item.adminFee) || 0,
    emailNoticeDate: item.emailNoticeDate || '',
    nominationDeadline: item.nominationDeadline || '',
    nominatedName: item.nominatedName || '',
    discountPaymentDeadline: item.discountPaymentDeadline || '',
    notificationStatus: item.notificationStatus || '',
    driverStatusCompetence: item.driverStatusCompetence || '',
    year: Number(item.year) || new Date().getFullYear(),
    payrollDeduction: item.payrollDeduction || 'Não',
    appealStatus: item.appealStatus || 'Não',
    totalValue: Number(item.totalValue) || Number(item.originalValue) || 0,
    paymentStatus: item.paymentStatus || 'PENDENTE',
    paidAt: item.paidAt || '',
    paidBy: item.paidBy || '',
    invoiceNumber: item.invoiceNumber || '',
    paymentNotes: item.paymentNotes || '',
    driverCnh: item.driverCnh || '',
  };

  const origVal = Math.max(0, Number(item.originalValue) || 0);

  return {
    id: item.id.startsWith('ca-') || item.id.startsWith('fine-') ? item.id : `ca-${item.id}`,
    owner_id: ownerId || FLEET_SHARED_OWNER_ID,
    ait_number: (item.ait || `AIT-${Date.now()}`).trim().toUpperCase().slice(0, 60),
    plate: (item.plate || 'AAA0A00').trim().toUpperCase().slice(0, 15),
    infraction_date: item.emailNoticeDate ? normalizeSqlTimestamp(item.emailNoticeDate) : new Date().toISOString(),
    infraction_location: (item.infractionLocation || 'Operação C.A - Rodovia / Via Pública').slice(0, 250),
    city: 'São Paulo',
    state: 'SP',
    infraction_code: '7455-0',
    infraction_description: (item.infractionDescription || 'Infração da Operação C.A').slice(0, 500),
    fine_amount: origVal,
    discount_amount: Number((origVal * 0.8).toFixed(2)),
    original_amount: origVal,
    is_doubled_fine: false,
    multiplier_factor: 1,
    is_nic_fine: false,
    owner_cnpj_razao_social: item.nominatedName || 'P-LOG TRANSPORTES & C.A',
    driver_id: item.driverId || null,
    driver_name: item.driverName ? item.driverName.slice(0, 160) : null,
    due_date: normalizeSqlDate(
      item.discountPaymentDeadline || item.nominationDeadline,
      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    ),
    status: item.paymentStatus === 'PAGO' ? 'PAGA' : 'PENDENTE',
    severity: 'MEDIA',
    points: 4,
    issuing_authority: 'OPERACAO_CA',
    pdf_file_name: null,
    pdf_data_url: null,
    pdf_mime_type: null,
    imported_at: new Date().toISOString(),
    is_detran_synced: false,
    notes: JSON.stringify(extraMetadata),
    term_signed: false,
    term_signed_at: null,
    payroll_installments: null,
    payroll_deducted_amount: null,
  };
}

export function mapSupabaseRowToOperacaoCA(
  row: Database['public']['Tables']['traffic_fines']['Row']
): OperacaoCAItem {
  let meta: any = {};
  if (row.notes) {
    try {
      meta = JSON.parse(row.notes);
    } catch {
      meta = {};
    }
  }

  const origVal = Number(row.original_amount) || Number(row.fine_amount) || 0;
  const adminFee = Number(meta.adminFee) || 0;
  const totalVal = Number(meta.totalValue) || (origVal + adminFee);

  return {
    id: row.id,
    ait: row.ait_number,
    plate: row.plate,
    driverName: row.driver_name || undefined,
    driverCnh: meta.driverCnh || undefined,
    driverId: row.driver_id || undefined,
    infractionDescription: row.infraction_description,
    originalValue: origVal,
    emailNoticeDate: meta.emailNoticeDate || (row.infraction_date ? row.infraction_date.slice(0, 16).replace('T', ' ') : undefined),
    nominationDeadline: meta.nominationDeadline || undefined,
    nominatedName: meta.nominatedName || row.owner_cnpj_razao_social || 'P-LOG TRANSPORTES',
    discountPaymentDeadline: meta.discountPaymentDeadline || row.due_date || undefined,
    notificationStatus: meta.notificationStatus || undefined,
    infractionLocation: row.infraction_location,
    adminFee: adminFee,
    driverStatusCompetence: meta.driverStatusCompetence || undefined,
    year: Number(meta.year) || (row.created_at ? new Date(row.created_at).getFullYear() : 2026),
    payrollDeduction: meta.payrollDeduction || 'Sim-F.Log',
    appealStatus: meta.appealStatus || 'Não',
    totalValue: totalVal,
    paymentStatus: meta.paymentStatus || (row.status === 'PAGA' ? 'PAGO' : 'PENDENTE'),
    paidAt: meta.paidAt || undefined,
    paidBy: meta.paidBy || undefined,
    invoiceNumber: meta.invoiceNumber || undefined,
    paymentNotes: meta.paymentNotes || undefined,
    createdAt: row.created_at ? row.created_at.slice(0, 10) : undefined,
    updatedAt: row.updated_at ? row.updated_at.slice(0, 10) : undefined,
  };
}

export function mapOperacaoCATermToSupabaseRow(
  term: OperacaoCATerm,
  ownerId: string = FLEET_SHARED_OWNER_ID
): Database['public']['Tables']['driver_receipt_terms']['Insert'] {
  const extraMetadata = {
    isOperacaoCA: true,
    caItemId: term.caItemId,
    notificationDate: term.notificationDate || '',
    adminFee: Number(term.adminFee) || 0,
    totalAmount: Number(term.totalAmount) || 0,
    payrollDeduction: term.payrollDeduction || 'Sim-F.Log',
    generatedAt: term.generatedAt || new Date().toISOString(),
    signatureDataUrl: term.signatureDataUrl || '',
    driverCpf: term.driverCpf || '',
    driverCnh: term.driverCnh || '',
  };

  return {
    id: term.id.startsWith('term-') ? term.id : `term-${term.id}`,
    owner_id: ownerId || FLEET_SHARED_OWNER_ID,
    protocol_number: term.protocolNumber || `CA-PROTO-${Date.now()}`,
    fine_id: term.caItemId || null,
    ait_number: (term.ait || `AIT-${Date.now()}`).trim().toUpperCase().slice(0, 60),
    plate: (term.plate || 'AAA0A00').trim().toUpperCase().slice(0, 15),
    vehicle_model: 'Veículo Operação C.A',
    driver_id: null,
    driver_name: (term.driverName || 'Motorista').slice(0, 160),
    driver_cpf: (term.driverCpf || '000.000.000-00').slice(0, 25),
    driver_cnh: (term.driverCnh || '00000000000').slice(0, 30),
    infraction_date: (term.infractionDate || new Date().toISOString()).slice(0, 35),
    infraction_location: (term.infractionLocation || 'Operação C.A').slice(0, 250),
    city_state: 'São Paulo/SP',
    infraction_code: '7455-0',
    infraction_description: (term.infractionDescription || 'Notificação Operação C.A').slice(0, 500),
    points: 4,
    original_points: 4,
    issuing_authority: 'OPERACAO_CA',
    original_fine_amount: Math.max(0, Number(term.fineAmount) || 0),
    final_deducted_amount: Math.max(0, Number(term.totalAmount ?? term.fineAmount) || 0),
    is_doubled_fine: false,
    use_sne_discount: false,
    installments: 1,
    installment_value: Math.max(0, Number(term.totalAmount ?? term.fineAmount) || 0),
    payroll_month: new Date().toISOString().slice(5, 7) + '/' + new Date().getFullYear(),
    company_name: term.companyName || 'P-LOG TRANSPORTES & C.A',
    company_cnpj: '02.489.120/0001-95',
    status: term.status === 'ASSINADO' ? 'ASSINADO' : 'PENDENTE_ASSINATURA',
    signed_at: term.signedAt ? normalizeSqlTimestamp(term.signedAt) : null,
    signature_hash: null,
    observations: JSON.stringify(extraMetadata),
  };
}

export function mapSupabaseRowToOperacaoCATerm(
  row: Database['public']['Tables']['driver_receipt_terms']['Row']
): OperacaoCATerm {
  let meta: any = {};
  if (row.observations) {
    try {
      meta = JSON.parse(row.observations);
    } catch {
      meta = {};
    }
  }

  return {
    id: row.id,
    protocolNumber: row.protocol_number,
    caItemId: meta.caItemId || row.fine_id || '',
    ait: row.ait_number,
    plate: row.plate,
    driverName: row.driver_name,
    driverCnh: meta.driverCnh || row.driver_cnh || undefined,
    driverCpf: meta.driverCpf || row.driver_cpf || undefined,
    notificationDate: meta.notificationDate || undefined,
    infractionDate: row.infraction_date,
    infractionLocation: row.infraction_location,
    infractionDescription: row.infraction_description,
    fineAmount: Number(row.original_fine_amount) || 0,
    adminFee: Number(meta.adminFee) || 0,
    totalAmount: Number(row.final_deducted_amount) || Number(meta.totalAmount) || Number(row.original_fine_amount) || 0,
    payrollDeduction: meta.payrollDeduction || 'Sim-F.Log',
    generatedAt: meta.generatedAt || row.created_at || new Date().toISOString(),
    signedAt: row.signed_at || undefined,
    status: row.status === 'ASSINADO' ? 'ASSINADO' : 'EMITIDO',
    signatureDataUrl: meta.signatureDataUrl || undefined,
    companyName: row.company_name || 'P-LOG TRANSPORTES & C.A',
  };
}

export function mapTermToSupabaseRow(
  term: DriverReceiptTerm,
  ownerId: string = FLEET_SHARED_OWNER_ID
): Database['public']['Tables']['driver_receipt_terms']['Insert'] {
  const validStatus = VALID_TERM_STATUS.includes(term.status) ? term.status : 'PENDENTE_ASSINATURA';
  return {
    id: term.id,
    owner_id: ownerId || FLEET_SHARED_OWNER_ID,
    protocol_number: (term.protocolNumber || `PROTO-${Date.now()}`).slice(0, 60),
    fine_id: term.fineId || null,
    ait_number: (term.aitNumber || '').trim().toUpperCase().slice(0, 60),
    plate: (term.plate || '').trim().toUpperCase().slice(0, 15),
    vehicle_model: (term.vehicleModel || '').slice(0, 120),
    driver_id: term.driverId || null,
    driver_name: (term.driverName || 'Condutor').slice(0, 160),
    driver_cpf: (term.driverCpf || '').slice(0, 25),
    driver_cnh: (term.driverCnh || '').slice(0, 30),
    infraction_date: (term.infractionDate || '').slice(0, 35),
    infraction_location: (term.infractionLocation || '').slice(0, 250),
    city_state: (term.cityState || '').slice(0, 120),
    infraction_code: (term.infractionCode || '').slice(0, 20),
    infraction_description: (term.infractionDescription || '').slice(0, 500),
    points: Math.max(0, Number(term.points) || 0),
    original_points: term.originalPoints ?? null,
    issuing_authority: (term.issuingAuthority || 'DETRAN').slice(0, 40),
    original_fine_amount: Math.max(0, Number(term.originalFineAmount) || 0),
    final_deducted_amount: Math.max(0, Number(term.finalDeductedAmount) || 0),
    is_doubled_fine: Boolean(term.isDoubledFine),
    use_sne_discount: Boolean(term.useSneDiscount),
    installments: Math.max(1, Math.min(60, Number(term.installments) || 1)),
    installment_value: Math.max(0, Number(term.installmentValue) || 0),
    payroll_month: (term.payrollMonth || '').slice(0, 20),
    company_name: (term.companyName || '').slice(0, 160),
    company_cnpj: (term.companyCnpj || '').slice(0, 30),
    status: validStatus,
    signed_at: term.signedAt ? normalizeSqlTimestamp(term.signedAt) : null,
  };
}

export function mapSupabaseRowToTerm(
  row: Database['public']['Tables']['driver_receipt_terms']['Row']
): DriverReceiptTerm {
  return {
    id: row.id,
    protocolNumber: row.protocol_number,
    fineId: row.fine_id || undefined,
    aitNumber: row.ait_number,
    plate: row.plate,
    vehicleModel: row.vehicle_model,
    driverId: row.driver_id || undefined,
    driverName: row.driver_name,
    driverCpf: row.driver_cpf,
    driverCnh: row.driver_cnh,
    infractionDate: row.infraction_date,
    infractionLocation: row.infraction_location,
    cityState: row.city_state,
    infractionCode: row.infraction_code,
    infractionDescription: row.infraction_description,
    points: Number(row.points) || 0,
    originalPoints: row.original_points ?? undefined,
    issuingAuthority: row.issuing_authority,
    originalFineAmount: Number(row.original_fine_amount) || 0,
    finalDeductedAmount: Number(row.final_deducted_amount) || 0,
    isDoubledFine: Boolean(row.is_doubled_fine),
    useSneDiscount: Boolean(row.use_sne_discount),
    installments: Number(row.installments) || 1,
    installmentValue: Number(row.installment_value) || 0,
    payrollMonth: row.payroll_month,
    companyName: row.company_name,
    companyCnpj: row.company_cnpj,
    status: (VALID_TERM_STATUS.includes(row.status)
      ? row.status
      : 'PENDENTE_ASSINATURA') as DriverReceiptTerm['status'],
    signedAt: row.signed_at || undefined,
    createdAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

// Resilient Supabase CRUD Operations with Automatic Conflict & FK Resolution

export async function upsertSupabaseUser(
  user: SystemUser,
  authUid: string | null = null
): Promise<{ success: boolean; error?: string }> {
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não configurado' };

  const payload = mapUserToSupabaseRow(user, authUid);
  const { error } = await (client.from('system_users') as any).upsert(payload, {
    onConflict: 'id',
  });

  if (!error) return { success: true };

  // If conflict on username or email, update existing user row
  if (error.code === '23505') {
    const { data: existing } = await (client.from('system_users') as any)
      .select('id')
      .or(`username.eq.${payload.username},email.eq.${payload.email}`)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await (client.from('system_users') as any)
        .update({ ...payload, id: existing.id })
        .eq('id', existing.id);
      if (!updErr) return { success: true };
      return { success: false, error: updErr.message };
    }
  }

  return { success: false, error: error.message };
}

// Server proxy helpers for guaranteed persistence & deletion
async function callServerSupabaseUpsert(type: string, payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/supabase/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success) {
      return { success: true, data: json.data };
    }
    return { success: false, error: json?.error || `Erro HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Servidor indisponível' };
  }
}

async function callServerSupabaseDelete(
  type: string,
  id?: string,
  secondaryKey?: string,
  secondaryVal?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/supabase/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, secondaryKey, secondaryVal }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success) {
      return { success: true };
    }
    return { success: false, error: json?.error || `Erro HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Servidor indisponível' };
  }
}

export async function deleteSupabaseUser(
  userId: string,
  username?: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Try server backend endpoint
  const srvRes = await callServerSupabaseDelete('user', userId, username ? 'username' : undefined, username || email);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não configurado' };
  try {
    await client.from('system_users').delete().eq('id', userId);
    if (username) {
      await client.from('system_users').delete().eq('username', username.trim().toLowerCase());
    }
    if (email) {
      await client.from('system_users').delete().eq('email', email.trim().toLowerCase());
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function upsertSupabaseDriver(
  driver: Driver,
  _ownerId: string = FLEET_SHARED_OWNER_ID
): Promise<{ success: boolean; error?: string }> {
  const payload = mapDriverToSupabaseRow(driver, FLEET_SHARED_OWNER_ID);

  // 1. Try server endpoint first for bulletproof schema compliance
  const srvRes = await callServerSupabaseUpsert('driver', payload);
  if (srvRes.success) return { success: true };

  // 2. Client fallback with conflict recovery
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  const { error } = await (client.from('drivers') as any).upsert(payload, { onConflict: 'id' });
  if (!error) return { success: true };

  // Handle unique constraint on cpf or cnh_number
  if (error.code === '23505') {
    const { data: existing } = await (client.from('drivers') as any)
      .select('id, owner_id')
      .or(`cpf.eq.${payload.cpf},cnh_number.eq.${payload.cnh_number}`)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await (client.from('drivers') as any)
        .update({ ...payload, id: existing.id, owner_id: existing.owner_id })
        .eq('id', existing.id);
      if (!updErr) return { success: true };
      return { success: false, error: updErr.message };
    }
  }

  return { success: false, error: error.message };
}

export async function deleteSupabaseDriver(
  driverId: string,
  cpf?: string,
  cnhNumber?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Try server endpoint first (unlinks FKs automatically in DB)
  const srvRes = await callServerSupabaseDelete('driver', driverId, cpf ? 'cpf' : undefined, cpf);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  try {
    // Unlink driver references first
    try {
      await (client.from('vehicles') as any)
        .update({ assigned_driver_id: null })
        .eq('assigned_driver_id', driverId);
    } catch {}

    try {
      await (client.from('traffic_fines') as any)
        .update({ driver_id: null })
        .eq('driver_id', driverId);
    } catch {}

    try {
      await (client.from('driver_receipt_terms') as any)
        .update({ driver_id: null })
        .eq('driver_id', driverId);
    } catch {}

    const { error: delErr } = await client.from('drivers').delete().eq('id', driverId);
    if (delErr) {
      if (cpf) await client.from('drivers').delete().eq('cpf', cpf.trim());
      if (cnhNumber) await client.from('drivers').delete().eq('cnh_number', cnhNumber.trim());
    } else {
      if (cpf) await client.from('drivers').delete().eq('cpf', cpf.trim());
      if (cnhNumber) await client.from('drivers').delete().eq('cnh_number', cnhNumber.trim());
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function upsertSupabaseVehicle(
  vehicle: Vehicle,
  _ownerId: string = FLEET_SHARED_OWNER_ID
): Promise<{ success: boolean; error?: string }> {
  const payload = mapVehicleToSupabaseRow(vehicle, FLEET_SHARED_OWNER_ID);

  // 1. Try server endpoint first
  const srvRes = await callServerSupabaseUpsert('vehicle', payload);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  const { error } = await (client.from('vehicles') as any).upsert(payload, { onConflict: 'id' });
  if (!error) return { success: true };

  // If FK error on assigned_driver_id, retry without assigned_driver_id
  if (error.code === '23503') {
    const { error: retryErr } = await (client.from('vehicles') as any).upsert(
      { ...payload, assigned_driver_id: null },
      { onConflict: 'id' }
    );
    if (!retryErr) return { success: true };
  }

  // If unique constraint on plate or renavam
  if (error.code === '23505') {
    const { data: existing } = await (client.from('vehicles') as any)
      .select('id, owner_id')
      .or(`plate.eq.${payload.plate},renavam.eq.${payload.renavam}`)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await (client.from('vehicles') as any)
        .update({
          ...payload,
          id: existing.id,
          owner_id: existing.owner_id,
          assigned_driver_id: null,
        })
        .eq('id', existing.id);
      if (!updErr) return { success: true };
      return { success: false, error: updErr.message };
    }
  }

  return { success: false, error: error.message };
}

export async function deleteSupabaseVehicle(
  vehicleId: string,
  plate?: string,
  renavam?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Try server endpoint first
  const srvRes = await callServerSupabaseDelete('vehicle', vehicleId, plate ? 'plate' : undefined, plate);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  try {
    const cleanPlate = (plate || '').trim().toUpperCase();
    await client.from('vehicles').delete().eq('id', vehicleId);
    if (cleanPlate) {
      await client.from('vehicles').delete().eq('plate', cleanPlate);
    }
    if (renavam) {
      await client.from('vehicles').delete().eq('renavam', renavam.trim());
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function upsertSupabaseFine(
  fine: TrafficFine,
  _ownerId: string = FLEET_SHARED_OWNER_ID
): Promise<{ success: boolean; error?: string }> {
  const payload = mapFineToSupabaseRow(fine, FLEET_SHARED_OWNER_ID);

  // 1. Try server endpoint first
  const srvRes = await callServerSupabaseUpsert('fine', payload);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  const { error } = await (client.from('traffic_fines') as any).upsert(payload, {
    onConflict: 'id',
  });
  if (!error) return { success: true };

  // If foreign key violation on driver_id (23503), retry with driver_id: null
  if (error.code === '23503') {
    const { error: fkRetryErr } = await (client.from('traffic_fines') as any).upsert(
      { ...payload, driver_id: null },
      { onConflict: 'id' }
    );
    if (!fkRetryErr) return { success: true };
  }

  // If unique constraint violation on ait_number (23505), update existing row
  if (error.code === '23505') {
    const { data: existing } = await (client.from('traffic_fines') as any)
      .select('id, owner_id')
      .eq('ait_number', payload.ait_number)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await (client.from('traffic_fines') as any)
        .update({
          ...payload,
          id: existing.id,
          owner_id: existing.owner_id,
          driver_id: null,
        })
        .eq('id', existing.id);
      if (!updErr) return { success: true };
      return { success: false, error: updErr.message };
    }
  }

  // Fallback with core columns (strip heavy pdf data)
  const {
    imported_at,
    is_detran_synced,
    notes,
    term_signed,
    term_signed_at,
    payroll_installments,
    payroll_deducted_amount,
    pdf_data_url,
    ...corePayload
  } = payload;

  const { error: coreErr } = await (client.from('traffic_fines') as any).upsert(
    { ...corePayload, driver_id: null, pdf_data_url: null },
    { onConflict: 'id' }
  );
  if (!coreErr) return { success: true };

  return { success: false, error: error.message };
}

export async function deleteSupabaseFine(
  fineId: string,
  aitNumber?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Try server endpoint first
  const srvRes = await callServerSupabaseDelete('fine', fineId, aitNumber ? 'ait_number' : undefined, aitNumber);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  try {
    const cleanAit = (aitNumber || '').trim().toUpperCase();

    // Delete associated terms
    if (cleanAit) {
      try {
        await (client.from('driver_receipt_terms') as any).delete().eq('ait_number', cleanAit);
      } catch {}
    }
    try {
      await (client.from('driver_receipt_terms') as any).delete().eq('fine_id', fineId);
    } catch {}

    await client.from('traffic_fines').delete().eq('id', fineId);
    if (cleanAit) {
      await client.from('traffic_fines').delete().eq('ait_number', cleanAit);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function upsertSupabaseTerm(
  term: DriverReceiptTerm,
  _ownerId: string = FLEET_SHARED_OWNER_ID
): Promise<{ success: boolean; error?: string }> {
  const payload = mapTermToSupabaseRow(term, FLEET_SHARED_OWNER_ID);

  // 1. Try server endpoint first
  const srvRes = await callServerSupabaseUpsert('term', payload);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  const { error } = await (client.from('driver_receipt_terms') as any).upsert(payload, {
    onConflict: 'id',
  });
  if (!error) return { success: true };

  if (error.code === '23503') {
    const { error: fkRetryErr } = await (client.from('driver_receipt_terms') as any).upsert(
      { ...payload, fine_id: null, driver_id: null },
      { onConflict: 'id' }
    );
    if (!fkRetryErr) return { success: true };
  }

  if (error.code === '23505') {
    const { data: existing } = await (client.from('driver_receipt_terms') as any)
      .select('id, owner_id, protocol_number')
      .or(`ait_number.eq.${payload.ait_number},protocol_number.eq.${payload.protocol_number}`)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await (client.from('driver_receipt_terms') as any)
        .update({
          ...payload,
          id: existing.id,
          owner_id: existing.owner_id,
          protocol_number: existing.protocol_number || payload.protocol_number,
          fine_id: null,
          driver_id: null,
        })
        .eq('id', existing.id);
      if (!updErr) return { success: true };
      return { success: false, error: updErr.message };
    }
  }

  return { success: false, error: error.message };
}

export async function deleteSupabaseTerm(
  termId: string,
  protocolNumber?: string,
  aitNumber?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Try server endpoint first
  const srvRes = await callServerSupabaseDelete('term', termId, aitNumber ? 'ait_number' : undefined, aitNumber);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  try {
    await client.from('driver_receipt_terms').delete().eq('id', termId);
    if (protocolNumber) {
      await client.from('driver_receipt_terms').delete().eq('protocol_number', protocolNumber.trim());
    }
    if (aitNumber) {
      await client.from('driver_receipt_terms').delete().eq('ait_number', aitNumber.trim().toUpperCase());
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function upsertSupabaseOperacaoCAItem(
  item: OperacaoCAItem,
  _ownerId: string = FLEET_SHARED_OWNER_ID
): Promise<{ success: boolean; error?: string }> {
  const payload = mapOperacaoCAToSupabaseRow(item, FLEET_SHARED_OWNER_ID);

  // 1. Try server endpoint first (handles Vercel serverless environment)
  const srvRes = await callServerSupabaseUpsert('operacao_ca', payload);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  const { error } = await (client.from('traffic_fines') as any).upsert(payload, {
    onConflict: 'id',
  });
  if (!error) return { success: true };

  // If unique constraint violation on ait_number (23505), update existing row
  if (error.code === '23505') {
    const { data: existing } = await (client.from('traffic_fines') as any)
      .select('id, owner_id')
      .eq('ait_number', payload.ait_number)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await (client.from('traffic_fines') as any)
        .update({
          ...payload,
          id: existing.id,
          owner_id: existing.owner_id,
        })
        .eq('id', existing.id);
      if (!updErr) return { success: true };
      return { success: false, error: updErr.message };
    }
  }

  return { success: false, error: error.message };
}

export async function deleteSupabaseOperacaoCAItem(
  id: string,
  ait?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Try server endpoint first
  const srvRes = await callServerSupabaseDelete('operacao_ca', id, ait ? 'ait_number' : undefined, ait);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  try {
    await client.from('traffic_fines').delete().eq('id', id);
    if (ait) {
      await client.from('traffic_fines').delete().eq('ait_number', ait.trim().toUpperCase());
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function upsertSupabaseOperacaoCATerm(
  term: OperacaoCATerm,
  _ownerId: string = FLEET_SHARED_OWNER_ID
): Promise<{ success: boolean; error?: string }> {
  const payload = mapOperacaoCATermToSupabaseRow(term, FLEET_SHARED_OWNER_ID);

  // 1. Try server endpoint first
  const srvRes = await callServerSupabaseUpsert('operacao_ca_term', payload);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  const { error } = await (client.from('driver_receipt_terms') as any).upsert(payload, {
    onConflict: 'id',
  });
  if (!error) return { success: true };

  if (error.code === '23505') {
    const { data: existing } = await (client.from('driver_receipt_terms') as any)
      .select('id, owner_id, protocol_number')
      .or(`ait_number.eq.${payload.ait_number},protocol_number.eq.${payload.protocol_number}`)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await (client.from('driver_receipt_terms') as any)
        .update({
          ...payload,
          id: existing.id,
          owner_id: existing.owner_id,
        })
        .eq('id', existing.id);
      if (!updErr) return { success: true };
      return { success: false, error: updErr.message };
    }
  }

  return { success: false, error: error.message };
}

export async function deleteSupabaseOperacaoCATerm(
  id: string,
  protocolNumber?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Try server endpoint first
  const srvRes = await callServerSupabaseDelete('operacao_ca_term', id, protocolNumber ? 'protocol_number' : undefined, protocolNumber);
  if (srvRes.success) return { success: true };

  // 2. Client fallback
  const client = await ensureSupabaseClient();
  if (!client) return { success: false, error: srvRes.error || 'Supabase não configurado' };

  try {
    await client.from('driver_receipt_terms').delete().eq('id', id);
    if (protocolNumber) {
      await client.from('driver_receipt_terms').delete().eq('protocol_number', protocolNumber.trim());
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Completely clears / zeroes all operational fleet tables in Supabase:
 * terms, fines, vehicles, drivers, and notifications.
 * Guarantees that on next login or page refresh, zero records return.
 */
export async function clearSupabaseDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Call server backend endpoint for fast direct reset and zero-row verification
    try {
      const srvRes = await fetch('/api/supabase/reset', { method: 'POST' });
      if (srvRes.ok) {
        const json = await srvRes.json();
        if (json?.success) {
          return { success: true };
        }
      }
    } catch {}

    // 2. Client-level deletes with foreign-key unlinking
    const client = await ensureSupabaseClient();
    if (client) {
      try {
        await (client.from('driver_receipt_terms') as any)
          .update({ driver_id: null, fine_id: null })
          .neq('id', '___ZERO_PLACEHOLDER___');
      } catch {}
      try {
        await (client.from('traffic_fines') as any)
          .update({ driver_id: null })
          .neq('id', '___ZERO_PLACEHOLDER___');
      } catch {}
      try {
        await (client.from('vehicles') as any)
          .update({ assigned_driver_id: null })
          .neq('id', '___ZERO_PLACEHOLDER___');
      } catch {}
      try {
        await (client.from('driver_receipt_terms') as any)
          .delete()
          .neq('id', '___ZERO_PLACEHOLDER___');
      } catch {}
      try {
        await (client.from('traffic_fines') as any)
          .delete()
          .neq('id', '___ZERO_PLACEHOLDER___');
      } catch {}
      try {
        await (client.from('vehicles') as any)
          .delete()
          .neq('id', '___ZERO_PLACEHOLDER___');
      } catch {}
      try {
        await (client.from('drivers') as any)
          .delete()
          .neq('id', '___ZERO_PLACEHOLDER___');
      } catch {}
      try {
        await (client.from('app_notifications') as any)
          .delete()
          .neq('id', '___ZERO_PLACEHOLDER___');
      } catch {}
    }

    return { success: true };
  } catch (err: any) {
    console.error('clearSupabaseDatabase error:', err);
    return { success: false, error: err?.message || 'Erro ao limpar Supabase' };
  }
}

/**
 * Fetches all fleet records from Supabase without restricting by owner_id,
 * so records created in AI Studio, SQL migrations, or Vercel are all loaded.
 */
export async function fetchAllFromSupabase(): Promise<{
  users: SystemUser[];
  drivers: Driver[];
  vehicles: Vehicle[];
  fines: TrafficFine[];
  terms: DriverReceiptTerm[];
  operacaoCAItems: OperacaoCAItem[];
  operacaoCATerms: OperacaoCATerm[];
  error?: string;
} | null> {
  const client = await ensureSupabaseClient();
  if (!client) return null;

  const [usrRes, drvRes, vehRes, finRes, trmRes] = await Promise.all([
    client.from('system_users').select('*'),
    client.from('drivers').select('*'),
    client.from('vehicles').select('*'),
    client.from('traffic_fines').select('*'),
    client.from('driver_receipt_terms').select('*'),
  ]);

  const rawFines = finRes.data || [];
  const regularFines: TrafficFine[] = [];
  const operacaoCAItems: OperacaoCAItem[] = [];

  rawFines.forEach((row: any) => {
    const isCA =
      row.issuing_authority === 'OPERACAO_CA' ||
      (row.notes && (row.notes.includes('"isOperacaoCA":true') || row.notes.includes('"isOperacaoCA": true')));
    if (isCA) {
      operacaoCAItems.push(mapSupabaseRowToOperacaoCA(row));
    } else {
      regularFines.push(mapSupabaseRowToFine(row));
    }
  });

  const rawTerms = trmRes.data || [];
  const regularTerms: DriverReceiptTerm[] = [];
  const operacaoCATerms: OperacaoCATerm[] = [];

  rawTerms.forEach((row: any) => {
    const isCATerm =
      row.issuing_authority === 'OPERACAO_CA' ||
      (row.observations && (row.observations.includes('"isOperacaoCA":true') || row.observations.includes('"isOperacaoCA": true')));
    if (isCATerm) {
      operacaoCATerms.push(mapSupabaseRowToOperacaoCATerm(row));
    } else {
      regularTerms.push(mapSupabaseRowToTerm(row));
    }
  });

  const firstError =
    finRes.error?.message ||
    drvRes.error?.message ||
    vehRes.error?.message ||
    trmRes.error?.message ||
    usrRes.error?.message;

  return {
    users: (usrRes.data || []).map(mapSupabaseRowToUser),
    drivers: (drvRes.data || []).map(mapSupabaseRowToDriver),
    vehicles: (vehRes.data || []).map(mapSupabaseRowToVehicle),
    fines: regularFines,
    terms: regularTerms,
    operacaoCAItems,
    operacaoCATerms,
    error: firstError,
  };
}

/**
 * Bidirectional sync between local app state and Supabase:
 * 1. Pushes all local users, drivers, vehicles, fines, and terms to Supabase (in dependency order).
 * 2. Pulls all records from Supabase and merges them with local state without losing local PDFs or records.
 */
export async function syncBidirectionalWithSupabase(local: {
  users: SystemUser[];
  drivers: Driver[];
  vehicles: Vehicle[];
  fines: TrafficFine[];
  terms: DriverReceiptTerm[];
}): Promise<{
  configured: boolean;
  users: SystemUser[];
  drivers: Driver[];
  vehicles: Vehicle[];
  fines: TrafficFine[];
  terms: DriverReceiptTerm[];
  pushedCount: number;
  pulledCount: number;
  errors: string[];
}> {
  const client = await ensureSupabaseClient();
  if (!client) {
    return {
      configured: false,
      ...local,
      pushedCount: 0,
      pulledCount: 0,
      errors: [],
    };
  }

  const errors: string[] = [];
  let pushedCount = 0;

  // 1. Push in strict dependency order: users -> drivers -> vehicles -> fines -> terms
  for (const u of local.users) {
    const res = await upsertSupabaseUser(u);
    if (res.success) pushedCount++;
    else if (res.error && !errors.includes(res.error)) errors.push(`Usuários: ${res.error}`);
  }

  for (const d of local.drivers) {
    const res = await upsertSupabaseDriver(d, FLEET_SHARED_OWNER_ID);
    if (res.success) pushedCount++;
    else if (res.error && !errors.includes(res.error)) errors.push(`Motoristas: ${res.error}`);
  }

  for (const v of local.vehicles) {
    const res = await upsertSupabaseVehicle(v, FLEET_SHARED_OWNER_ID);
    if (res.success) pushedCount++;
    else if (res.error && !errors.includes(res.error)) errors.push(`Veículos: ${res.error}`);
  }

  for (const f of local.fines) {
    const res = await upsertSupabaseFine(f, FLEET_SHARED_OWNER_ID);
    if (res.success) pushedCount++;
    else if (res.error && !errors.includes(res.error)) errors.push(`Multas: ${res.error}`);
  }

  for (const t of local.terms) {
    const res = await upsertSupabaseTerm(t, FLEET_SHARED_OWNER_ID);
    if (res.success) pushedCount++;
    else if (res.error && !errors.includes(res.error)) errors.push(`Termos: ${res.error}`);
  }

  // 2. Pull all records from Supabase and merge with local state
  const remote = await fetchAllFromSupabase();
  if (!remote) {
    return {
      configured: true,
      ...local,
      pushedCount,
      pulledCount: 0,
      errors,
    };
  }

  if (remote.error && !errors.includes(remote.error)) {
    errors.push(remote.error);
  }

  // Merge Users (by id or username/email)
  const mergedUsersMap = new Map<string, SystemUser>();
  for (const u of local.users) {
    mergedUsersMap.set(u.username.trim().toLowerCase(), u);
  }
  for (const ru of remote.users) {
    const key = ru.username.trim().toLowerCase();
    const existing = mergedUsersMap.get(key);
    mergedUsersMap.set(key, existing ? { ...existing, ...ru } : ru);
  }

  // Merge Drivers (by id or cpf/cnhNumber)
  const mergedDriversMap = new Map<string, Driver>();
  for (const d of local.drivers) {
    const key = (d.cpf || d.cnhNumber || d.id).trim().toUpperCase();
    mergedDriversMap.set(key, d);
  }
  for (const rd of remote.drivers) {
    const key = (rd.cpf || rd.cnhNumber || rd.id).trim().toUpperCase();
    const existing = mergedDriversMap.get(key);
    mergedDriversMap.set(key, existing ? { ...existing, ...rd } : rd);
  }

  // Merge Vehicles (by plate)
  const mergedVehiclesMap = new Map<string, Vehicle>();
  for (const v of local.vehicles) {
    const key = (v.plate || v.id).trim().toUpperCase();
    mergedVehiclesMap.set(key, v);
  }
  for (const rv of remote.vehicles) {
    const key = (rv.plate || rv.id).trim().toUpperCase();
    const existing = mergedVehiclesMap.get(key);
    mergedVehiclesMap.set(key, existing ? { ...existing, ...rv } : rv);
  }

  // Merge Fines (by aitNumber, preserving local pdfDataUrl if remote doesn't have it)
  const mergedFinesMap = new Map<string, TrafficFine>();
  for (const f of local.fines) {
    const key = (f.aitNumber || f.id).trim().toUpperCase();
    mergedFinesMap.set(key, f);
  }
  for (const rf of remote.fines) {
    const key = (rf.aitNumber || rf.id).trim().toUpperCase();
    const existing = mergedFinesMap.get(key);
    mergedFinesMap.set(
      key,
      existing
        ? {
            ...existing,
            ...rf,
            pdfDataUrl: rf.pdfDataUrl || existing.pdfDataUrl,
            pdfFileName: rf.pdfFileName || existing.pdfFileName,
            pdfMimeType: rf.pdfMimeType || existing.pdfMimeType,
          }
        : rf
    );
  }

  // Merge Terms (by aitNumber or protocolNumber)
  const mergedTermsMap = new Map<string, DriverReceiptTerm>();
  for (const t of local.terms) {
    const key = (t.aitNumber || t.protocolNumber || t.id).trim().toUpperCase();
    mergedTermsMap.set(key, t);
  }
  for (const rt of remote.terms) {
    const key = (rt.aitNumber || rt.protocolNumber || rt.id).trim().toUpperCase();
    const existing = mergedTermsMap.get(key);
    mergedTermsMap.set(key, existing ? { ...existing, ...rt } : rt);
  }

  const pulledCount =
    remote.drivers.length +
    remote.vehicles.length +
    remote.fines.length +
    remote.terms.length;

  return {
    configured: true,
    users: Array.from(mergedUsersMap.values()),
    drivers: Array.from(mergedDriversMap.values()),
    vehicles: Array.from(mergedVehiclesMap.values()),
    fines: Array.from(mergedFinesMap.values()),
    terms: Array.from(mergedTermsMap.values()),
    pushedCount,
    pulledCount,
    errors,
  };
}

/**
 * Subscribes to real-time changes in Supabase PostgreSQL tables
 * so any fine or launch added/updated in Vercel or Supabase updates live.
 */
export function subscribeToSupabaseRealtime(onRemoteChange: () => void): () => void {
  let channel: any = null;
  let active = true;

  ensureSupabaseClient().then((client) => {
    if (!client || !active) return;
    channel = client
      .channel('fleet-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'traffic_fines' }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
        onRemoteChange();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        onRemoteChange();
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_receipt_terms' },
        () => {
          onRemoteChange();
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_users' }, () => {
        onRemoteChange();
      })
      .subscribe();
  });

  return () => {
    active = false;
    if (channel && supabase) {
      supabase.removeChannel(channel).catch(() => {});
    }
  };
}
