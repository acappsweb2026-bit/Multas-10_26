import React, { useState } from 'react';
import {
  FileWarning,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Building,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Trash2,
  Edit2,
  FileText,
  DollarSign,
  Scale,
  Printer,
  FileBarChart,
  Eye,
  Sparkles,
} from 'lucide-react';
import { TrafficFine, Vehicle, Driver } from '../types';
import { formatCurrency, formatDate, getDaysOverdue } from '../lib/formatters';
import {
  PrintableDocumentPayload,
  buildFineDetailPrintPayload,
  buildFinesReportPrintPayload,
} from '../lib/printService';

interface FinesViewProps {
  fines: TrafficFine[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onOpenNewFineModal: () => void;
  onOpenScanPdfModal?: () => void;
  onOpenBulkImportModal?: () => void;
  onOpenAIFineImportModal?: () => void;
  onSelectFine: (fine: TrafficFine) => void;
  onViewFinePdf?: (fine: TrafficFine) => void;
  onEditFine: (fine: TrafficFine) => void;
  onDeleteFine: (fineId: string) => void;
  onPayFine: (fineId: string) => void;
  onGenerateTerm?: (fine: TrafficFine) => void;
  onOpenPrintModal?: (payload: PrintableDocumentPayload) => void;
  onOpenSearchScreen?: () => void;
  onOpenReportScreen?: () => void;
}

export const FinesView: React.FC<FinesViewProps> = ({
  fines,
  vehicles,
  drivers,
  onOpenNewFineModal,
  onOpenAIFineImportModal,
  onSelectFine,
  onViewFinePdf,
  onEditFine,
  onDeleteFine,
  onPayFine,
  onGenerateTerm,
  onOpenPrintModal,
  onOpenSearchScreen,
  onOpenReportScreen,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [authorityFilter, setAuthorityFilter] = useState<string>('ALL');
  const [doubledFilter, setDoubledFilter] = useState<string>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredFines = fines.filter((fine) => {
    const matchesSearch =
      fine.aitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.infractionCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.infractionDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.infractionLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fine.driverName && fine.driverName.toLowerCase().includes(searchTerm.toLowerCase()));

    const isDoubled = !!fine.isDoubledFine || (fine.multiplierFactor && fine.multiplierFactor > 1);

    const matchesStatus = statusFilter === 'ALL' || fine.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || fine.severity === severityFilter;
    const matchesAuthority = authorityFilter === 'ALL' || fine.issuingAuthority === authorityFilter;
    const matchesDoubled =
      doubledFilter === 'ALL' ||
      (doubledFilter === 'DOUBLED' && isDoubled) ||
      (doubledFilter === 'NORMAL' && !isDoubled);

    return matchesSearch && matchesStatus && matchesSeverity && matchesAuthority && matchesDoubled;
  });

  return (
    <div id="fines-view" className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileWarning className="w-6 h-6 text-red-400" />
            <span>Gerenciamento de Multas de Trânsito</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Controle de AITs, autuações CTB, prazos de vencimento, localização e opção de Multa Dobrada (NIC PJ)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenSearchScreen && (
            <button
              type="button"
              onClick={onOpenSearchScreen}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <span>Tela de Pesquisa de Multas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onOpenReportScreen) {
                onOpenReportScreen();
              } else if (onOpenPrintModal) {
                onOpenPrintModal(
                  buildFinesReportPrintPayload(filteredFines, 'Relatório de Multas de Trânsito')
                );
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileBarChart className="w-3.5 h-3.5" />
            <span>Gerar Relatório de Multas</span>
          </button>

          {onOpenPrintModal && (
            <button
              type="button"
              onClick={() =>
                onOpenPrintModal(
                  buildFinesReportPrintPayload(filteredFines, 'Relatório de Multas Filtradas')
                )
              }
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Lista ({filteredFines.length})</span>
            </button>
          )}

          {onOpenAIFineImportModal && (
            <button
              id="btn-ai-fine-import-top"
              type="button"
              onClick={onOpenAIFineImportModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-white/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Importar com Google AI</span>
            </button>
          )}

          <button
            id="btn-new-fine-top"
            onClick={onOpenNewFineModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Multa (AIT)</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por AIT, placa, código CTB, local ou motorista..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Filter Multa Dobrada */}
          <select
            value={doubledFilter}
            onChange={(e) => setDoubledFilter(e.target.value)}
            className={`px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none transition-colors ${
              doubledFilter === 'DOUBLED'
                ? 'bg-red-950/80 border-red-500 text-red-300'
                : 'bg-slate-950/70 border-slate-700/80 text-slate-300 focus:border-red-500'
            }`}
          >
            <option value="ALL">Todas Multas (Normal / Dobrada)</option>
            <option value="DOUBLED">⚖️ Apenas Multas Dobradas (NIC PJ 2x)</option>
            <option value="NORMAL">Multas Simples (1x)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="VENCIDA">Vencidas (Em Atraso)</option>
            <option value="PENDENTE">Pendentes (A Vencer)</option>
            <option value="EM_RECURSO">Em Recurso</option>
            <option value="PAGA">Pagas</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Todas Gravidades</option>
            <option value="GRAVISSIMA">Gravíssima (7 pts)</option>
            <option value="GRAVE">Grave (5 pts)</option>
            <option value="MEDIA">Média (4 pts)</option>
            <option value="LEVE">Leve (3 pts)</option>
          </select>

          <select
            value={authorityFilter}
            onChange={(e) => setAuthorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Todos Órgãos</option>
            <option value="DETRAN">DETRAN</option>
            <option value="PRF">PRF</option>
            <option value="DER">DER</option>
            <option value="DNIT">DNIT</option>
            <option value="PREFEITURA / CET">CET / Prefeitura</option>
          </select>
        </div>
      </div>

      {/* Main Fines Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase font-bold text-slate-400 bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Auto (AIT) / Órgão</th>
                <th className="py-3.5 px-3">Placa</th>
                <th className="py-3.5 px-3">Data / Local / Município</th>
                <th className="py-3.5 px-3">Cód. & Enquadramento CTB</th>
                <th className="py-3.5 px-3">Condutor</th>
                <th className="py-3.5 px-3">Vencimento</th>
                <th className="py-3.5 px-3">Valor / SNE</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenhuma multa encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredFines.map((fine) => {
                  const daysOverdue = getDaysOverdue(fine.dueDate);
                  const isOverdue = fine.status === 'VENCIDA' || (fine.status === 'PENDENTE' && daysOverdue > 0);
                  const isDoubled = !!fine.isDoubledFine || (fine.multiplierFactor && fine.multiplierFactor > 1);
                  const factor = fine.multiplierFactor || (isDoubled ? 2 : 1);

                  return (
                    <tr
                      key={fine.id}
                      onClick={() => onSelectFine(fine)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      {/* AIT & Órgão */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-white group-hover:text-blue-400 block">
                            {fine.aitNumber}
                          </span>
                          {isDoubled && (
                            <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-[9px] font-bold text-red-300 border border-red-500/30 shrink-0">
                              {factor}x NIC
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-semibold">{fine.issuingAuthority}</span>
                          {onViewFinePdf && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewFinePdf(fine);
                              }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold transition-colors cursor-pointer"
                              title={`Visualizar PDF Importado (${fine.pdfFileName || `AIT_${fine.aitNumber}.pdf`})`}
                            >
                              <Eye className="w-2.5 h-2.5" />
                              <span>PDF Importado</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Placa Mercosul */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300 font-mono font-bold text-xs">
                          {fine.plate}
                        </span>
                      </td>

                      {/* Data / Local / Município */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="font-medium text-slate-200">{formatDate(fine.infractionDate)}</p>
                        <p className="text-[11px] text-slate-300 font-semibold truncate flex items-center gap-1" title={fine.infractionLocation}>
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0 inline" />
                          <span>{fine.infractionLocation}</span>
                        </p>
                        <p className="text-[10px] text-slate-500">{fine.city}/{fine.state}</p>
                      </td>

                      {/* Cód & Descrição CTB */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono font-bold text-red-400 text-[11px]">
                            {fine.infractionCode}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                            {fine.severity} {isDoubled ? '(0 pts NIC)' : `(${fine.points} pts)`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2" title={fine.infractionDescription}>
                          {fine.infractionDescription}
                        </p>
                      </td>

                      {/* Motorista */}
                      <td className="py-3.5 px-3">
                        <span className="text-slate-300 font-medium block">
                          {fine.driverName || (isDoubled ? 'Não indicado (PJ)' : 'Não identificado')}
                        </span>
                      </td>

                      {/* Vencimento */}
                      <td className="py-3.5 px-3">
                        <span className={`font-semibold ${isOverdue && fine.status !== 'PAGA' ? 'text-red-400' : 'text-slate-300'}`}>
                          {formatDate(fine.dueDate)}
                        </span>
                        {isOverdue && fine.status !== 'PAGA' && (
                          <span className="block text-[10px] text-red-400 font-bold">
                            {daysOverdue}d atraso
                          </span>
                        )}
                      </td>

                      {/* Valores */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-white block">
                            {formatCurrency(fine.fineAmount)}
                          </span>
                          {isDoubled && (
                            <span className="text-[9px] font-bold text-red-400 font-mono">({factor}x)</span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          SNE: {formatCurrency(fine.discountAmount || fine.fineAmount * 0.8)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            fine.status === 'PAGA'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : fine.status === 'VENCIDA'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : fine.status === 'EM_RECURSO'
                              ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {fine.status}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {onViewFinePdf && (
                            <button
                              type="button"
                              onClick={() => onViewFinePdf(fine)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                              title={`Visualizar PDF Importado (${fine.pdfFileName || `Notificacao_AIT_${fine.aitNumber}.pdf`})`}
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver PDF</span>
                            </button>
                          )}
                          {onOpenPrintModal && (
                            <button
                              type="button"
                              onClick={() => onOpenPrintModal(buildFineDetailPrintPayload(fine))}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Imprimir Ficha do Auto de Infração (A4 / PDF)"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Imprimir</span>
                            </button>
                          )}
                          {onGenerateTerm && (
                            <button
                              onClick={() => onGenerateTerm(fine)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Emitir ou Imprimir Termo de Ciência e Recibo de Multa (Desconto em Folha)"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Termo/Recibo</span>
                            </button>
                          )}
                          {fine.status !== 'PAGA' && (
                            <button
                              onClick={() => onPayFine(fine.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] transition-colors cursor-pointer"
                              title="Marcar como Paga"
                            >
                              Pagar
                            </button>
                          )}
                          <button
                            onClick={() => onEditFine(fine)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Editar Auto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === fine.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteFine(fine.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Excluir
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px] cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(fine.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Remover Auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
