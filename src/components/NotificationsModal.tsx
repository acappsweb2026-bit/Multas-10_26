import React from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectAitNotification: (ait: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onSelectAitNotification,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotifIcon = (type: string, severity?: string) => {
    if (type === 'FINE_OVERDUE' || severity === 'error' || type === 'DANGER') {
      return <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />;
    }
    if (type === 'DRIVER_POINTS_ALERT' || severity === 'warning' || type === 'WARNING') {
      return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />;
    }
    if (type === 'DETRAN_SYNC' || severity === 'success' || type === 'SUCCESS') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />;
    }
    return <Bell className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />;
  };

  return (
    <div
      id="notifications-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="notifications-modal-card"
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-8 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Central de Notificações</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                    {unreadCount} novas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                Alertas de multas, prazos vencidos e pontuação em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
          <button
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
            className="text-blue-600 hover:text-blue-800 disabled:text-slate-400 font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Marcar todas como lidas</span>
          </button>

          <button
            onClick={onClearAll}
            disabled={notifications.length === 0}
            className="text-slate-600 hover:text-red-600 disabled:text-slate-400 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar histórico</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto bg-slate-50/60">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-slate-800">Você está em dia!</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Nenhuma notificação pendente no momento.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const ait = notif.relatedAit || notif.aitNumber;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (ait) {
                      onSelectAitNotification(ait);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all ${
                    !notif.read
                      ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  } ${ait ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {getNotifIcon(notif.type, notif.severity)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 shrink-0 font-semibold">
                          {notif.timestamp}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed mb-2">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-2">
                        {ait && (
                          <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                            AIT: {ait}
                          </span>
                        )}
                        {(notif.relatedPlate || notif.plate) && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded">
                            {notif.relatedPlate || notif.plate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>Notificações em tempo real com Detran/Senatran</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
