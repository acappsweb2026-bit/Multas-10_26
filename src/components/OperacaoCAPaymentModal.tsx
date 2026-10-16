import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  CheckCircle2,
  Calendar,
  User,
  FileText,
  AlertCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { OperacaoCAItem } from '../types';

interface OperacaoCAPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: OperacaoCAItem | null;
  onSavePayment: (updatedItem: OperacaoCAItem) => void;
}

export const OperacaoCAPaymentModal: React.FC<OperacaoCAPaymentModalProps> = ({
  isOpen,
  onClose,
  item,
  onSavePayment,
}) => {
  const [paymentStatus, setPaymentStatus] = useState<'PAGO' | 'PENDENTE'>('PAGO');
  const [paidAt, setPaidAt] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (item) {
      setPaymentStatus(item.paymentStatus === 'PAGO' ? 'PAGO' : 'PAGO');
      setPaidAt(item.paidAt || new Date().toISOString().slice(0, 10));
      setPaidBy(item.paidBy || item.nominatedName || 'P-LOG TRANSPORTES');
      setInvoiceNumber(item.invoiceNumber || '');
      setPaymentNotes(item.paymentNotes || '');
      setFormError('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentStatus === 'PAGO' && !paidBy.trim()) {
      setFormError('Por favor informe por quem a multa foi paga.');
      return;
    }

    const updated: OperacaoCAItem = {
      ...item,
      paymentStatus,
      paidAt: paymentStatus === 'PAGO' ? paidAt : undefined,
      paidBy: paymentStatus === 'PAGO' ? paidBy.trim() : undefined,
      invoiceNumber: paymentStatus === 'PAGO' ? invoiceNumber.trim() : undefined,
      paymentNotes: paymentNotes.trim() || undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onSavePayment(updated);
    onClose();
  };

  const handleRevertToPending = () => {
    const updated: OperacaoCAItem = {
      ...item,
      paymentStatus: 'PENDENTE',
      paidAt: undefined,
      paidBy: undefined,
      invoiceNumber: undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    onSavePayment(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-8 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Controle de Pagamento — Operação C.A
              </h3>
              <p className="text-xs text-slate-600">
                AIT: <strong className="font-mono text-emerald-700">{item.ait}</strong> • Placa:{' '}
                <strong className="font-mono">{item.plate}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-emerald-100/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fine Quick Summary */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Valor Original</span>
            <span className="font-bold text-slate-800">
              {item.originalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Taxa Adm (10%)</span>
            <span className="font-bold text-slate-800">
              {item.adminFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total da Multa</span>
            <span className="font-black text-blue-700">
              {item.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Status Selection Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Status do Pagamento
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentStatus('PAGO')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentStatus === 'PAGO'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Multa Paga</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatus('PENDENTE')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentStatus === 'PENDENTE'
                    ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Pendente</span>
              </button>
            </div>
          </div>

          {paymentStatus === 'PAGO' && (
            <>
              {/* Quem Pagou */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Por quem foi pago? <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={paidBy}
                    onChange={(e) => {
                      setPaidBy(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="ex: P-LOG TRANSPORTES, ou Nome do Motorista"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                    required
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaidBy(item.nominatedName || 'P-LOG TRANSPORTES')}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    {item.nominatedName || 'P-LOG TRANSPORTES'}
                  </button>
                  {item.driverName && (
                    <button
                      type="button"
                      onClick={() => setPaidBy(item.driverName!)}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      {item.driverName}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPaidBy('Transportadora (Empresa)')}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Empresa
                  </button>
                </div>
              </div>

              {/* Número da Nota Fiscal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número da Nota Fiscal (NF) / Comprovante
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="ex: NF-98421 ou Comprovante 0419"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Data do Pagamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data do Pagamento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações do Pagamento
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="ex: Pago via boleto bancário com 20% de desconto"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {item.paymentStatus === 'PAGO' ? (
              <button
                type="button"
                onClick={handleRevertToPending}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Estornar para Pendente</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Pagamento</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
