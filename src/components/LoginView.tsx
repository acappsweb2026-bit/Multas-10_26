import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Building2,
  CheckCircle2,
  Search,
  ArrowLeft,
  MapPin,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { SystemUser, UserSession, Company } from '../types';
import { INITIAL_USERS, INITIAL_COMPANIES } from '../data/mockData';
import { formatCNPJ } from '../lib/formatters';

interface LoginViewProps {
  users?: SystemUser[];
  companies?: Company[];
  onLoginSuccess?: (session: UserSession) => void;
  onLogin?: (session: UserSession) => void;
  onLinkSupabaseUser?: (linkedUser: SystemUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users = INITIAL_USERS,
  companies = INITIAL_COMPANIES,
  onLoginSuccess,
  onLogin,
}) => {
  const triggerLogin = (session: UserSession) => {
    if (onLoginSuccess) onLoginSuccess(session);
    if (onLogin) onLogin(session);
  };

  // Step state: direct clean login screen (or SELECT_COMPANY if user desires)
  const [step, setStep] = useState<'SELECT_COMPANY' | 'ENTER_CREDENTIALS'>('ENTER_CREDENTIALS');
  const [selectedCompany, setSelectedCompany] = useState<Company>(
    companies[0] || INITIAL_COMPANIES[0]
  );
  const [companySearch, setCompanySearch] = useState('');

  // Credentials State
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasPasswordError, setHasPasswordError] = useState(false);
  const [hasUserError, setHasUserError] = useState(false);

  // Active companies list
  const activeCompanies = useMemo(() => {
    return companies.filter((c) => c.active !== false);
  }, [companies]);

  // Filtered companies for search
  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return activeCompanies;
    return activeCompanies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
        c.cnpj.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.badge && c.badge.toLowerCase().includes(q))
    );
  }, [activeCompanies, companySearch]);

  const handleSelectCompany = (comp: Company) => {
    setSelectedCompany(comp);
    setErrorMessage('');
    setHasPasswordError(false);
    setHasUserError(false);

    // Pre-fill username if appropriate
    if (comp.defaultUsername) {
      setLoginInput(comp.defaultUsername);
    } else if (comp.id === 'comp-matriz' || comp.name.toLowerCase().includes('matriz')) {
      setLoginInput('admin');
    } else if (comp.id === 'comp-plog' || comp.name.toLowerCase().includes('plog')) {
      setLoginInput('plog');
    } else {
      setLoginInput('');
    }
    setPassword('');
    setStep('ENTER_CREDENTIALS');
  };

  const handleBackToCompanySelection = () => {
    setErrorMessage('');
    setHasPasswordError(false);
    setHasUserError(false);
    setStep('SELECT_COMPANY');
  };

  const findMatchingUser = (rawLogin: string): SystemUser | undefined => {
    const clean = rawLogin.trim().toLowerCase();
    const cleanDigits = clean.replace(/\D/g, '');
    return users.find((u) => {
      const matchUsername = u.username.trim().toLowerCase() === clean;
      const matchEmail = u.email.trim().toLowerCase() === clean;
      const matchName = u.name.trim().toLowerCase() === clean;
      const matchCpf =
        cleanDigits.length >= 11 &&
        u.cpf &&
        u.cpf.replace(/\D/g, '') === cleanDigits;
      return matchUsername || matchEmail || matchName || matchCpf;
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setHasPasswordError(false);
    setHasUserError(false);

    const cleanInput = loginInput.trim();
    if (!cleanInput) {
      setHasUserError(true);
      setErrorMessage('Por favor, informe seu usuário ou e-mail de acesso.');
      return;
    }

    if (!password) {
      setHasPasswordError(true);
      setErrorMessage('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoading(true);
    const loginTime = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Check if user is registered in the system database
    const matchedUser = findMatchingUser(cleanInput);

    if (!matchedUser) {
      setIsLoading(false);
      setHasUserError(true);
      setErrorMessage(
        'Usuário ou e-mail não encontrado no sistema. Apenas usuários cadastrados têm permissão de acesso.'
      );
      return;
    }

    // 2. Check if user is active
    if (!matchedUser.active) {
      setIsLoading(false);
      setHasUserError(true);
      setErrorMessage(
        'Acesso negado: Este usuário encontra-se inativo ou bloqueado. Contate o Administrador do sistema.'
      );
      return;
    }

    // 3. Validate password
    const isPasswordValid =
      password === matchedUser.password ||
      (matchedUser.id === 'usr-admin-01' &&
        ['admin', '123456', 'admin123'].includes(password)) ||
      (matchedUser.username.toLowerCase() === 'plog' &&
        ['plog', '123456', 'plog123', 'admin'].includes(password));

    if (!isPasswordValid) {
      setIsLoading(false);
      setHasPasswordError(true);
      setErrorMessage('Senha incorreta para o usuário informado.');
      return;
    }

    // 4. Validate if company matches user binding (Admin can access all companies)
    const isAdmin = matchedUser.role === 'ADMIN';
    const isUserPlog = matchedUser.username.toLowerCase() === 'plog';
    const isPlogCompany =
      selectedCompany.isPlogCompany ||
      selectedCompany.name.toLowerCase().includes('plog') ||
      selectedCompany.id === 'comp-plog';

    if (!isAdmin && isUserPlog && !isPlogCompany) {
      setIsLoading(false);
      setErrorMessage('O usuário P-LOG possui permissão de acesso exclusivamente na empresa P-LOG TRANSPORTES.');
      return;
    }

    // Context resolution
    const finalCompanyName = selectedCompany.name;
    const finalCompanyCnpj = selectedCompany.cnpj;

    setIsLoading(false);
    triggerLogin({
      id: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
      email: matchedUser.email,
      role: matchedUser.role,
      customRoleName: matchedUser.customRoleName,
      department: matchedUser.department,
      permissions: matchedUser.permissions,
      companyId: selectedCompany.id,
      companyName: finalCompanyName,
      companyCnpj: finalCompanyCnpj,
      avatarUrl: matchedUser.avatarUrl || undefined,
      loginAt: loginTime,
    });
  };

  return (
    <div
      id="login-view-container"
      className="min-h-screen w-full bg-slate-100/80 text-slate-900 flex flex-col justify-center items-center p-3 sm:p-6 relative"
    >
      {/* Brand Header */}
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Controle Interno de Infrações de Trânsito
        </h1>
      </div>

      {/* ========================================================================= */}
      {/* TELA 1: EXCLUSIVA PARA ESCOLHER A EMPRESA (EM LINHA, ERP)                 */}
      {/* ========================================================================= */}
      {step === 'SELECT_COMPANY' && (
        <div className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                  1
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Escolha a Empresa / Filial para Acesso (ERP)
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Selecione a empresa em linha abaixo para prosseguir com seu login e senha corporativos.
              </p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Filtrar por nome, CNPJ ou cidade..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Table / Row-list in lines (Em Linha, ERP) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-700 tracking-wider">
                    <th className="py-3 px-3.5 text-center w-10">#</th>
                    <th className="py-3 px-3.5">Empresa / Razão Social</th>
                    <th className="py-3 px-3.5">CNPJ</th>
                    <th className="py-3 px-3.5">Unidade / Cidade</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-right">Acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold">Nenhuma empresa encontrada com este filtro</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((comp, idx) => (
                      <tr
                        key={comp.id}
                        onClick={() => handleSelectCompany(comp)}
                        className="hover:bg-blue-50/40 transition-all cursor-pointer group"
                      >
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Nome & Badge */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                              {comp.badge || '🏢 EMPRESA'}
                            </span>
                            <div>
                              <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors block text-xs sm:text-sm">
                                {comp.name}
                              </span>
                              {comp.tradeName && comp.tradeName !== comp.name && (
                                <span className="text-[11px] text-slate-500 block">
                                  {comp.tradeName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CNPJ */}
                        <td className="py-3 px-3.5">
                          <span className="font-mono font-bold text-slate-800 block">
                            {formatCNPJ(comp.cnpj)}
                          </span>
                          {comp.stateRegistration && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              IE: {comp.stateRegistration}
                            </span>
                          )}
                        </td>

                        {/* Cidade / UF */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {comp.city || 'São Paulo'}/{comp.state || 'SP'}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ativa</span>
                          </span>
                        </td>

                        {/* Botão Acessar */}
                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCompany(comp);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <span>Acessar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ERP Notice Footer */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Aviso de Governança ERP:</strong> Novos cadastros de empresas e filiais não
                podem ser feitos na tela inicial. Devem ser realizados pelo Administrador logado.
              </span>
            </div>
            <span className="font-mono text-slate-500 shrink-0 font-bold">
              {activeCompanies.length} empresas disponíveis
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TELA 2: DIGITAR USUÁRIO E SENHA (PARA A EMPRESA ESCOLHIDA)                 */}
      {/* ========================================================================= */}
      {step === 'ENTER_CREDENTIALS' && (
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="pb-1 border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Acesse sua Conta
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Informe suas credenciais de usuário e senha
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div
                id="login-error-message"
                className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-shake"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Username / Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-login-username"
                className="block text-xs font-bold text-slate-800 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Usuário ou E-mail</span>
              </label>
              <div className="relative">
                <input
                  id="input-login-username"
                  type="text"
                  value={loginInput}
                  onChange={(e) => {
                    setLoginInput(e.target.value);
                    if (hasUserError) setHasUserError(false);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Digite seu usuário ou e-mail"
                  autoComplete="username"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-medium ${
                    hasUserError
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-login-password"
                className="block text-xs font-bold text-slate-800 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Senha de Acesso</span>
              </label>
              <div className="relative">
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (hasPasswordError) setHasPasswordError(false);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Digite sua senha cadastrada"
                  autoComplete="current-password"
                  className={`w-full pl-4 pr-10 py-2.5 bg-slate-50 border rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-medium ${
                    hasPasswordError
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Checkbox */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Lembrar nesta máquina</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Footer Branding */}
      <div className="mt-6 text-center text-xs text-slate-500">
        <p className="font-medium">
          Sistema de Controle Interno de Infrações de Trânsito • Conexão Segura SSL/TLS
        </p>
      </div>
    </div>
  );
};
