import React, { useState, useEffect } from 'react';
import {
  INITIAL_DRIVERS,
  INITIAL_VEHICLES,
  INITIAL_FINES,
  INITIAL_NOTIFICATIONS,
  INITIAL_USERS,
  INITIAL_OPERACAO_CA,
  INITIAL_COMPANIES,
  getRoleLabel,
  getDefaultPermissionsForRole,
} from './data/mockData';
import {
  Driver,
  Vehicle,
  TrafficFine,
  AppNotification,
  UserSession,
  DriverReceiptTerm,
  SystemUser,
  OperacaoCAItem,
  OperacaoCATerm,
  Company,
} from './types';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DriversView } from './components/DriversView';
import { VehiclesView } from './components/VehiclesView';
import { FinesView } from './components/FinesView';
import { FineSearchView } from './components/FineSearchView';
import { FinesReportView } from './components/FinesReportView';
import { ReceiptTermView } from './components/ReceiptTermView';
import { DetranLookupView } from './components/DetranLookupView';
import { UsersPermissionsView } from './components/UsersPermissionsView';
import {
  auth,
  onAuthStateChanged,
  signInWithGooglePopup,
  signOutFirebase,
  subscribeToUserCollections,
  saveDriverToCloud,
  deleteDriverFromCloud,
  saveVehicleToCloud,
  deleteVehicleFromCloud,
  saveFineToCloud,
  deleteFineFromCloud,
  saveTermToCloud,
  deleteTermFromCloud,
  FirebaseUser,
} from './firebase';
import {
  upsertSupabaseUser,
  deleteSupabaseUser,
  upsertSupabaseDriver,
  deleteSupabaseDriver,
  upsertSupabaseVehicle,
  deleteSupabaseVehicle,
  upsertSupabaseFine,
  deleteSupabaseFine,
  upsertSupabaseTerm,
  deleteSupabaseTerm,
  syncBidirectionalWithSupabase,
  subscribeToSupabaseRealtime,
  fetchAllFromSupabase,
  clearSupabaseDatabase,
} from './lib/supabase';
import { DriverCNHModal } from './components/DriverCNHModal';
import { CNHScannerModal } from './components/CNHScannerModal';
import { VehicleCRLVModal } from './components/VehicleCRLVModal';
import { CRLVScannerModal } from './components/CRLVScannerModal';
import { DocumentScannerView } from './components/DocumentScannerView';
import { OperacaoCAView } from './components/OperacaoCAView';
import { CompaniesManagementView } from './components/CompaniesManagementView';
import { FinePDFModal } from './components/FinePDFModal';
import { FineDetailModal } from './components/FineDetailModal';
import { ImportedFinePdfModal } from './components/ImportedFinePdfModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { LogoutModal } from './components/LogoutModal';
import { NotificationsModal } from './components/NotificationsModal';
import { PrintableDocumentPayload } from './lib/printService';
import { RotateCcw, Database, Plus, Sparkles, FileSignature, CheckCircle2, AlertTriangle, UserCheck, ShieldCheck, Eye, X } from 'lucide-react';

const DB_STORAGE_KEY = 'ciit_clean_db_v2';

function cleanLegacyTransBrasilString(val: unknown): string {
  if (typeof val !== 'string') return '';
  if (/transbra[s]?il|translogistica|14\.285\.932/i.test(val)) {
    return '';
  }
  return val;
}

function loadPersistedArray<T>(subKey: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(`${DB_STORAGE_KEY}_${subKey}`);
    if (raw) {
      // Strip any legacy TransBrasil Logística references from stored JSON
      const sanitizedRaw = raw
        .replace(/TransBra[s]?il Log[íi]stica\s*(&\s*Cargas\s*Ltda)?/gi, '')
        .replace(/14\.285\.932\/0001-44/g, '')
        .replace(/@translogistica\.com\.br/gi, '@frota.com.br');
      const parsed = JSON.parse(sanitizedRaw);
      if (Array.isArray(parsed)) {
        if (subKey === 'terms') {
          // Deduplicate terms by AIT number or fineId
          const seenAits = new Set<string>();
          return parsed.filter((item: any) => {
            const key = (item?.aitNumber || item?.fineId || item?.id || '').toString().trim().toUpperCase();
            if (!key || seenAits.has(key)) return false;
            seenAits.add(key);
            return true;
          });
        }
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return fallback;
}

export default function App() {
  // 1. Auth State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [cloudUser, setCloudUser] = useState<FirebaseUser | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // 2. Navigation & Responsive Left Sidebar State
  const [activeTab, setActiveTab] = useState<ActiveTab>('vehicles');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 3. Domain Entities State (Initialized ZERADO / Empty as requested for production use)
  const [users, setUsers] = useState<SystemUser[]>(() => {
    const loaded = loadPersistedArray<SystemUser>('users', INITIAL_USERS).filter(
      (u) => !['usr-gestor-02', 'usr-rh-03', 'usr-motorista-04'].includes(u.id)
    );
    return loaded.length > 0 ? loaded : INITIAL_USERS;
  });
  const [drivers, setDrivers] = useState<Driver[]>(() => loadPersistedArray('drivers', []));
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadPersistedArray('vehicles', []));
  const [fines, setFines] = useState<TrafficFine[]>(() => loadPersistedArray('fines', []));
  const [terms, setTerms] = useState<DriverReceiptTerm[]>(() => loadPersistedArray('terms', []));
  const [operacaoCAItems, setOperacaoCAItems] = useState<OperacaoCAItem[]>(() =>
    loadPersistedArray('operacao_ca', [])
  );
  const [operacaoCATerms, setOperacaoCATerms] = useState<OperacaoCATerm[]>(() =>
    loadPersistedArray('operacao_ca_terms', [])
  );
  const [companies, setCompanies] = useState<Company[]>(() =>
    loadPersistedArray<Company>('companies', INITIAL_COMPANIES)
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadPersistedArray('notifications', [
      {
        id: 'notif-clean-init',
        title: 'Banco de Dados Zerado e Pronto para Uso',
        message: 'O sistema Controle Interno de Infrações de Trânsito está limpo e pronto para seus cadastros e importações sem duplicidade.',
        type: 'INFO',
        severity: 'info',
        timestamp: 'Agora',
        read: false,
      },
    ])
  );

  // Persist to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(`${DB_STORAGE_KEY}_users`, JSON.stringify(users));
      localStorage.setItem(`${DB_STORAGE_KEY}_drivers`, JSON.stringify(drivers));
      localStorage.setItem(`${DB_STORAGE_KEY}_vehicles`, JSON.stringify(vehicles));
      localStorage.setItem(`${DB_STORAGE_KEY}_companies`, JSON.stringify(companies));
      localStorage.setItem(`${DB_STORAGE_KEY}_terms`, JSON.stringify(terms));
      localStorage.setItem(`${DB_STORAGE_KEY}_operacao_ca`, JSON.stringify(operacaoCAItems));
      localStorage.setItem(`${DB_STORAGE_KEY}_operacao_ca_terms`, JSON.stringify(operacaoCATerms));
      localStorage.setItem(`${DB_STORAGE_KEY}_notifications`, JSON.stringify(notifications));
      try {
        localStorage.setItem(`${DB_STORAGE_KEY}_fines`, JSON.stringify(fines));
      } catch {
        // Fallback if an uploaded PDF is larger than localStorage quota
        const lightFines = fines.map(({ pdfDataUrl, ...rest }) => rest);
        localStorage.setItem(`${DB_STORAGE_KEY}_fines`, JSON.stringify(lightFines));
      }
    } catch {
      // ignore
    }
  }, [users, drivers, vehicles, fines, terms, operacaoCAItems, operacaoCATerms, notifications]);

  // Auth state listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      setCloudUser(fbUser);
    });
    return () => {
      unsubAuth();
    };
  }, []);

  // Automatic Supabase + Vercel Bidirectional Sync on Boot & Realtime Updates
  useEffect(() => {
    let isMounted = true;

    const runInitialSupabaseSync = async () => {
      const remote = await fetchAllFromSupabase();
      if (!isMounted || !remote) return;

      if (remote.users && remote.users.length > 0) {
        setUsers(remote.users);
      }
      setDrivers((prev) => {
        const localMap = new Map<string, Driver>(prev.map((d) => [d.id, d]));
        const localCpfMap = new Map<string, Driver>(
          prev.map((d) => [d.cpf.replace(/\D/g, ''), d])
        );
        return (remote.drivers || []).map((rd) => {
          const cleanCpf = rd.cpf.replace(/\D/g, '');
          const local = localMap.get(rd.id) || (cleanCpf ? localCpfMap.get(cleanCpf) : undefined);
          return {
            ...rd,
            rg: rd.rg || local?.rg,
            observations: rd.observations || local?.observations,
            isPlogDriver: rd.isPlogDriver ?? local?.isPlogDriver,
            operationType: rd.operationType || local?.operationType,
          };
        });
      });
      setVehicles(remote.vehicles || []);
      setTerms(remote.terms || []);

      setFines((prev) => {
        const localMap = new Map<string, TrafficFine>(
          prev.map((f) => [f.aitNumber.trim().toUpperCase(), f])
        );
        return (remote.fines || []).map((rf) => {
          const key = rf.aitNumber.trim().toUpperCase();
          const local = localMap.get(key);
          return local?.pdfDataUrl && !rf.pdfDataUrl ? { ...rf, pdfDataUrl: local.pdfDataUrl } : rf;
        });
      });
    };

    runInitialSupabaseSync();

    const unsubRealtime = subscribeToSupabaseRealtime(async () => {
      const remote = await fetchAllFromSupabase();
      if (!isMounted || !remote) return;

      if (remote.users && remote.users.length > 0) {
        setUsers(remote.users);
      }
      setDrivers((prev) => {
        const localMap = new Map<string, Driver>(prev.map((d) => [d.id, d]));
        const localCpfMap = new Map<string, Driver>(
          prev.map((d) => [d.cpf.replace(/\D/g, ''), d])
        );
        return (remote.drivers || []).map((rd) => {
          const cleanCpf = rd.cpf.replace(/\D/g, '');
          const local = localMap.get(rd.id) || (cleanCpf ? localCpfMap.get(cleanCpf) : undefined);
          return {
            ...rd,
            rg: rd.rg || local?.rg,
            observations: rd.observations || local?.observations,
            isPlogDriver: rd.isPlogDriver ?? local?.isPlogDriver,
            operationType: rd.operationType || local?.operationType,
          };
        });
      });
      setVehicles(remote.vehicles || []);
      setTerms(remote.terms || []);

      setFines((prev) => {
        const localMap = new Map<string, TrafficFine>(
          prev.map((f) => [f.aitNumber.trim().toUpperCase(), f])
        );
        return (remote.fines || []).map((rf) => {
          const key = rf.aitNumber.trim().toUpperCase();
          const local = localMap.get(key);
          return local?.pdfDataUrl && !rf.pdfDataUrl ? { ...rf, pdfDataUrl: local.pdfDataUrl } : rf;
        });
      });
    });

    return () => {
      isMounted = false;
      unsubRealtime();
    };
  }, []);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isResetDbModalOpen, setIsResetDbModalOpen] = useState(false);
  const [isResettingDatabase, setIsResettingDatabase] = useState(false);
  const [isSyncingDetran, setIsSyncingDetran] = useState(false);
  const [systemBanner, setSystemBanner] = useState<{
    type: 'success' | 'warning';
    title?: string;
    text: string;
    relatedFine?: TrafficFine;
  } | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isCnhScannerOpen, setIsCnhScannerOpen] = useState(false);
  const [scannedDriverData, setScannedDriverData] = useState<Partial<Driver> | null>(null);

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isCrlvScannerOpen, setIsCrlvScannerOpen] = useState(false);
  const [scannedVehicleData, setScannedVehicleData] = useState<Partial<Vehicle> | null>(null);

  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [editingFine, setEditingFine] = useState<TrafficFine | null>(null);
  const [fineModalInitialTab, setFineModalInitialTab] = useState<'pdf' | 'bulk' | 'form' | 'preview'>('pdf');

  const [selectedFineDetail, setSelectedFineDetail] = useState<TrafficFine | null>(null);
  const [viewingImportedPdfFine, setViewingImportedPdfFine] = useState<TrafficFine | null>(null);
  const [selectedFineForTerm, setSelectedFineForTerm] = useState<TrafficFine | null>(null);
  const [printModalPayload, setPrintModalPayload] = useState<PrintableDocumentPayload | null>(null);
  const [detranPlateQuery, setDetranPlateQuery] = useState('');

  const showToastBanner = (
    text: string,
    type: 'success' | 'warning' = 'success',
    title?: string,
    relatedFine?: TrafficFine
  ) => {
    setSystemBanner({ type, title, text, relatedFine });
    setTimeout(() => setSystemBanner(null), 6500);
  };

  // Auth Handlers
  const handleLogin = (user: UserSession) => {
    const cleanUser: UserSession = {
      ...user,
      companyName: cleanLegacyTransBrasilString(user.companyName),
      companyCnpj: cleanLegacyTransBrasilString(user.companyCnpj),
    };
    setCurrentUser(cleanUser);
    setActiveTab('vehicles');
    showToastBanner(
      `Usuário Logado: ${cleanUser.name} (${
        cleanUser.username ? `@${cleanUser.username} • ` : ''
      }${getRoleLabel(cleanUser.role, cleanUser.customRoleName)}) — Acesso liberado com sucesso!`,
      'success'
    );
  };

  // Guard unauthorized tabs for PLOG user vs Multi-empresa ERP / Matriz
  useEffect(() => {
    const isPlog = currentUser?.username?.toLowerCase() === 'plog';
    const isAdmin = currentUser?.role === 'ADMIN';
    const hasOperacaoCAPerm = currentUser?.permissions?.accessOperacaoCA;
    const hasCompaniesPerm = currentUser?.permissions?.manageCompanies;

    if (isPlog) {
      const plogAllowedTabs: ActiveTab[] = [
        'vehicles',
        'drivers',
        'operacao-ca',
        'receipts',
        'detran',
        'notifications',
      ];
      if (!plogAllowedTabs.includes(activeTab)) {
        setActiveTab('vehicles');
      }
    } else {
      // Non-plog users: Operação C.A is accessible if permitted or Admin
      if (activeTab === 'operacao-ca' && !isAdmin && !hasOperacaoCAPerm) {
        setActiveTab('vehicles');
      }
      // Companies management accessible if permitted or Admin
      if (activeTab === 'companies' && !isAdmin && !hasCompaniesPerm) {
        setActiveTab('vehicles');
      }
      // Dashboard is removed, fallback to vehicles
      if (activeTab === 'dashboard') {
        setActiveTab('vehicles');
      }
    }
  }, [currentUser, activeTab]);

  const handleLinkSupabaseUser = (linkedUser: SystemUser) => {
    setUsers((prev) => {
      const exists = prev.some(
        (u) =>
          u.id === linkedUser.id ||
          u.username.toLowerCase() === linkedUser.username.toLowerCase() ||
          u.email.toLowerCase() === linkedUser.email.toLowerCase()
      );
      if (exists) {
        return prev.map((u) =>
          u.id === linkedUser.id ||
          u.username.toLowerCase() === linkedUser.username.toLowerCase() ||
          u.email.toLowerCase() === linkedUser.email.toLowerCase()
            ? linkedUser
            : u
        );
      }
      return [linkedUser, ...prev];
    });

    const loginTime = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setCurrentUser({
      id: linkedUser.id,
      name: linkedUser.name,
      username: linkedUser.username,
      email: linkedUser.email,
      role: linkedUser.role,
      customRoleName: linkedUser.customRoleName || 'Administrador (Supabase)',
      department: linkedUser.department || 'Gestão de Frota & Banco Supabase',
      permissions: linkedUser.permissions,
      companyName: '',
      companyCnpj: '',
      avatarUrl: linkedUser.avatarUrl,
      loginAt: loginTime,
    });

    setActiveTab('vehicles');
    showToastBanner(
      `Usuário do Supabase vinculado com sucesso! Você está conectado como ${linkedUser.name} (@${linkedUser.username}).`,
      'success',
      'Credenciais do Supabase Vinculadas!'
    );
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    setSystemBanner(null);
    setCurrentUser(null);
    if (cloudUser) {
      signOutFirebase().catch(() => {});
    }
  };

  const handleGoogleCloudLogin = async () => {
    const fbUser = await signInWithGooglePopup();
    const loginTime = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const session: UserSession = {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Administrador Cloud',
      username: fbUser.email?.split('@')[0] || 'admin',
      email: fbUser.email || '',
      role: 'ADMIN',
      customRoleName: 'Administrador Cloud',
      department: 'Gestão de Frota & Multas',
      permissions: getDefaultPermissionsForRole('ADMIN'),
      companyName: '',
      companyCnpj: '',
      avatarUrl: fbUser.photoURL || undefined,
      loginAt: loginTime,
    };
    setCurrentUser(session);
    setActiveTab('vehicles');
    showToastBanner(
      `Conectado ao Banco em Nuvem (${fbUser.email}) com sincronização automática ativa!`,
      'success',
      'Banco de Dados Conectado!'
    );
  };

  const handleSyncAllToCloud = async () => {
    setIsSyncingCloud(true);
    try {
      if (cloudUser) {
        for (const d of drivers) await saveDriverToCloud(d);
        for (const v of vehicles) await saveVehicleToCloud(v);
        for (const f of fines) await saveFineToCloud(f);
        for (const t of terms) await saveTermToCloud(t);
      }

      const syncRes = await syncBidirectionalWithSupabase({
        users,
        drivers,
        vehicles,
        fines,
        terms,
      });

      if (syncRes.configured) {
        if (syncRes.users.length > 0) setUsers(syncRes.users);
        if (syncRes.drivers.length > 0) setDrivers(syncRes.drivers);
        if (syncRes.vehicles.length > 0) setVehicles(syncRes.vehicles);
        if (syncRes.fines.length > 0) setFines(syncRes.fines);
        if (syncRes.terms.length > 0) setTerms(syncRes.terms);

        if (syncRes.errors.length > 0) {
          showToastBanner(
            `Sincronização parcial (${syncRes.pushedCount} enviado(s)). Caso alguma tabela esteja bloqueada por RLS no Supabase, execute a aba "004_migrate_fines_and_fix_rls.sql" no SQL Editor.`,
            'warning',
            'Atenção na Política RLS do Supabase'
          );
        } else {
          showToastBanner(
            `Sincronização concluída: ${syncRes.fines.length} multa(s), ${syncRes.drivers.length} motorista(s), ${syncRes.vehicles.length} veículo(s) e ${syncRes.terms.length} termo(s) migrados e sincronizados com o Supabase & Vercel!`,
            'success',
            'Multas e Lançamentos Sincronizados!'
          );
        }
      } else {
        showToastBanner(
          `Para migrar suas ${fines.length} multa(s) e lançamentos para o Supabase e Vercel agora, clique em "Copiar Script 004" e execute no SQL Editor do Supabase (ou exporte o arquivo .json).`,
          'success',
          'Script SQL 004 & Pacote JSON Prontos para Migração!'
        );
      }
    } catch (err: any) {
      showToastBanner(
        `Aviso na sincronização: ${err?.message || 'Verifique sua conexão.'}`,
        'warning'
      );
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // System Users & Permissions CRUD Handlers
  const handleSaveUser = (savedUser: SystemUser, isNew: boolean) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === savedUser.id);
      if (exists) {
        return prev.map((u) => (u.id === savedUser.id ? savedUser : u));
      }
      return [savedUser, ...prev];
    });
    upsertSupabaseUser(savedUser).catch(() => {});

    if (currentUser && currentUser.id === savedUser.id) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              name: savedUser.name,
              username: savedUser.username,
              email: savedUser.email,
              role: savedUser.role,
              customRoleName: savedUser.customRoleName,
              department: savedUser.department,
              permissions: savedUser.permissions,
            }
          : null
      );
    }

    showToastBanner(
      isNew
        ? `Novo usuário "${savedUser.name}" (login: ${savedUser.username}) cadastrado com suas permissões!`
        : `Permissões e dados do usuário "${savedUser.name}" atualizados com sucesso!`,
      'success'
    );
  };

  const handleDeleteUser = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (currentUser && currentUser.id === userId) {
      showToastBanner('Você não pode excluir o próprio usuário que está logado no momento.', 'warning');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    const res = await deleteSupabaseUser(userId, target.username, target.email);
    if (res.success) {
      showToastBanner(`Usuário "${target.name}" removido do sistema e do Supabase com sucesso.`, 'warning');
    } else {
      showToastBanner(`Aviso ao excluir usuário no Supabase: ${res.error || 'Erro'}`, 'warning');
    }
  };

  const handleToggleUserActive = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (currentUser && currentUser.id === userId) {
      showToastBanner('Não é permitido bloquear o próprio usuário logado na sessão atual.', 'warning');
      return;
    }
    const nextState = !target.active;
    const updatedUser: SystemUser = { ...target, active: nextState };
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? updatedUser : u))
    );
    upsertSupabaseUser(updatedUser).catch(() => {});
    showToastBanner(
      `Usuário "${target.name}" foi ${nextState ? 'ativado (acesso liberado)' : 'bloqueado (acesso suspenso)'}.`,
      nextState ? 'success' : 'warning'
    );
  };

  // Companies & Filiais (ERP) Handlers
  const handleSaveCompany = (comp: Company, isNew: boolean) => {
    setCompanies((prev) => {
      if (isNew) {
        showToastBanner(`Empresa "${comp.name}" cadastrada com sucesso!`, 'success');
        return [...prev, comp];
      }
      showToastBanner(`Dados da empresa "${comp.name}" atualizados com sucesso!`, 'success');
      return prev.map((c) => (c.id === comp.id ? comp : c));
    });
  };

  const handleDeleteCompany = (compId: string) => {
    const targetComp = companies.find((c) => c.id === compId);
    setCompanies((prev) => prev.filter((c) => c.id !== compId));
    showToastBanner(
      `Empresa "${targetComp?.name || compId}" removida com sucesso.`,
      'warning'
    );
  };

  // Database Reset & Sample Data Load Handlers
  const handleConfirmResetDatabase = async () => {
    setIsResettingDatabase(true);
    try {
      // 1. Limpa integralmente as tabelas operacionais do Supabase e valida 0 registros
      await clearSupabaseDatabase();

      // 2. Limpa o estado local da aplicação
      setDrivers([]);
      setVehicles([]);
      setFines([]);
      setTerms([]);
      setOperacaoCAItems([]);
      setOperacaoCATerms([]);
      setNotifications([
        {
          id: `notif-reset-${Date.now()}`,
          title: 'Banco de Dados Zerado',
          message: 'Todos os cadastros de motoristas, veículos, multas, recibos e Operação C.A foram limpos com sucesso localmente e no Supabase.',
          type: 'INFO',
          severity: 'info',
          timestamp: 'Agora mesmo',
          read: false,
        },
      ]);

      // 3. Limpa storage local
      localStorage.setItem(`${DB_STORAGE_KEY}_drivers`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_vehicles`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_fines`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_terms`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_operacao_ca`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_operacao_ca_terms`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_last_reset_at`, Date.now().toString());

      setIsResetDbModalOpen(false);
      showToastBanner('Banco de dados e Supabase zerados com sucesso! Nenhum dado anterior retornará.', 'success');
    } catch {
      setDrivers([]);
      setVehicles([]);
      setFines([]);
      setTerms([]);
      setOperacaoCAItems([]);
      setOperacaoCATerms([]);
      localStorage.setItem(`${DB_STORAGE_KEY}_drivers`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_vehicles`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_fines`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_terms`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_operacao_ca`, '[]');
      localStorage.setItem(`${DB_STORAGE_KEY}_operacao_ca_terms`, '[]');
      setIsResetDbModalOpen(false);
      showToastBanner('Banco de dados zerado com sucesso!', 'success');
    } finally {
      setIsResettingDatabase(false);
    }
  };

  const handleLoadSampleData = () => {
    setDrivers(INITIAL_DRIVERS);
    setVehicles(INITIAL_VEHICLES);
    setFines(INITIAL_FINES);
    setCompanies(INITIAL_COMPANIES);
    setOperacaoCAItems(INITIAL_OPERACAO_CA);
    setNotifications(INITIAL_NOTIFICATIONS);
    syncBidirectionalWithSupabase({
      users,
      drivers: INITIAL_DRIVERS,
      vehicles: INITIAL_VEHICLES,
      fines: INITIAL_FINES,
      terms,
    }).catch(() => {});
    showToastBanner('Dados de demonstração carregados e sincronizados com sucesso!', 'success');
  };

  // Sync Detran Fleet Handler
  const handleSyncDetran = () => {
    setIsSyncingDetran(true);
    setTimeout(() => {
      setIsSyncingDetran(false);
      const syncNotif: AppNotification = {
        id: `notif-sync-${Date.now()}`,
        title: 'Sincronização com Detran Concluída',
        message: `Todos os ${vehicles.length} veículos cadastrados foram consultados nas bases estaduais e RENAINF.`,
        type: 'DETRAN_SYNC',
        severity: 'success',
        timestamp: 'Agora mesmo',
        read: false,
      };
      setNotifications((prev) => [syncNotif, ...prev]);
      showToastBanner('Sincronização com a base do Detran concluída!', 'success');
    }, 1200);
  };

  // Driver CRUD Handlers (with duplicate prevention and Supabase/Vercel sync)
  const handleSaveDriver = async (savedDriver: Driver) => {
    setDrivers((prev) => {
      const exists = prev.some((d) => d.id === savedDriver.id);
      if (exists) {
        return prev.map((d) => (d.id === savedDriver.id ? savedDriver : d));
      }
      return [savedDriver, ...prev];
    });
    if (cloudUser) {
      saveDriverToCloud(savedDriver).catch(() => {});
    }

    const res = await upsertSupabaseDriver(savedDriver, cloudUser?.uid || currentUser?.id || 'admin');

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Motorista Salvo com Sucesso',
      message: `Motorista ${savedDriver.name} (CPF ${savedDriver.cpf} • CNH ${savedDriver.cnhNumber} • Cat. ${savedDriver.cnhCategory}) salvo e sincronizado no Supabase e Vercel.`,
      type: 'INFO',
      severity: 'success',
      timestamp: 'Agora',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);

    if (res.success) {
      showToastBanner(
        `Motorista ${savedDriver.name} salvo com sucesso no banco de dados e sincronizado com o Supabase e Vercel!`,
        'success',
        'Cadastro Realizado com Sucesso'
      );
    } else {
      showToastBanner(
        `Motorista salvo localmente. Aviso na sincronização: ${res.error || 'Aguardando conexão'}`,
        'warning'
      );
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    const target = drivers.find((d) => d.id === driverId);
    setDrivers((prev) => prev.filter((d) => d.id !== driverId));
    if (cloudUser) {
      deleteDriverFromCloud(driverId).catch(() => {});
    }
    const res = await deleteSupabaseDriver(driverId, target?.cpf, target?.cnhNumber);
    if (res.success) {
      showToastBanner('Motorista excluído com sucesso do sistema, Supabase e Vercel!', 'warning');
    } else {
      showToastBanner(`Aviso ao excluir motorista no Supabase: ${res.error || 'Erro'}`, 'warning');
    }
  };

  const handleBulkImportDrivers = async (importedDrivers: Driver[], updateExisting: boolean) => {
    if (importedDrivers.length === 0) return;

    setDrivers((prev) => {
      const prevCpfMap = new Map<string, Driver>();
      prev.forEach((d) => {
        const c = d.cpf.replace(/\D/g, '');
        if (c) prevCpfMap.set(c, d);
      });

      const updatedList = [...prev];
      const newlyAdded: Driver[] = [];

      for (const d of importedDrivers) {
        const cleanCpf = d.cpf.replace(/\D/g, '');
        const existing = cleanCpf ? prevCpfMap.get(cleanCpf) : undefined;

        if (existing) {
          if (updateExisting) {
            const index = updatedList.findIndex((item) => item.id === existing.id);
            if (index !== -1) {
              updatedList[index] = { ...existing, ...d, id: existing.id };
            }
          }
        } else {
          newlyAdded.push(d);
        }
      }

      return [...newlyAdded, ...updatedList];
    });

    // Persist each driver in Supabase and Vercel
    const ownerId = cloudUser?.uid || currentUser?.id || 'admin';
    await Promise.all(
      importedDrivers.map(async (d) => {
        if (cloudUser) {
          saveDriverToCloud(d).catch(() => {});
        }
        return upsertSupabaseDriver(d, ownerId).catch((err) => ({ success: false, error: String(err) }));
      })
    );

    const notif: AppNotification = {
      id: `notif-bulk-drivers-${Date.now()}`,
      title: `${importedDrivers.length} Motorista(s) Importado(s) via Planilha`,
      message: `Planilha Excel processada com sucesso: ${importedDrivers.length} motorista(s) cadastrado(s)/atualizado(s) e sincronizados no Supabase e Vercel.`,
      type: 'INFO',
      severity: 'success',
      timestamp: 'Agora mesmo',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);

    showToastBanner(
      `${importedDrivers.length} motorista(s) importado(s) com sucesso via planilha Excel e sincronizados no Supabase e Vercel!`,
      'success',
      'Importação de Motoristas Concluída!'
    );
  };

  // Vehicle CRUD Handlers (with duplicate prevention)
  const handleSaveVehicle = (savedVehicle: Vehicle) => {
    setVehicles((prev) => {
      const exists = prev.some((v) => v.id === savedVehicle.id);
      if (exists) {
        return prev.map((v) => (v.id === savedVehicle.id ? savedVehicle : v));
      }
      return [savedVehicle, ...prev];
    });
    if (cloudUser) {
      saveVehicleToCloud(savedVehicle).catch(() => {});
    }
    upsertSupabaseVehicle(savedVehicle, cloudUser?.uid || currentUser?.id || 'admin').catch(() => {});

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Veículo Cadastrado com Sucesso',
      message: `Veículo cadastrado com sucesso: Placa ${savedVehicle.plate} (${savedVehicle.brandModel}).`,
      type: 'INFO',
      severity: 'success',
      timestamp: 'Agora',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
    showToastBanner(
      `Veículo cadastrado com sucesso! (Placa ${savedVehicle.plate} • ${savedVehicle.brandModel})`,
      'success',
      'Veículo cadastrado com sucesso!'
    );
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    if (cloudUser) {
      deleteVehicleFromCloud(vehicleId).catch(() => {});
    }
    const res = await deleteSupabaseVehicle(vehicleId, target?.plate, target?.renavam);
    if (res.success) {
      showToastBanner('Veículo excluído com sucesso do sistema e do Supabase!', 'warning');
    } else {
      showToastBanner(`Aviso ao excluir veículo no Supabase: ${res.error || 'Erro'}`, 'warning');
    }
  };

  // Fine CRUD Handlers (with duplicate prevention)
  const handleSaveFine = (savedFine: TrafficFine) => {
    // Check if AIT already exists when importing from Detran or modal
    const existingByAit = fines.find(
      (f) =>
        f.id !== savedFine.id &&
        f.aitNumber.trim().toUpperCase() === savedFine.aitNumber.trim().toUpperCase()
    );
    if (existingByAit) {
      showToastBanner(
        `Atenção: O Auto de Infração ${savedFine.aitNumber} (Placa ${savedFine.plate}) já consta no sistema! Duplicidade evitada.`,
        'warning',
        'Duplicidade de Multa Evitada'
      );
      return;
    }

    setFines((prev) => {
      const exists = prev.some((f) => f.id === savedFine.id);
      if (exists) {
        return prev.map((f) => (f.id === savedFine.id ? savedFine : f));
      }
      return [savedFine, ...prev];
    });
    if (cloudUser) {
      saveFineToCloud(savedFine).catch(() => {});
    }
    upsertSupabaseFine(savedFine, cloudUser?.uid || currentUser?.id || 'admin').catch(() => {});

    // Update driver points if assigned
    if (savedFine.driverId) {
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === savedFine.driverId) {
            const newPoints = d.currentPoints + savedFine.points;
            const updatedDrv: Driver = {
              ...d,
              currentPoints: newPoints,
              status: newPoints >= 40 ? 'SUSPENSA' : newPoints >= 20 ? 'ALERTA' : 'REGULAR',
            };
            if (cloudUser) saveDriverToCloud(updatedDrv).catch(() => {});
            upsertSupabaseDriver(updatedDrv).catch(() => {});
            return updatedDrv;
          }
          return d;
        })
      );
    }

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Multa Cadastrada com Sucesso',
      message: `Multa cadastrada com sucesso: AIT ${savedFine.aitNumber} (Placa ${savedFine.plate}). PDF disponível para visualização.`,
      type: savedFine.severity === 'GRAVISSIMA' ? 'FINE_OVERDUE' : 'FINE_NEW',
      severity: 'success',
      timestamp: 'Agora',
      read: false,
      relatedAit: savedFine.aitNumber,
      relatedPlate: savedFine.plate,
    };
    setNotifications((prev) => [notif, ...prev]);
    showToastBanner(
      `Multa cadastrada com sucesso! (Auto de Infração ${savedFine.aitNumber} • Placa ${savedFine.plate}) — PDF importado disponível para visualização.`,
      'success',
      'Multa cadastrada com sucesso!',
      savedFine
    );
  };

  const handleSaveBulkFines = (newBatch: TrafficFine[]) => {
    if (newBatch.length === 0) return;

    const existingAitSet = new Set(fines.map((f) => f.aitNumber.trim().toUpperCase()));
    const validNewFines = newBatch.filter(
      (nf) => !existingAitSet.has(nf.aitNumber.trim().toUpperCase())
    );
    const skippedCount = newBatch.length - validNewFines.length;

    if (validNewFines.length === 0) {
      showToastBanner(
        `Nenhuma multa nova importada: todos os ${newBatch.length} AITs do lote já estavam cadastrados no sistema.`,
        'warning',
        'Lote com AITs Duplicados'
      );
      return;
    }

    setFines((prev) => [...validNewFines, ...prev]);
    if (cloudUser) {
      validNewFines.forEach((nf) => {
        saveFineToCloud(nf).catch(() => {});
      });
    }
    validNewFines.forEach((nf) => {
      upsertSupabaseFine(nf, cloudUser?.uid || currentUser?.id || 'admin').catch(() => {});
    });

    // Update driver points for any assigned drivers in the batch
    const pointsByDriver: Record<string, number> = {};
    validNewFines.forEach((f) => {
      if (f.driverId && f.points > 0) {
        pointsByDriver[f.driverId] = (pointsByDriver[f.driverId] || 0) + f.points;
      }
    });

    if (Object.keys(pointsByDriver).length > 0) {
      setDrivers((prev) =>
        prev.map((d) => {
          const added = pointsByDriver[d.id];
          if (!added) return d;
          const newPoints = d.currentPoints + added;
          const updatedDrv: Driver = {
            ...d,
            currentPoints: newPoints,
            status: newPoints >= 40 ? 'SUSPENSA' : newPoints >= 20 ? 'ALERTA' : 'REGULAR',
          };
          if (cloudUser) saveDriverToCloud(updatedDrv).catch(() => {});
          upsertSupabaseDriver(updatedDrv).catch(() => {});
          return updatedDrv;
        })
      );
    }

    const notif: AppNotification = {
      id: `notif-bulk-${Date.now()}`,
      title: `Importação em Massa: ${validNewFines.length} Multa(s) Cadastrada(s)`,
      message: `${validNewFines.length} multa(s) importada(s) em massa com sucesso!${
        skippedCount > 0 ? ` (${skippedCount} duplicada(s) ignorada(s)).` : ''
      } Todos os PDFs estão disponíveis para visualização.`,
      type: 'FINE_NEW',
      severity: 'success',
      timestamp: 'Agora',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);

    showToastBanner(
      `${validNewFines.length} multa(s) importada(s) e cadastrada(s) com sucesso em massa!${
        skippedCount > 0 ? ` (${skippedCount} duplicada(s) evitada(s)).` : ''
      } Os PDFs importados estão disponíveis para visualização.`,
      'success',
      `${validNewFines.length} Multas Cadastradas com Sucesso!`,
      validNewFines[0]
    );
  };

  const handleDeleteFine = async (fineId: string) => {
    const target = fines.find((f) => f.id === fineId);
    setFines((prev) => prev.filter((f) => f.id !== fineId));
    if (cloudUser) {
      deleteFineFromCloud(fineId).catch(() => {});
    }
    const res = await deleteSupabaseFine(fineId, target?.aitNumber);
    if (res.success) {
      showToastBanner('Multa excluída com sucesso do sistema e do Supabase!', 'warning');
    } else {
      showToastBanner(`Aviso ao excluir multa no Supabase: ${res.error || 'Erro'}`, 'warning');
    }
  };

  const handlePayFine = (fineId: string) => {
    const target = fines.find((f) => f.id === fineId);
    if (!target) return;
    const updatedFine: TrafficFine = { ...target, status: 'PAGA' };

    setFines((prev) =>
      prev.map((f) => (f.id === fineId ? updatedFine : f))
    );

    if (cloudUser) {
      saveFineToCloud(updatedFine).catch(() => {});
    }
    upsertSupabaseFine(updatedFine).catch(() => {});
    showToastBanner(`Multa AIT ${updatedFine.aitNumber} marcada como Paga!`, 'success');
  };

  const handleAppealFine = (fineId: string) => {
    const target = fines.find((f) => f.id === fineId);
    if (!target) return;
    const updatedFine: TrafficFine = { ...target, status: 'EM_RECURSO' };

    setFines((prev) =>
      prev.map((f) => (f.id === fineId ? updatedFine : f))
    );

    if (cloudUser) {
      saveFineToCloud(updatedFine).catch(() => {});
    }
    upsertSupabaseFine(updatedFine).catch(() => {});
  };

  const handleToggleDoubledFine = (fineId: string) => {
    const targetFine = fines.find((f) => f.id === fineId);
    if (!targetFine) return;

    const isDbl = !(targetFine.isDoubledFine || (targetFine.multiplierFactor && targetFine.multiplierFactor > 1));
    const mult = isDbl ? 2 : 1;
    const basePts =
      targetFine.points > 0
        ? targetFine.points
        : targetFine.severity === 'GRAVISSIMA'
        ? 7
        : targetFine.severity === 'GRAVE'
        ? 5
        : targetFine.severity === 'MEDIA'
        ? 4
        : 3;
    const newPts = isDbl ? 0 : basePts;
    const ptsDelta = newPts - targetFine.points;

    const original =
      targetFine.originalAmount ||
      (targetFine.multiplierFactor && targetFine.multiplierFactor > 1
        ? targetFine.fineAmount / targetFine.multiplierFactor
        : targetFine.fineAmount);
    const newAmount = Number((original * mult).toFixed(2));
    const newDiscount = Number((newAmount * 0.8).toFixed(2));
    const updatedFineObj: TrafficFine = {
      ...targetFine,
      originalAmount: original,
      fineAmount: newAmount,
      discountAmount: newDiscount,
      multiplierFactor: mult,
      isDoubledFine: isDbl,
      isNicFine: isDbl,
      points: newPts,
    };

    if (selectedFineDetail && selectedFineDetail.id === fineId) {
      setSelectedFineDetail(updatedFineObj);
    }

    setFines((prev) => prev.map((f) => (f.id === fineId ? updatedFineObj : f)));

    if (cloudUser) {
      saveFineToCloud(updatedFineObj).catch(() => {});
    }
    upsertSupabaseFine(updatedFineObj).catch(() => {});

    if (targetFine.driverId && ptsDelta !== 0) {
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === targetFine.driverId) {
            const updatedPoints = Math.max(0, d.currentPoints + ptsDelta);
            const updatedDriver: Driver = {
              ...d,
              currentPoints: updatedPoints,
              status: updatedPoints >= 40 ? 'SUSPENSA' : updatedPoints >= 20 ? 'ALERTA' : 'REGULAR',
            };
            if (cloudUser) saveDriverToCloud(updatedDriver).catch(() => {});
            upsertSupabaseDriver(updatedDriver).catch(() => {});
            return updatedDriver;
          }
          return d;
        })
      );
    }

    showToastBanner(
      isDbl
        ? `Multa AIT ${targetFine.aitNumber} alterada para Dobrada (2x): 0 pontos na CNH do motorista!`
        : `Multa AIT ${targetFine.aitNumber} alterada para Valor Simples (1x): ${newPts} pontos na CNH.`,
      'success'
    );
  };

  // Term / Payroll Receipt Handlers (with strict deduplication by AIT and Fine ID)
  const handleSaveTerm = (newTerm: DriverReceiptTerm) => {
    const cleanAit = newTerm.aitNumber.trim().toUpperCase();
    const cleanedTerm: DriverReceiptTerm = {
      ...newTerm,
      companyName: cleanLegacyTransBrasilString(newTerm.companyName) || 'Setor de Gestão de Frota / RH',
      companyCnpj: cleanLegacyTransBrasilString(newTerm.companyCnpj),
    };

    const existingMatch = terms.find(
      (t) =>
        t.id === cleanedTerm.id ||
        (cleanedTerm.fineId && t.fineId === cleanedTerm.fineId) ||
        (cleanAit.length > 0 && t.aitNumber.trim().toUpperCase() === cleanAit)
    );

    setTerms((prev) => {
      const idx = prev.findIndex(
        (t) =>
          t.id === cleanedTerm.id ||
          (cleanedTerm.fineId && t.fineId === cleanedTerm.fineId) ||
          (cleanAit.length > 0 && t.aitNumber.trim().toUpperCase() === cleanAit)
      );
      if (idx !== -1) {
        const updatedList = [...prev];
        updatedList[idx] = {
          ...cleanedTerm,
          id: prev[idx].id,
          protocolNumber: prev[idx].protocolNumber,
        };
        return updatedList;
      }
      return [cleanedTerm, ...prev];
    });

    const matchedFine = fines.find(
      (f) =>
        (cleanedTerm.fineId && f.id === cleanedTerm.fineId) ||
        (cleanAit.length > 0 && f.aitNumber.trim().toUpperCase() === cleanAit)
    );

    if (matchedFine) {
      const isDbl = Boolean(cleanedTerm.isDoubledFine);
      const restoredPts = cleanedTerm.originalPoints ?? (matchedFine.points > 0 ? matchedFine.points : 4);
      const updatedFinePoints = isDbl ? 0 : restoredPts;
      const pointsDelta = updatedFinePoints - matchedFine.points;
      const baseSingleVal = isDbl
        ? Number((cleanedTerm.originalFineAmount / 2).toFixed(2))
        : cleanedTerm.originalFineAmount;

      const updatedMatchedFine: TrafficFine = {
        ...matchedFine,
        originalAmount: baseSingleVal,
        fineAmount: cleanedTerm.originalFineAmount,
        discountAmount: Number((cleanedTerm.originalFineAmount * 0.8).toFixed(2)),
        multiplierFactor: isDbl ? 2 : 1,
        isDoubledFine: isDbl,
        isNicFine: isDbl,
        points: updatedFinePoints,
        termSigned: cleanedTerm.status === 'ASSINADO',
        termSignedAt: cleanedTerm.signedAt,
        payrollInstallments: cleanedTerm.installments,
        payrollDeductedAmount: cleanedTerm.finalDeductedAmount,
      };

      setFines((prev) =>
        prev.map((f) => (f.id === matchedFine.id ? updatedMatchedFine : f))
      );

      if (cloudUser) {
        saveFineToCloud(updatedMatchedFine).catch(() => {});
      }
      upsertSupabaseFine(updatedMatchedFine).catch(() => {});

      if (matchedFine.driverId && pointsDelta !== 0) {
        setDrivers((prev) =>
          prev.map((d) => {
            if (d.id === matchedFine.driverId) {
              const nextPoints = Math.max(0, d.currentPoints + pointsDelta);
              const updatedDrv: Driver = {
                ...d,
                currentPoints: nextPoints,
                status: nextPoints >= 40 ? 'SUSPENSA' : nextPoints >= 20 ? 'ALERTA' : 'REGULAR',
              };
              if (cloudUser) saveDriverToCloud(updatedDrv).catch(() => {});
              upsertSupabaseDriver(updatedDrv).catch(() => {});
              return updatedDrv;
            }
            return d;
          })
        );
      }
    }

    if (existingMatch) {
      const updatedTermObj = { ...cleanedTerm, id: existingMatch.id, protocolNumber: existingMatch.protocolNumber };
      if (cloudUser) {
        saveTermToCloud(updatedTermObj).catch(() => {});
      }
      upsertSupabaseTerm(updatedTermObj, cloudUser?.uid || currentUser?.id || 'admin').catch(() => {});
      showToastBanner(
        `Termo/Recibo ${existingMatch.protocolNumber} (AIT ${cleanedTerm.aitNumber}) atualizado${
          cleanedTerm.isDoubledFine ? ' com Multa Dobrada (0 pts na CNH)' : ''
        } sem duplicar informação!`,
        'warning'
      );
    } else {
      if (cloudUser) {
        saveTermToCloud(cleanedTerm).catch(() => {});
      }
      upsertSupabaseTerm(cleanedTerm, cloudUser?.uid || currentUser?.id || 'admin').catch(() => {});
      showToastBanner(
        `Termo/Recibo ${cleanedTerm.protocolNumber} (AIT ${cleanedTerm.aitNumber}) emitido${
          cleanedTerm.isDoubledFine ? ' com Multa Dobrada (0 pts na CNH)' : ''
        } com sucesso!`,
        'success'
      );
    }
  };

  const handleSignTerm = (termId: string) => {
    const signedAt = new Date().toISOString();
    const targetTerm = terms.find((t) => t.id === termId);
    if (targetTerm) {
      const updatedTerm: DriverReceiptTerm = { ...targetTerm, status: 'ASSINADO', signedAt };
      if (cloudUser) saveTermToCloud(updatedTerm).catch(() => {});
      upsertSupabaseTerm(updatedTerm).catch(() => {});
    }
    setTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, status: 'ASSINADO', signedAt } : t))
    );
    showToastBanner('Termo de Ciência e Desconto em Folha assinado com sucesso!', 'success');
  };

  const handleDeleteTerm = async (termId: string) => {
    const target = terms.find((t) => t.id === termId);
    setTerms((prev) => prev.filter((t) => t.id !== termId));
    if (cloudUser) {
      deleteTermFromCloud(termId).catch(() => {});
    }
    const res = await deleteSupabaseTerm(termId, target?.protocolNumber, target?.aitNumber);
    if (res.success) {
      showToastBanner('Termo de Ciência excluído com sucesso do sistema e do Supabase!', 'warning');
    } else {
      showToastBanner(`Aviso ao excluir termo no Supabase: ${res.error || 'Erro'}`, 'warning');
    }
  };

  const handleOpenTermForFine = (fine: TrafficFine) => {
    setSelectedFineForTerm(fine);
    setActiveTab('receipts');
  };

  const handleConsultPlateInDetran = (plate: string) => {
    setDetranPlateQuery(plate);
    setActiveTab('detran');
  };

  // Operação C.A Handlers (Dedicated Operation Sheet & Duplicates Control)
  const handleSaveOperacaoCAItem = (item: OperacaoCAItem) => {
    setOperacaoCAItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = item;
        return copy;
      }
      return [item, ...prev];
    });
    showToastBanner(`Auto AIT ${item.ait} da Operação C.A salvo com sucesso!`, 'success');
  };

  const handleDeleteOperacaoCAItem = (id: string) => {
    setOperacaoCAItems((prev) => prev.filter((i) => i.id !== id));
    showToastBanner('Auto da Operação C.A removido com sucesso!', 'warning');
  };

  const handleBulkImportOperacaoCA = (
    newItems: OperacaoCAItem[],
    overwriteExisting?: OperacaoCAItem[]
  ) => {
    setOperacaoCAItems((prev) => {
      let updated = [...prev];
      if (overwriteExisting && overwriteExisting.length > 0) {
        const overwriteMap = new Map(overwriteExisting.map((it) => [it.id, it]));
        updated = updated.map((it) => (overwriteMap.has(it.id) ? overwriteMap.get(it.id)! : it));
      }
      return [...newItems, ...updated];
    });
  };

  const handleClearAllOperacaoCA = () => {
    setOperacaoCAItems([]);
    setOperacaoCATerms([]);
    localStorage.removeItem(`${DB_STORAGE_KEY}_operacao_ca`);
    localStorage.removeItem(`${DB_STORAGE_KEY}_operacao_ca_terms`);
    showToastBanner('Base de dados e termos da Operação C.A zerados com sucesso.', 'warning');
  };

  const handleSaveOperacaoCATerm = (term: OperacaoCATerm) => {
    setOperacaoCATerms((prev) => {
      const idx = prev.findIndex((t) => t.id === term.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = term;
        return copy;
      }
      return [term, ...prev];
    });
    showToastBanner(`Termo / Recibo ${term.protocolNumber} armazenado com sucesso!`, 'success');
  };

  const handleDeleteOperacaoCATerm = (termId: string) => {
    setOperacaoCATerms((prev) => prev.filter((t) => t.id !== termId));
    showToastBanner('Termo removido com sucesso.', 'warning');
  };

  // If user is not authenticated, show Login View
  if (!currentUser) {
    return (
      <LoginView
        users={users}
        companies={companies}
        onLogin={handleLogin}
      />
    );
  }

  const overdueCount = fines.filter((f) => f.status === 'VENCIDA').length;
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const isDatabaseEmpty = drivers.length === 0 && vehicles.length === 0 && fines.length === 0;

  return (
    <div className="light-app-shell min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        user={currentUser}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        onRequestLogout={() => setIsLogoutModalOpen(true)}
        onSyncDetran={handleSyncDetran}
        isSyncingDetran={isSyncingDetran}
        onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
        onResetDatabase={() => setIsResetDbModalOpen(true)}
        onOpenUsersPermissions={() => setActiveTab('users')}
      />

      {/* Main Layout Body with Responsive Left Sidebar */}
      <div className="flex-1 flex flex-row relative">
        {/* Left Sidebar (Desktop Sticky + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'notifications') {
              setIsNotificationsModalOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          currentUser={currentUser}
          overdueFinesCount={overdueCount}
          unreadNotifsCount={unreadNotifsCount}
          totalDriversCount={drivers.length}
          totalVehiclesCount={vehicles.length}
          totalFinesCount={fines.length}
          totalTermsCount={terms.length}
          totalUsersCount={users.length}
          totalCaCount={operacaoCAItems.length}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onResetDatabase={() => setIsResetDbModalOpen(true)}
          onLoadSampleData={handleLoadSampleData}
          onRequestLogout={() => setIsLogoutModalOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden space-y-5">
          {/* Global Notification Banner & Floating Toast Alert */}
          {systemBanner && (
            <>
              {/* Floating High-Visibility Toast at Top-Right */}
              <div
                className={`no-print fixed top-20 right-4 sm:right-6 z-[65] max-w-md w-full p-4 rounded-2xl border-2 shadow-2xl animate-fade-in bg-white ${
                  systemBanner.type === 'warning'
                    ? 'border-amber-400 text-slate-900 ring-2 ring-amber-400/20'
                    : 'border-emerald-500 text-slate-900 ring-2 ring-emerald-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        systemBanner.type === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {systemBanner.type === 'warning' ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight text-slate-900">
                        {systemBanner.title ||
                          (systemBanner.type === 'warning' ? 'Atenção' : 'Cadastro Realizado com Sucesso!')}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {systemBanner.text}
                      </p>
                      {systemBanner.relatedFine && (
                        <button
                          type="button"
                          onClick={() => setViewingImportedPdfFine(systemBanner.relatedFine!)}
                          className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visualizar PDF Importado</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSystemBanner(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline Banner in Main Area */}
              <div
                className={`no-print p-4 rounded-xl border-2 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-sm ${
                  systemBanner.type === 'warning'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-400 text-emerald-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {systemBanner.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    {systemBanner.title && (
                      <span className="font-black text-sm block">{systemBanner.title}</span>
                    )}
                    <span>{systemBanner.text}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {systemBanner.relatedFine && (
                    <button
                      type="button"
                      onClick={() => setViewingImportedPdfFine(systemBanner.relatedFine!)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar PDF Importado</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSystemBanner(null)}
                    className="text-xs underline ml-2 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </>
          )}



          {activeTab === 'scanner' && (
            <DocumentScannerView
              onRegisterDriverWithData={(scannedData) => {
                setEditingDriver(null);
                setScannedDriverData(scannedData);
                setIsDriverModalOpen(true);
              }}
              onRegisterVehicleWithData={(scannedData) => {
                setEditingVehicle(null);
                setScannedVehicleData(scannedData);
                setIsVehicleModalOpen(true);
              }}
            />
          )}

          {activeTab === 'operacao-ca' && (
            <OperacaoCAView
              items={operacaoCAItems}
              drivers={drivers}
              vehicles={vehicles}
              onSaveItem={handleSaveOperacaoCAItem}
              onDeleteItem={handleDeleteOperacaoCAItem}
              onBulkImport={handleBulkImportOperacaoCA}
              onClearAll={handleClearAllOperacaoCA}
              storedTerms={operacaoCATerms}
              onSaveTerm={handleSaveOperacaoCATerm}
              onDeleteTerm={handleDeleteOperacaoCATerm}
            />
          )}

          {activeTab === 'drivers' && (
            <DriversView
              drivers={drivers}
              fines={fines}
              vehicles={vehicles}
              currentUser={currentUser || undefined}
              onOpenNewDriverModal={() => {
                setEditingDriver(null);
                setScannedDriverData(null);
                setIsDriverModalOpen(true);
              }}
              onEditDriver={(driver) => {
                setEditingDriver(driver);
                setScannedDriverData(null);
                setIsDriverModalOpen(true);
              }}
              onDeleteDriver={handleDeleteDriver}
              onSelectFine={(fine) => setSelectedFineDetail(fine)}
              onViewFinePdf={(fine) => setViewingImportedPdfFine(fine)}
              onBulkImportDrivers={handleBulkImportDrivers}
            />
          )}

          {activeTab === 'vehicles' && (
            <VehiclesView
              vehicles={vehicles}
              fines={fines}
              drivers={drivers}
              onOpenNewVehicleModal={() => {
                setEditingVehicle(null);
                setScannedVehicleData(null);
                setIsVehicleModalOpen(true);
              }}
              onEditVehicle={(veh) => {
                setEditingVehicle(veh);
                setScannedVehicleData(null);
                setIsVehicleModalOpen(true);
              }}
              onDeleteVehicle={handleDeleteVehicle}
              onConsultPlateInDetran={handleConsultPlateInDetran}
              onSelectFine={(fine) => setSelectedFineDetail(fine)}
              onViewFinePdf={(fine) => setViewingImportedPdfFine(fine)}
            />
          )}

          {activeTab === 'fines' && (
            <FinesView
              fines={fines}
              vehicles={vehicles}
              drivers={drivers}
              onOpenNewFineModal={() => {
                setEditingFine(null);
                setIsFineModalOpen(true);
              }}
              onSelectFine={(fine) => setSelectedFineDetail(fine)}
              onViewFinePdf={(fine) => setViewingImportedPdfFine(fine)}
              onEditFine={(fine) => {
                setEditingFine(fine);
                setIsFineModalOpen(true);
              }}
              onDeleteFine={handleDeleteFine}
              onPayFine={handlePayFine}
              onGenerateTerm={handleOpenTermForFine}
              onOpenPrintModal={(payload) => setPrintModalPayload(payload)}
              onOpenSearchScreen={() => setActiveTab('fine-search')}
              onOpenReportScreen={() => setActiveTab('reports')}
            />
          )}

          {activeTab === 'fine-search' && (
            <FineSearchView
              fines={fines}
              vehicles={vehicles}
              drivers={drivers}
              onSelectFine={(fine) => setSelectedFineDetail(fine)}
              onViewFinePdf={(fine) => setViewingImportedPdfFine(fine)}
              onGenerateTerm={handleOpenTermForFine}
              onOpenPrintModal={(payload) => setPrintModalPayload(payload)}
              onOpenReportView={() => setActiveTab('reports')}
            />
          )}

          {activeTab === 'reports' && (
            <FinesReportView
              fines={fines}
              vehicles={vehicles}
              drivers={drivers}
              terms={terms}
              onSelectFine={(fine) => setSelectedFineDetail(fine)}
              onOpenPrintModal={(payload) => setPrintModalPayload(payload)}
            />
          )}

          {activeTab === 'receipts' && (
            <ReceiptTermView
              fines={fines}
              drivers={drivers}
              vehicles={vehicles}
              terms={terms}
              selectedFineForTerm={selectedFineForTerm}
              onSaveTerm={handleSaveTerm}
              onSignTerm={handleSignTerm}
              onDeleteTerm={handleDeleteTerm}
              onOpenPrintModal={(payload) => setPrintModalPayload(payload)}
              companyName={currentUser.companyName}
              companyCnpj={currentUser.companyCnpj}
            />
          )}

          {activeTab === 'detran' && (
            <DetranLookupView
              vehicles={vehicles}
              existingFines={fines}
              initialPlate={detranPlateQuery || vehicles[0]?.plate || 'BRA2E19'}
              onImportDetranFine={handleSaveFine}
              onSelectFine={(fine) => setSelectedFineDetail(fine)}
            />
          )}

          {activeTab === 'users' && (
            <UsersPermissionsView
              users={users}
              companies={companies}
              currentUser={currentUser}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              onToggleUserActive={handleToggleUserActive}
              onResetDatabase={() => setIsResetDbModalOpen(true)}
            />
          )}

          {activeTab === 'companies' && (
            <CompaniesManagementView
              companies={companies}
              onSaveCompany={handleSaveCompany}
              onDeleteCompany={handleDeleteCompany}
              users={users}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Modal Cadastro Simples de Motoristas (Importar via CNH + Alerta Duplicidade) */}
      <DriverCNHModal
        isOpen={isDriverModalOpen}
        onClose={() => {
          setIsDriverModalOpen(false);
          setEditingDriver(null);
          setScannedDriverData(null);
        }}
        onSaveDriver={(driver) => {
          handleSaveDriver(driver);
          setScannedDriverData(null);
        }}
        editingDriver={editingDriver}
        initialScannedData={scannedDriverData}
        vehicles={vehicles}
        existingDrivers={drivers}
        currentUser={currentUser || undefined}
      />

      {/* CNH Scanner Modal (Câmera Celular / PC / Foto / Arquivo) */}
      <CNHScannerModal
        isOpen={isCnhScannerOpen}
        onClose={() => setIsCnhScannerOpen(false)}
        onScanComplete={(data) => {
          setEditingDriver(null);
          setScannedDriverData(data);
          setIsCnhScannerOpen(false);
          setIsDriverModalOpen(true);
        }}
      />

      {/* 2. Modal Cadastro Veículos (Importar via CRLV + Alerta Duplicidade) */}
      <VehicleCRLVModal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setEditingVehicle(null);
          setScannedVehicleData(null);
        }}
        onSaveVehicle={(veh) => {
          handleSaveVehicle(veh);
          setScannedVehicleData(null);
        }}
        editingVehicle={editingVehicle}
        initialScannedData={scannedVehicleData}
        drivers={drivers}
        existingVehicles={vehicles}
      />

      {/* 2.1 Modal Scanner de CRLV por Câmera ao Vivo (Celular / Webcam) ou Arquivo */}
      <CRLVScannerModal
        isOpen={isCrlvScannerOpen}
        onClose={() => setIsCrlvScannerOpen(false)}
        onScanComplete={(scannedData) => {
          setScannedVehicleData(scannedData);
          setIsCrlvScannerOpen(false);
          setIsVehicleModalOpen(true);
        }}
      />

      {/* 3. Modal Cadastro Simples de Multas (Alerta Duplicidade AIT) */}
      <FinePDFModal
        isOpen={isFineModalOpen}
        onClose={() => {
          setIsFineModalOpen(false);
          setEditingFine(null);
        }}
        onSaveFine={handleSaveFine}
        onSaveBulkFines={handleSaveBulkFines}
        editingFine={editingFine}
        vehicles={vehicles}
        drivers={drivers}
        existingFines={fines}
        initialTab={fineModalInitialTab}
      />

      {/* 4. Modal Detalhes do Auto de Infração */}
      <FineDetailModal
        fine={selectedFineDetail}
        onClose={() => setSelectedFineDetail(null)}
        onPayFine={handlePayFine}
        onAppealFine={handleAppealFine}
        onToggleDoubledFine={handleToggleDoubledFine}
        onGenerateTerm={handleOpenTermForFine}
        onOpenPrintModal={(payload) => setPrintModalPayload(payload)}
        onViewFinePdf={(fine) => {
          setSelectedFineDetail(null);
          setViewingImportedPdfFine(fine);
        }}
      />

      {/* 4a. Modal de Visualização do PDF Importado da Infração */}
      <ImportedFinePdfModal
        fine={viewingImportedPdfFine}
        onClose={() => setViewingImportedPdfFine(null)}
      />

      {/* 4b. Modal de Visualização de Impressão A4 e Exportação em PDF */}
      <PrintPreviewModal
        payload={printModalPayload}
        onClose={() => setPrintModalPayload(null)}
      />

      {/* 5. Modal Central de Notificações em Tempo Real */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onClearAll={() => setNotifications([])}
        onSelectAitNotification={(ait) => {
          const matched = fines.find((f) => f.aitNumber === ait);
          if (matched) {
            setSelectedFineDetail(matched);
          }
        }}
      />

      {/* 6. Modal Confirmação de Saída do Sistema */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        onConfirmLogout={handleConfirmLogout}
        userName={currentUser.name}
        userEmail={currentUser.email}
        userRoleLabel={getRoleLabel(currentUser.role, currentUser.customRoleName)}
      />

      {/* 7. Modal Confirmação Zerar Banco de Dados */}
      {isResetDbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <RotateCcw className={`w-5 h-5 ${isResettingDatabase ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Zerar Banco de Dados?</h3>
                <p className="text-xs text-slate-600">
                  Esta ação limpará todos os motoristas, veículos, multas e termos cadastrados localmente e no Supabase.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              Registros atuais: <strong>{drivers.length}</strong> motoristas, <strong>{vehicles.length}</strong> veículos,{' '}
              <strong>{fines.length}</strong> multas e <strong>{terms.length}</strong> termos emitidos.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isResettingDatabase}
                onClick={() => setIsResetDbModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResettingDatabase}
                onClick={handleConfirmResetDatabase}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {isResettingDatabase && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isResettingDatabase ? 'Limpando no Supabase...' : 'Confirmar e Zerar Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
