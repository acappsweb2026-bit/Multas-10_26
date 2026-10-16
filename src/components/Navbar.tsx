import React from 'react';
import { Truck, Bell, LogOut, RefreshCw, Radio, Menu, RotateCcw, ShieldCheck, UserCheck, Database } from 'lucide-react';
import { AppNotification, UserSession } from '../types';
import { getRoleLabel } from '../data/mockData';

interface NavbarProps {
  user: UserSession;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  onRequestLogout: () => void;
  onSyncDetran: () => void;
  isSyncingDetran: boolean;
  onToggleMobileMenu?: () => void;
  onResetDatabase?: () => void;
  onOpenUsersPermissions?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  notifications,
  onOpenNotifications,
  onRequestLogout,
  onSyncDetran,
  isSyncingDetran,
  onToggleMobileMenu,
  onResetDatabase,
  onOpenUsersPermissions,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const roleLabel = getRoleLabel(user.role, user.customRoleName);
  const isAdmin = user.role === 'ADMIN' || Boolean(user.permissions?.manageUsers);

  return (
    <header
      id="main-app-navbar"
      className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-2xs transition-all"
    >
      {/* Left: Hamburger Menu (Mobile) + Brand & Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            id="btn-mobile-sidebar-toggle"
            type="button"
            onClick={onToggleMobileMenu}
            aria-label="Abrir Menu Lateral"
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden sm:flex w-9 h-9 rounded-xl bg-blue-600 items-center justify-center text-white shadow-sm shrink-0">
          <Truck className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-900 tracking-tight text-sm sm:text-base lg:text-lg leading-tight truncate">
              Controle Interno de Infrações de Trânsito
            </span>
            <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" />
              DETRAN ONLINE
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden md:block truncate">
            {user.companyName
              ? `${user.companyName}${user.companyCnpj ? ` • CNPJ: ${user.companyCnpj}` : ''}`
              : 'Gestão de Motoristas (CNH), Veículos (CRLV), Multas (AIT) e Termos de Folha'}
          </p>
        </div>
      </div>

      {/* Right: Logged-in User Profile & Sair Button */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Logged-in User Identification Card */}
        <div
          onClick={isAdmin && onOpenUsersPermissions ? onOpenUsersPermissions : undefined}
          title={
            isAdmin
              ? 'Clique para gerenciar Usuários, Senhas e Permissões (Administrador)'
              : `Usuário Logado: ${user.name} (${roleLabel})`
          }
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-left ${
            isAdmin && onOpenUsersPermissions ? 'hover:bg-blue-50/80 hover:border-blue-200 cursor-pointer transition-colors' : ''
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left max-w-[130px] md:max-w-[200px]">
            <div className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-xs font-bold text-slate-900 truncate">{user.name}</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {user.username ? `@${user.username} • ` : ''}
              {roleLabel}
            </p>
          </div>
        </div>

        {/* Sair Button */}
        <button
          id="btn-navbar-logout"
          type="button"
          onClick={onRequestLogout}
          title="Encerrar sessão e voltar para a tela de login"
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
};
