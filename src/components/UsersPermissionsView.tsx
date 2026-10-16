import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  KeyRound,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Lock,
  UserCheck,
  Building2,
  Mail,
  BadgeCheck,
  Sliders,
  AlertTriangle,
  PlusCircle,
  RotateCcw,
  Briefcase,
} from 'lucide-react';
import { SystemUser, UserPermissions, UserRole, UserSession, Company } from '../types';
import { getDefaultPermissionsForRole, getRoleLabel, INITIAL_COMPANIES } from '../data/mockData';

interface UsersPermissionsViewProps {
  users: SystemUser[];
  currentUser: UserSession;
  companies?: Company[];
  onSaveUser: (user: SystemUser, isNew: boolean) => void;
  onDeleteUser: (userId: string) => void;
  onToggleUserActive: (userId: string) => void;
  onResetDatabase?: () => void;
}

export const PERMISSION_ITEMS: {
  key: keyof UserPermissions;
  shortLabel: string;
  label: string;
  description: string;
  category: string;
}[] = [
  {
    key: 'viewDashboard',
    shortLabel: 'Dashboard',
    label: 'Visualizar Dashboard & Métricas',
    description: 'Acesso aos indicadores gerais, gráficos e alertas de vencimento.',
    category: 'Geral',
  },
  {
    key: 'manageDrivers',
    shortLabel: 'Motoristas (CNH)',
    label: 'Cadastrar e Editar Motoristas (CNH)',
    description: 'Permite incluir, editar prontuário e excluir motoristas.',
    category: 'Cadastros',
  },
  {
    key: 'manageVehicles',
    shortLabel: 'Veículos (CRLV)',
    label: 'Cadastrar e Editar Veículos (CRLV)',
    description: 'Permite incluir, importar CRLV, editar frota e excluir veículos.',
    category: 'Cadastros',
  },
  {
    key: 'manageFines',
    shortLabel: 'Multas (AIT)',
    label: 'Cadastrar, Editar e Baixar Multas (AIT)',
    description: 'Permite registrar multas (AIT), dar baixa de pagamento e recursos.',
    category: 'Infrações',
  },
  {
    key: 'searchFines',
    shortLabel: 'Pesquisa & Detran',
    label: 'Pesquisa Avançada & Consulta Detran',
    description: 'Acesso à tela exclusiva de pesquisa de multas e consulta SENATRAN/DETRAN.',
    category: 'Infrações',
  },
  {
    key: 'generateReports',
    shortLabel: 'Relatórios PDF/CSV',
    label: 'Gerar e Imprimir Relatórios (PDF / CSV)',
    description: 'Permite emitir relatórios gerenciais de multas, exportar e imprimir A4.',
    category: 'Relatórios',
  },
  {
    key: 'manageTerms',
    shortLabel: 'Termos de Folha',
    label: 'Emitir e Assinar Termos de Folha',
    description: 'Permite gerar recibos/termos de desconto em folha e registrar assinatura.',
    category: 'RH / Folha',
  },
  {
    key: 'applyDoubledFine',
    shortLabel: 'Multa Dobrada (2x)',
    label: 'Aplicar Multa Dobrada (2x Sem Pontos CNH)',
    description: 'Autoriza dobrar o valor da multa nas condições de desconto para zerar pontos.',
    category: 'RH / Folha',
  },
  {
    key: 'accessOperacaoCA',
    shortLabel: 'Operação C.A',
    label: 'Liberar Acesso à Operação C.A (Planilha Dedicada & Termos)',
    description: 'Autoriza este login a acessar a planilha operacional C.A, controle de pagamentos e termos.',
    category: 'Operação C.A',
  },
  {
    key: 'manageUsers',
    shortLabel: 'Gerenciar Usuários',
    label: 'Gerenciar Usuários, Senhas e Perfis (Admin)',
    description: 'Acesso de Administrador para criar usuários, senhas, perfis e permissões.',
    category: 'Administração',
  },
  {
    key: 'resetDatabase',
    shortLabel: 'Zerar Banco',
    label: 'Zerar / Restaurar Banco de Dados',
    description: 'Permissão crítica para limpar todos os registros do banco de dados.',
    category: 'Administração',
  },
];

export const UsersPermissionsView: React.FC<UsersPermissionsViewProps> = ({
  users,
  currentUser,
  companies = INITIAL_COMPANIES,
  onSaveUser,
  onDeleteUser,
  onToggleUserActive,
  onResetDatabase,
}) => {
  const isAdmin =
    currentUser.role === 'ADMIN' || Boolean(currentUser.permissions?.manageUsers);
  const canResetDb =
    currentUser.role === 'ADMIN' && currentUser.permissions?.resetDatabase !== false;

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState('');
  const [unlockResetDb, setUnlockResetDb] = useState(false);

  // Form fields controlled by Administrator
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(true);
  const [companyId, setCompanyId] = useState<string>(companies[0]?.id || 'comp-matriz');
  const [role, setRole] = useState<UserRole>('GESTOR_FROTA');
  const [customRoleName, setCustomRoleName] = useState('Gestor de Frota');
  const [department, setDepartment] = useState('Gestão de Frota');
  const [active, setActive] = useState(true);
  const [permissions, setPermissions] = useState<UserPermissions>(
    getDefaultPermissionsForRole('GESTOR_FROTA')
  );

  // Restrict completely if a non-admin somehow reaches this component
  if (!isAdmin) {
    return (
      <div className="bg-white border-2 border-red-200 rounded-2xl p-8 text-center max-w-xl mx-auto my-8 shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-900">
          Acesso Restrito ao Administrador
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          As informações de usuários, senhas, perfis e permissões são exibidas exclusivamente no acesso do Administrador do sistema.
        </p>
      </div>
    );
  }

  const openNewUserForm = () => {
    setEditingUser(null);
    setFormError('');
    setName('');
    setUsername('');
    setEmail('');
    setCpf('');
    setPassword('');
    setConfirmPassword('');
    setShowFormPassword(true);
    setCompanyId(companies[0]?.id || 'comp-matriz');
    setRole('GESTOR_FROTA');
    setCustomRoleName('Gestor de Frota');
    setDepartment('Gestão de Frota');
    setActive(true);
    setPermissions(getDefaultPermissionsForRole('GESTOR_FROTA'));
    setIsFormOpen(true);
  };

  const openEditUserForm = (u: SystemUser) => {
    setEditingUser(u);
    setFormError('');
    setName(u.name);
    setUsername(u.username);
    setEmail(u.email);
    setCpf(u.cpf || '');
    setPassword(u.password);
    setConfirmPassword(u.password);
    setShowFormPassword(true);
    const matchedComp = companies.find(
      (c) => c.id === u.companyId || (u.companyName && c.name.toLowerCase() === u.companyName.toLowerCase())
    );
    setCompanyId(matchedComp?.id || companies[0]?.id || 'comp-matriz');
    setRole(u.role);
    setCustomRoleName(u.customRoleName || getRoleLabel(u.role));
    setDepartment(u.department || 'Geral');
    setActive(u.active);
    setPermissions({ ...u.permissions });
    setIsFormOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setCustomRoleName(getRoleLabel(newRole));
    setPermissions(getDefaultPermissionsForRole(newRole));
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSetAllPermissions = (enabled: boolean) => {
    setPermissions({
      viewDashboard: enabled,
      manageDrivers: enabled,
      manageVehicles: enabled,
      manageFines: enabled,
      searchFines: enabled,
      generateReports: enabled,
      manageTerms: enabled,
      applyDoubledFine: enabled,
      accessOperacaoCA: enabled,
      manageCompanies: enabled,
      manageUsers: enabled,
      resetDatabase: enabled,
    });
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = (email.trim() || `${cleanUsername}@sistema.local`).toLowerCase();

    if (!cleanName || !cleanUsername) {
      setFormError('Informe o Nome do Usuário e o Login de Acesso.');
      return;
    }

    if (!password || password.length < 3) {
      setFormError('Defina uma senha com pelo menos 3 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    const duplicate = users.find(
      (u) =>
        u.id !== editingUser?.id &&
        (u.username.trim().toLowerCase() === cleanUsername ||
          (email.trim() && u.email.trim().toLowerCase() === cleanEmail))
    );

    if (duplicate) {
      setFormError(
        `Já existe um usuário cadastrado com o login "${cleanUsername}". Escolha outro login.`
      );
      return;
    }

    const selectedComp = companies.find((c) => c.id === companyId) || companies[0];

    const savedUser: SystemUser = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      cpf: cpf.trim() || undefined,
      password,
      role,
      customRoleName: customRoleName.trim() || getRoleLabel(role),
      department: department.trim() || 'Geral',
      companyId: selectedComp?.id,
      companyName: selectedComp?.name || 'Matriz Gestão Geral',
      companyCnpj: selectedComp?.cnpj || '00.000.000/0001-00',
      active,
      permissions,
      avatarUrl:
        editingUser?.avatarUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString().split('T')[0],
    };

    onSaveUser(savedUser, !editingUser);
    if (!editingUser) {
      // Clear form after creating a new user so Admin can keep creating more if needed
      setName('');
      setUsername('');
      setEmail('');
      setCpf('');
      setPassword('');
      setConfirmPassword('');
    } else {
      setEditingUser(null);
    }
  };

  const toggleRowPassword = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.customRoleName && u.customRoleName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const countPermissions = (perms: UserPermissions) =>
    Object.values(perms).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Administrator Exclusive Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Área Exclusiva do Administrador</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cadastro de Usuários, Senhas, Perfis e Permissões
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Painel restrito ao Administrador para criar usuários, definir senhas de acesso, configurar perfis e visualizar as permissões de cada conta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-new-system-user"
              type="button"
              onClick={openNewUserForm}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Novo Usuário</span>
            </button>
          </div>
        </div>
      </div>

      {/* Registration / Edit Form Panel (Admin Creates Users, Passwords & Profiles) */}
      {isFormOpen && (
        <div className="bg-white border-2 border-blue-300 rounded-2xl p-5 sm:p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                {editingUser ? <Sliders className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {editingUser
                    ? `Editar Usuário, Senha e Perfil: ${editingUser.name}`
                    : 'Criar Novo Usuário, Senha e Perfil de Acesso'}
                </h2>
                <p className="text-xs text-slate-500">
                  Preencha os dados abaixo para cadastrar o usuário, definir sua senha de entrada e escolher seu perfil e permissões.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingUser(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
            >
              Ocultar Formulário
            </button>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitForm} className="space-y-6">
            {/* Step 1: User, Login, Password & Profile */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo do Usuário *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Carlos da Silva"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Usuário (Login para Entrar no Sistema) *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: joao.silva"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail do Usuário
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: joao@empresa.com.br"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              {/* Password Fields */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Senha de Acesso *
                </label>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Defina a senha de entrada"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-800"
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type={showFormPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha definida"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modelo de Perfil Base *
                </label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 bg-blue-50/50 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="ADMIN">Administrador (Acesso Total)</option>
                  <option value="GESTOR_FROTA">Gestor de Frota</option>
                  <option value="GESTOR_RH">Gestor de RH / Folha</option>
                  <option value="OPERADOR">Operador de Multas</option>
                  <option value="AUDITOR">Auditor / Somente Consulta</option>
                  <option value="MOTORISTA">Motorista</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Perfil / Cargo (Personalizável) *
                </label>
                <input
                  type="text"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  placeholder="Ex: Analista de Frota Sênior, Financeiro, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Empresa Vinculada (ERP) *</span>
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  required
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.badge || '🏢'} {c.name} — CNPJ: {c.cnpj}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Esta empresa será a unidade de acesso do usuário no login e nos módulos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Setor / Departamento
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ex: Logística, RH, Tráfego"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status do Usuário
                </label>
                <select
                  value={active ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setActive(e.target.value === 'ACTIVE')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="ACTIVE">Ativo — Liberado para Login</option>
                  <option value="INACTIVE">Bloqueado — Impedir Login</option>
                </select>
              </div>
            </div>

            {/* Step 2: Granular Permissions Matrix */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>
                      Permissões do Perfil "{customRoleName || getRoleLabel(role)}" ({countPermissions(permissions)}/10 marcadas)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Marque ou desmarque as permissões específicas que este usuário terá ao entrar no sistema.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetAllPermissions(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold transition-colors"
                  >
                    Liberar Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissions(getDefaultPermissionsForRole(role))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
                  >
                    Padrão do Perfil
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllPermissions(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-slate-300 text-xs font-semibold transition-colors"
                  >
                    Desmarcar Todas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PERMISSION_ITEMS.map((item) => {
                  const isChecked = Boolean(permissions[item.key]);
                  return (
                    <label
                      key={item.key}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-white border-blue-400 shadow-2xs'
                          : 'bg-slate-100/70 border-slate-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(item.key)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">{item.label}</span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {editingUser && (
                <button
                  type="button"
                  onClick={openNewUserForm}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
                >
                  Cancelar Edição
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {editingUser
                    ? 'Salvar Alterações do Usuário e Permissões'
                    : 'Salvar Novo Usuário, Senha e Perfil'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter Bar for Registered Users */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar usuário cadastrado por nome, login, perfil ou setor..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">Todos os Usuários ({users.length})</option>
            <option value="ADMIN">Administrador</option>
            <option value="GESTOR_FROTA">Gestor de Frota</option>
            <option value="GESTOR_RH">Gestor de RH / Folha</option>
            <option value="OPERADOR">Operador de Multas</option>
            <option value="AUDITOR">Auditor / Consulta</option>
            <option value="MOTORISTA">Motorista</option>
          </select>
        </div>
      </div>

      {/* Users & Permissions Detailed List (Visible Only to Administrator) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
              Usuários Cadastrados e Suas Permissões ({filteredUsers.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Visível somente no perfil Administrador
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                <th className="py-3.5 px-4">Usuário / Setor</th>
                <th className="py-3.5 px-4">Login & Senha</th>
                <th className="py-3.5 px-4">Perfil</th>
                <th className="py-3.5 px-4">Permissões Atribuídas pelo Administrador</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredUsers.map((u) => {
                const isCurrentLoggedUser =
                  currentUser.id === u.id ||
                  currentUser.username?.toLowerCase() === u.username.toLowerCase();
                const isPwdShown = Boolean(visiblePasswords[u.id]);
                const enabledPerms = PERMISSION_ITEMS.filter((item) => u.permissions[item.key]);
                const disabledPerms = PERMISSION_ITEMS.filter((item) => !u.permissions[item.key]);

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors align-top ${
                      isCurrentLoggedUser ? 'bg-blue-50/30' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{u.name}</span>
                            {isCurrentLoggedUser && (
                              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                VOCÊ (ADMIN)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                            <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{u.companyName || 'Matriz Gestão Geral'}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">{u.department || 'Geral'}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{u.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <p className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                          <span>Login: {u.username}</span>
                        </p>
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono">
                          <span className="text-[11px] text-slate-500">Senha:</span>
                          <span className="text-slate-900 font-bold">
                            {isPwdShown ? u.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRowPassword(u.id)}
                            className="text-slate-500 hover:text-slate-800"
                            title={isPwdShown ? 'Ocultar senha' : 'Ver senha cadastrada'}
                          >
                            {isPwdShown ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{getRoleLabel(u.role, u.customRoleName)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          <strong>{enabledPerms.length}</strong> de {PERMISSION_ITEMS.length} permissões
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-4 max-w-md">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {enabledPerms.map((perm) => (
                            <span
                              key={perm.key}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              {perm.shortLabel}
                            </span>
                          ))}
                        </div>
                        {disabledPerms.length > 0 && (
                          <p className="text-[10px] text-slate-400">
                            Restrito: {disabledPerms.map((p) => p.shortLabel).join(', ')}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => onToggleUserActive(u.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        }`}
                        title="Clique para ativar ou bloquear este usuário"
                      >
                        {u.active ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ativo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Bloqueado</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditUserForm(u)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1 transition-colors"
                          title="Editar dados, senha, perfil e permissões"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        {!isCurrentLoggedUser && (
                          <button
                            type="button"
                            onClick={() => onDeleteUser(u.id)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Protected Database Reset Section (Exclusively inside Permissions Screen) */}
      {canResetDb && onResetDatabase && (
        <div className="bg-red-50/50 border-2 border-red-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
                  Permissão Crítica de Segurança
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Zerar Banco de Dados do Sistema
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Esta opção fica protegida exclusivamente dentro da tela de <strong>Usuários & Permissões</strong> do Administrador para evitar que qualquer usuário apague por engano os cadastros de motoristas, veículos, multas e termos.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-red-200 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unlockResetDb}
                  onChange={(e) => setUnlockResetDb(e.target.checked)}
                  className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <span>Liberar botão de zerar banco</span>
              </label>

              <button
                type="button"
                disabled={!unlockResetDb}
                onClick={() => {
                  setUnlockResetDb(false);
                  onResetDatabase();
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Zerar Banco de Dados</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
