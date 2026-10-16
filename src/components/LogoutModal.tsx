import React from 'react';
import { LogOut, AlertTriangle, X, UserCheck } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onConfirmLogout?: () => void;
  userName?: string;
  userEmail?: string;
  userRoleLabel?: string;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onConfirmLogout,
  userName = 'Usuário',
  userEmail,
  userRoleLabel,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (onConfirmLogout) onConfirmLogout();
  };

  return (
    <div
      id="logout-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
    >
      <div
        id="logout-modal-card"
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl text-slate-900"
      >
        <button
          id="btn-close-logout-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Encerrar Sessão no Sistema</h3>
            <p className="text-xs text-slate-500">Confirmação de saída segura</p>
          </div>
        </div>

        {/* Logged-in User Info Box */}
        <div className="mb-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Usuário Conectado no Momento
            </p>
            <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
            {(userEmail || userRoleLabel) && (
              <p className="text-xs text-slate-600 truncate">
                {userRoleLabel ? `${userRoleLabel}` : ''}
                {userEmail && userRoleLabel ? ' • ' : ''}
                {userEmail ? userEmail : ''}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Deseja realmente sair do sistema <span className="font-bold text-slate-900">Controle Interno de Infrações de Trânsito</span>? Todos os seus registros estão salvos. Para acessar novamente, será necessário informar seu usuário e senha.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            id="btn-cancel-logout"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
          >
            Permanecer Conectado
          </button>
          <button
            id="btn-confirm-logout"
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sim, Sair Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
