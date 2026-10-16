import React from 'react';
import {
  X,
  FileWarning,
  Calendar,
  MapPin,
  Building,
  User,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  ShieldAlert,
  FileText,
  Eye,
  Download,
} from 'lucide-react';
import { TrafficFine } from '../types';
import { formatCurrency, formatDateTime, formatDate, getDaysOverdue } from '../lib/formatters';
import {
  PrintableDocumentPayload,
  buildFineDetailPrintPayload,
  downloadImportedFinePdf,
  triggerNativeHtmlPrint,
} from '../lib/printService';

interface FineDetailModalProps {
  fine: TrafficFine | null;
  onClose: () => void;
  onPayFine: (fineId: string) => void;
  onAppealFine: (fineId: string) => void;
  onToggleDoubledFine?: (fineId: string) => void;
  onGenerateTerm?: (fine: TrafficFine) => void;
  onOpenPrintModal?: (payload: PrintableDocumentPayload) => void;
  onViewFinePdf?: (fine: TrafficFine) => void;
}

export const FineDetailModal: React.FC<FineDetailModalProps> = ({
  fine,
  onClose,
  onPayFine,
  onAppealFine,
  onToggleDoubledFine,
  onGenerateTerm,
  onOpenPrintModal,
  onViewFinePdf,
}) => {
  if (!fine) return null;

  const daysOverdue = getDaysOverdue(fine.dueDate);
  const isOverdue = fine.status === 'VENCIDA' || (fine.status === 'PENDENTE' && daysOverdue > 0);
  const isDoubled = !!fine.isDoubledFine || (fine.multiplierFactor && fine.multiplierFactor > 1);
  const multFactor = fine.multiplierFactor || (isDoubled ? 2 : 1);
  const baseValue =
    fine.originalAmount ||
    (multFactor > 1 ? Number((fine.fineAmount / multFactor).toFixed(2)) : fine.fineAmount);

  const getSeverityBadge = () => {
    switch (fine.severity) {
      case 'GRAVISSIMA':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'GRAVE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIA':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusBadge = () => {
    switch (fine.status) {
      case 'PAGA':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'VENCIDA':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'EM_RECURSO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const handlePrint = () => {
    const payload = buildFineDetailPrintPayload(fine);
    if (onOpenPrintModal) {
      onOpenPrintModal(payload);
    } else {
      triggerNativeHtmlPrint(payload.htmlContent);
    }
  };

  return (
    <div
      id="fine-detail-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="fine-detail-card"
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-6 overflow-hidden"
      >
        {/* Header (Light Theme) */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Notificação de Autuação (AIT): {fine.aitNumber}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge()}`}>
                  {fine.status}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Órgão Autuador: <span className="text-slate-900 font-bold">{fine.issuingAuthority}</span> • Placa:{' '}
                <span className="text-blue-700 font-mono font-bold">{fine.plate}</span>
              </p>
            </div>
          </div>
          <button
            id="btn-close-fine-detail"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto bg-white">
          {/* Overdue Alert banner if overdue */}
          {isOverdue && fine.status !== 'PAGA' && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Multa Vencida há {daysOverdue} dias!</p>
                <p className="text-red-700 mt-0.5">
                  Vencimento original: {formatDate(fine.dueDate)}. Há incidência de juros SELIC e risco de bloqueio administrativo no Detran.
                </p>
              </div>
            </div>
          )}

          {/* Imported PDF Card */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Documento PDF da Infração Importada</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                    Disponível
                  </span>
                </p>
                <p className="text-[11px] text-slate-700 font-mono mt-0.5">
                  {fine.pdfFileName || `Notificacao_AIT_${fine.aitNumber}_${fine.plate}.pdf`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onViewFinePdf && (
                <button
                  type="button"
                  onClick={() => onViewFinePdf(fine)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visualizar PDF Importado</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => downloadImportedFinePdf(fine)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar PDF</span>
              </button>
            </div>
          </div>

          {/* Infraction Core Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Enquadramento CTB</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge()}`}>
                  {fine.severity} ({fine.points} Pontos)
                </span>
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Cód. {fine.infractionCode}
                </span>
              </div>
            </div>
            <h4 className="text-sm font-bold text-slate-900 leading-relaxed">
              {fine.infractionDescription}
            </h4>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Data e Horário da Infração
              </p>
              <p className="text-slate-900 font-bold">{formatDateTime(fine.infractionDate)}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Data de Vencimento
              </p>
              <p className={`font-bold ${isOverdue && fine.status !== 'PAGA' ? 'text-red-600' : 'text-slate-900'}`}>
                {formatDate(fine.dueDate)}
              </p>
            </div>

            <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Local e Município
              </p>
              <p className="text-slate-900 font-bold">
                {fine.infractionLocation} — {fine.city}/{fine.state}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-600" />
                Condutor Infrator
              </p>
              <p className="text-slate-900 font-bold">
                {fine.driverName || 'Condutor a identificar na Notificação'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-cyan-600" />
                Veículo Autuado
              </p>
              <p className="text-slate-900 font-mono font-bold">{fine.plate}</p>
            </div>

            <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-600" />
                Proprietário do Veículo
              </p>
              <p className="text-slate-900 font-bold">
                {/transbra[s]?il|14\.285\.932/i.test(fine.ownerCnpjRazaoSocial || '')
                  ? 'Proprietário / Frota Registrada'
                  : fine.ownerCnpjRazaoSocial || 'Proprietário / Frota Registrada'}
              </p>
            </div>
          </div>

          {/* Pricing Box & SNE Discounts */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            {isDoubled && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-red-800 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Multa Dobrada (Fator {multFactor}x - NIC PJ / Art. 257 § 8º CTB)
                </span>
                <span className="text-[11px] text-slate-600 font-mono">
                  Base: {formatCurrency(baseValue)} × {multFactor}x
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-600 font-semibold">
                  {isDoubled ? `Valor Final (${multFactor}x Multiplicado)` : 'Valor Integral'}
                </p>
                <p className="text-2xl font-black text-slate-900 font-mono">{formatCurrency(fine.fineAmount)}</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-emerald-700 font-bold">Com Desconto SNE (20%)</p>
                <p className="text-xl font-black text-emerald-700 font-mono">
                  {formatCurrency(fine.discountAmount || fine.fineAmount * 0.8)}
                </p>
              </div>
            </div>
          </div>

          {fine.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <p className="font-bold text-slate-900 mb-1">Observações do Auto:</p>
              <p>{fine.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir AIT</span>
            </button>

            {onGenerateTerm && (
              <button
                type="button"
                onClick={() => {
                  onGenerateTerm(fine);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Termo / Recibo de Multa</span>
              </button>
            )}

            {onToggleDoubledFine && fine.status !== 'PAGA' && (
              <button
                type="button"
                onClick={() => onToggleDoubledFine(fine.id)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isDoubled
                    ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900'
                    : 'border-red-300 bg-red-50 hover:bg-red-100 text-red-800'
                }`}
              >
                <span>{isDoubled ? '↩️ Remover Multa Dobrada (1x)' : '⚡ Aplicar Multa Dobrada (NIC 2x)'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {fine.status !== 'PAGA' && fine.status !== 'EM_RECURSO' && (
              <button
                onClick={() => {
                  onAppealFine(fine.id);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Abrir Recurso JARI
              </button>
            )}

            {fine.status !== 'PAGA' && (
              <button
                onClick={() => {
                  onPayFine(fine.id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Quitar Multa</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
