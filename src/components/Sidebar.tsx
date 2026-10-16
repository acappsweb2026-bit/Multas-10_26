import React, { useState, useEffect } from 'react';
import {
  Users,
  Truck,
  FileWarning,
  Search,
  Bell,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  FileSignature,
  FileBarChart,
  SlidersHorizontal,
  ShieldCheck,
  LogOut,
  UserCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FolderTree,
  FolderOpen,
  ScanLine,
  Briefcase,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { UserSession } from '../types';
import { getRoleLabel } from '../data/mockData';

export type ActiveTab =
  | 'dashboard'
  | 'scanner'
  | 'operacao-ca'
  | 'drivers'
  | 'vehicles'
  | 'fines'
  | 'fine-search'
  | 'reports'
  | 'receipts'
  | 'detran'
  | 'users'
  | 'companies'
  | 'notifications';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser?: UserSession;
  overdueFinesCount: number;
  unreadNotifsCount: number;
  totalDriversCount?: number;
  totalVehiclesCount?: number;
  totalFinesCount?: number;
  totalTermsCount?: number;
  totalUsersCount?: number;
  totalCaCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onResetDatabase?: () => void;
  onLoadSampleData?: () => void;
  onRequestLogout?: () => void;
  onSyncDetran?: () => void;
  isSyncingDetran?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  overdueFinesCount,
  unreadNotifsCount,
  totalDriversCount = 0,
  totalVehiclesCount = 0,
  totalFinesCount = 0,
  totalTermsCount = 0,
  totalUsersCount = 0,
  totalCaCount = 0,
  isMobileOpen = false,
  onCloseMobile,
  onResetDatabase,
  onLoadSampleData,
  onRequestLogout,
  onSyncDetran,
  isSyncingDetran = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // CRM Submenu Accordion states
  const [openCadastros, setOpenCadastros] = useState<boolean>(true);
  const [openPesquisar, setOpenPesquisar] = useState<boolean>(true);
  const [openRelatorios, setOpenRelatorios] = useState<boolean>(true);
  const [openConfiguracoes, setOpenConfiguracoes] = useState<boolean>(true);
  const [openPlogConfiguracoes, setOpenPlogConfiguracoes] = useState<boolean>(true);

  const isCadastrosActive = ['drivers', 'vehicles', 'fines'].includes(activeTab);
  const isPesquisarActive = ['fine-search', 'detran'].includes(activeTab);
  const isRelatoriosActive = ['reports', 'receipts'].includes(activeTab);
  const isConfiguracoesActive = ['users', 'companies', 'notifications'].includes(activeTab);
  const isPlogConfigActive = ['detran', 'notifications'].includes(activeTab);

  // Auto-expand the active section if user navigated to it
  useEffect(() => {
    if (isCadastrosActive) setOpenCadastros(true);
    if (isPesquisarActive) setOpenPesquisar(true);
    if (isRelatoriosActive) setOpenRelatorios(true);
    if (isConfiguracoesActive) setOpenConfiguracoes(true);
    if (isPlogConfigActive) setOpenPlogConfiguracoes(true);
  }, [activeTab]);

  const isAdmin =
    currentUser?.role === 'ADMIN' || Boolean(currentUser?.permissions?.manageUsers);
  const isPlogUser = currentUser?.username?.toLowerCase() === 'plog';
  const perms = currentUser?.permissions;

  const handleSelectItem = (id: ActiveTab) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white text-slate-800 select-none overflow-hidden">
      {/* Top Header Fixed */}
      <div className="p-3.5 pb-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between">
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <FolderTree className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black tracking-tight text-slate-900 block leading-tight">
                  Painel de Gestão
                </span>
                <span className="text-[10px] font-semibold text-blue-600 block uppercase tracking-wider">
                  CRM de Infrações
                </span>
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs mx-auto">
              <FolderTree className="w-4 h-4" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors ml-auto cursor-pointer"
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Navigation Area with visible scrollbar */}
      <div className="flex-1 overflow-y-auto crm-menu-scroll p-3.5 space-y-4 pr-2">
        {/* Navigation Structure */}
        {isPlogUser ? (
          <nav className="space-y-2">
            {!isCollapsed && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-2">
                <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                  Perfil P-LOG • Acesso Autorizado
                </span>
                <span className="text-[10px] text-amber-800 font-medium block">
                  Veículos, Motoristas e Emissão de Termos/Recibos
                </span>
              </div>
            )}

            {/* 1. Cadastro de Veículos */}
            <button
              type="button"
              id="nav-item-vehicles"
              onClick={() => handleSelectItem('vehicles')}
              title={isCollapsed ? 'Cadastro de Veículos (CRLV)' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'vehicles'
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Truck
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'vehicles' ? 'text-white' : 'text-blue-600'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Cadastro de Veículos (CRLV)</span>}
              </div>
              {!isCollapsed && totalVehiclesCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    activeTab === 'vehicles' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {totalVehiclesCount}
                </span>
              )}
            </button>

            {/* 2. Cadastro de Motoristas */}
            <button
              type="button"
              id="nav-item-drivers"
              onClick={() => handleSelectItem('drivers')}
              title={isCollapsed ? 'Cadastro de Motoristas (CNH)' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'drivers'
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Users
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'drivers' ? 'text-white' : 'text-emerald-600'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Cadastro de Motoristas (CNH)</span>}
              </div>
              {!isCollapsed && totalDriversCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    activeTab === 'drivers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {totalDriversCount}
                </span>
              )}
            </button>

            {/* 3. Operação C.A (Planilha Dedicada de Multas & Folha) */}
            <button
              type="button"
              id="nav-item-operacao-ca"
              onClick={() => handleSelectItem('operacao-ca')}
              title={isCollapsed ? 'Operação C.A' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'operacao-ca'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/20'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Briefcase
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'operacao-ca' ? 'text-white' : 'text-amber-600'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Operação C.A</span>}
              </div>
              {!isCollapsed && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                    activeTab === 'operacao-ca'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {totalCaCount > 0 ? totalCaCount : 'C.A'}
                </span>
              )}
            </button>

            {/* 4. Gerar Termos ou Recibos */}
            <button
              type="button"
              id="nav-item-receipts"
              onClick={() => handleSelectItem('receipts')}
              title={isCollapsed ? 'Gerar Termos ou Recibos' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'receipts'
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileSignature
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'receipts' ? 'text-white' : 'text-purple-600'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Gerar Termos ou Recibos</span>}
              </div>
              {!isCollapsed && totalTermsCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    activeTab === 'receipts' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {totalTermsCount}
                </span>
              )}
            </button>

            {/* 5. Submenu Configurações para Usuário PLOG */}
            <div className="rounded-xl overflow-hidden border border-slate-200/70 bg-slate-50/50 mt-1">
              <button
                type="button"
                onClick={() => {
                  if (isCollapsed) setIsCollapsed(false);
                  setOpenPlogConfiguracoes(!openPlogConfiguracoes);
                }}
                title={isCollapsed ? 'Configurações' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                } py-2 text-xs font-bold transition-colors cursor-pointer ${
                  isPlogConfigActive
                    ? 'bg-blue-50 text-blue-900 border-b border-blue-100'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Settings className="w-4 h-4 text-slate-700 shrink-0" />
                  {!isCollapsed && (
                    <span className="uppercase text-[11px] tracking-wider font-black">
                      Configurações
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center gap-1.5">
                    {unreadNotifsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-red-100 text-red-700">
                        {unreadNotifsCount}
                      </span>
                    )}
                    {openPlogConfiguracoes ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                )}
              </button>

              {(!isCollapsed ? openPlogConfiguracoes : true) && (
                <div className="p-1 space-y-0.5 bg-white">
                  {/* Consulta Gov.br / SENATRAN por Placa */}
                  <button
                    type="button"
                    id="nav-item-plog-detran"
                    onClick={() => handleSelectItem('detran')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'detran'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'detran' ? 'text-white' : 'text-emerald-600'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">Puxar Multas (Gov.br / Senatran)</span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          activeTab === 'detran'
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        API
                      </span>
                    )}
                  </button>

                  {/* Central de Notificações */}
                  <button
                    type="button"
                    id="nav-item-plog-notifications"
                    onClick={() => handleSelectItem('notifications')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'notifications'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Bell
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'notifications' ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Notificações & Prazos</span>}
                    </div>
                    {!isCollapsed && unreadNotifsCount > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-black shrink-0 ${
                          activeTab === 'notifications'
                            ? 'bg-white/20 text-white'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {unreadNotifsCount}
                      </span>
                    )}
                  </button>

                  {/* Informações da Empresa CNPJ P-LOG */}
                  {!isCollapsed && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-1">
                      <span className="text-[10px] font-black text-amber-900 uppercase block">
                        CNPJ Selecionado
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-800 block truncate">
                        02.489.120/0001-95
                      </span>
                      <span className="text-[9px] text-amber-700 block truncate">
                        P-LOG Transportes & C.A
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
        ) : (
          <nav className="space-y-2">

          {/* Central de Scanner (CNH & CRLV) */}
          <button
            type="button"
            id="nav-item-scanner"
            onClick={() => handleSelectItem('scanner')}
            title={isCollapsed ? 'Escanear Documentos (CNH / CRLV)' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
            } py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'scanner'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ScanLine
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'scanner' ? 'text-white' : 'text-blue-600'
                }`}
              />
              {!isCollapsed && <span className="truncate">Escanear Documentos</span>}
            </div>
            {!isCollapsed && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                  activeTab === 'scanner'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                OCR
              </span>
            )}
          </button>

          {/* Operação C.A (Visível para novos logins autorizados com permissão accessOperacaoCA) */}
          {!isPlogUser && (isAdmin || perms?.accessOperacaoCA) && (
            <button
              type="button"
              id="nav-item-operacao-ca-granted"
              onClick={() => handleSelectItem('operacao-ca')}
              title={isCollapsed ? 'Operação C.A (Planilha Dedicada & Folha)' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'operacao-ca'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/20'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Briefcase
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'operacao-ca' ? 'text-white' : 'text-amber-600'
                  }`}
                />
                {!isCollapsed && <span className="truncate">Operação C.A</span>}
              </div>
              {!isCollapsed && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                    activeTab === 'operacao-ca'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {totalCaCount > 0 ? totalCaCount : 'C.A'}
                </span>
              )}
            </button>
          )}

          {/* 2. SUBMENU CADASTROS (CRM Accordion) */}
          <div className="rounded-xl overflow-hidden border border-slate-200/70 bg-slate-50/50">
            {/* Submenu Accordion Header */}
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) setIsCollapsed(false);
                setOpenCadastros(!openCadastros);
              }}
              title={isCollapsed ? 'Cadastros' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2 text-xs font-bold transition-colors cursor-pointer ${
                isCadastrosActive
                  ? 'bg-blue-50 text-blue-900 border-b border-blue-100'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                {!isCollapsed && (
                  <span className="uppercase text-[11px] tracking-wider font-black">
                    Cadastros
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700 font-bold">
                    {totalDriversCount + totalVehiclesCount + totalFinesCount}
                  </span>
                  {openCadastros ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              )}
            </button>

            {/* Submenu Children Items */}
            {(!isCollapsed ? openCadastros : true) && (
              <div className="p-1 space-y-0.5 bg-white">
                {/* Motoristas */}
                {(!perms || perms.manageDrivers) && (
                  <button
                    type="button"
                    id="nav-item-drivers"
                    onClick={() => handleSelectItem('drivers')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'drivers'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Users
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'drivers' ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Motoristas (CNH)</span>}
                    </div>
                    {!isCollapsed && totalDriversCount > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          activeTab === 'drivers'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {totalDriversCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Veículos */}
                {(!perms || perms.manageVehicles) && (
                  <button
                    type="button"
                    id="nav-item-vehicles"
                    onClick={() => handleSelectItem('vehicles')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'vehicles'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'vehicles' ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Veículos (CRLV)</span>}
                    </div>
                    {!isCollapsed && totalVehiclesCount > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          activeTab === 'vehicles'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {totalVehiclesCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Multas de Trânsito */}
                {(!perms || perms.manageFines) && (
                  <button
                    type="button"
                    id="nav-item-fines"
                    onClick={() => handleSelectItem('fines')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'fines'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileWarning
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'fines' ? 'text-white' : 'text-red-500'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Multas de Trânsito (AIT)</span>}
                    </div>
                    {!isCollapsed && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          activeTab === 'fines'
                            ? 'bg-white/20 text-white'
                            : overdueFinesCount > 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {overdueFinesCount > 0 ? `${overdueFinesCount} venc.` : totalFinesCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. SUBMENU PESQUISAR (CRM Accordion) */}
          <div className="rounded-xl overflow-hidden border border-slate-200/70 bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) setIsCollapsed(false);
                setOpenPesquisar(!openPesquisar);
              }}
              title={isCollapsed ? 'Pesquisar' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2 text-xs font-bold transition-colors cursor-pointer ${
                isPesquisarActive
                  ? 'bg-blue-50 text-blue-900 border-b border-blue-100'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-4 h-4 text-emerald-600 shrink-0" />
                {!isCollapsed && (
                  <span className="uppercase text-[11px] tracking-wider font-black">
                    Pesquisar
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center gap-1.5">
                  {openPesquisar ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              )}
            </button>

            {(!isCollapsed ? openPesquisar : true) && (
              <div className="p-1 space-y-0.5 bg-white">
                {/* Pesquisa de Multas */}
                {(!perms || perms.searchFines) && (
                  <button
                    type="button"
                    id="nav-item-fine-search"
                    onClick={() => handleSelectItem('fine-search')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'fine-search'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <SlidersHorizontal
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'fine-search' ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Pesquisa de Multas</span>}
                    </div>
                  </button>
                )}

                {/* Consulta por Placa & Detran */}
                {(!perms || perms.searchFines) && (
                  <button
                    type="button"
                    id="nav-item-detran"
                    onClick={() => handleSelectItem('detran')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'detran'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Search
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'detran' ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Consulta Detran</span>}
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. SUBMENU RELATÓRIOS (CRM Accordion) */}
          <div className="rounded-xl overflow-hidden border border-slate-200/70 bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) setIsCollapsed(false);
                setOpenRelatorios(!openRelatorios);
              }}
              title={isCollapsed ? 'Relatórios' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2 text-xs font-bold transition-colors cursor-pointer ${
                isRelatoriosActive
                  ? 'bg-blue-50 text-blue-900 border-b border-blue-100'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileBarChart className="w-4 h-4 text-purple-600 shrink-0" />
                {!isCollapsed && (
                  <span className="uppercase text-[11px] tracking-wider font-black">
                    Relatórios
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center gap-1.5">
                  {openRelatorios ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              )}
            </button>

            {(!isCollapsed ? openRelatorios : true) && (
              <div className="p-1 space-y-0.5 bg-white">
                {/* Relatórios de Multas */}
                {(!perms || perms.generateReports) && (
                  <button
                    type="button"
                    id="nav-item-reports"
                    onClick={() => handleSelectItem('reports')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'reports'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileBarChart
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'reports' ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Relatório de Multas</span>}
                    </div>
                  </button>
                )}

                {/* Termos & Recibos de Folha */}
                {(!perms || perms.manageTerms) && (
                  <button
                    type="button"
                    id="nav-item-receipts"
                    onClick={() => handleSelectItem('receipts')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'receipts'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSignature
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'receipts' ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Termos de Notificação</span>}
                    </div>
                    {!isCollapsed && totalTermsCount > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          activeTab === 'receipts'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {totalTermsCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 5. SUBMENU CONFIGURAÇÕES (CRM Accordion) */}
          <div className="rounded-xl overflow-hidden border border-slate-200/70 bg-slate-50/50">
            <button
              type="button"
              onClick={() => {
                if (isCollapsed) setIsCollapsed(false);
                setOpenConfiguracoes(!openConfiguracoes);
              }}
              title={isCollapsed ? 'Configurações' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
              } py-2 text-xs font-bold transition-colors cursor-pointer ${
                isConfiguracoesActive
                  ? 'bg-blue-50 text-blue-900 border-b border-blue-100'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Settings className="w-4 h-4 text-slate-700 shrink-0" />
                {!isCollapsed && (
                  <span className="uppercase text-[11px] tracking-wider font-black">
                    Configurações
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center gap-1.5">
                  {unreadNotifsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-red-100 text-red-700">
                      {unreadNotifsCount}
                    </span>
                  )}
                  {openConfiguracoes ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              )}
            </button>

            {(!isCollapsed ? openConfiguracoes : true) && (
              <div className="p-1 space-y-0.5 bg-white">
                {/* Usuários & Permissões */}
                {isAdmin && (
                  <button
                    type="button"
                    id="nav-item-users"
                    onClick={() => handleSelectItem('users')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'users'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'users' ? 'text-white' : 'text-blue-600'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Usuários & Permissões</span>}
                    </div>
                    {!isCollapsed && totalUsersCount > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          activeTab === 'users'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {totalUsersCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Empresas & Filiais (ERP) */}
                {(isAdmin || perms?.manageCompanies) && (
                  <button
                    type="button"
                    id="nav-item-companies"
                    onClick={() => handleSelectItem('companies')}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'companies'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTab === 'companies' ? 'text-white' : 'text-blue-600'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">Empresas & Filiais (ERP)</span>}
                    </div>
                  </button>
                )}

                {/* Sincronização Detran */}
                {onSyncDetran && (
                  <button
                    type="button"
                    onClick={onSyncDetran}
                    disabled={isSyncingDetran}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${
                          isSyncingDetran ? 'animate-spin' : ''
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">
                          {isSyncingDetran ? 'Sincronizando...' : 'Sincronizar Detran'}
                        </span>
                      )}
                    </div>
                  </button>
                )}

                {/* Central de Notificações */}
                <button
                  type="button"
                  id="nav-item-notifications"
                  onClick={() => handleSelectItem('notifications')}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                  } py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'notifications'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Bell
                      className={`w-3.5 h-3.5 shrink-0 ${
                        activeTab === 'notifications' ? 'text-white' : 'text-slate-500'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">Central de Notificações</span>}
                  </div>
                  {!isCollapsed && unreadNotifsCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black shrink-0 ${
                        activeTab === 'notifications'
                          ? 'bg-white/20 text-white'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {unreadNotifsCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </nav>
        )}
      </div>

      {/* Bottom Section: User Profile & Logout */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.name || 'Administrador'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {currentUser ? getRoleLabel(currentUser.role, currentUser.customRoleName) : 'Sistema'}
                </p>
              </div>
            </div>

            {onRequestLogout && (
              <button
                type="button"
                onClick={onRequestLogout}
                title="Sair do Sistema"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          onRequestLogout && (
            <button
              type="button"
              onClick={onRequestLogout}
              title="Sair do Sistema"
              className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        id="desktop-sidebar"
        className={`hidden lg:flex flex-col border-r border-slate-200 transition-all duration-300 ease-in-out shrink-0 bg-white sticky top-[61px] h-[calc(100vh-61px)] ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
