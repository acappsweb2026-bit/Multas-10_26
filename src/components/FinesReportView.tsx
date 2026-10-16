import React, { useState, useMemo } from 'react';
import {
  FileBarChart,
  Printer,
  Download,
  FileSpreadsheet,
  Calendar,
  User,
  Truck,
  DollarSign,
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { TrafficFine, Vehicle, Driver, DriverReceiptTerm } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';
import {
  PrintableDocumentPayload,
  buildFinesReportPrintPayload,
  exportFinesToCsv,
} from '../lib/printService';

interface FinesReportViewProps {
  fines: TrafficFine[];
  vehicles: Vehicle[];
  drivers: Driver[];
  terms: DriverReceiptTerm[];
  onSelectFine: (fine: TrafficFine) => void;
  onOpenPrintModal: (payload: PrintableDocumentPayload) => void;
}

export const FinesReportView: React.FC<FinesReportViewProps> = ({
  fines,
  vehicles,
  drivers,
  terms,
  onSelectFine,
  onOpenPrintModal,
}) => {
  const [reportType, setReportType] = useState<'GERAL' | 'POR_MOTORISTA' | 'POR_VEICULO' | 'FINANCEIRO'>('GERAL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('ALL');
  const [selectedPlate, setSelectedPlate] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [authorityFilter, setAuthorityFilter] = useState('ALL');

  const availablePlates = useMemo(() => {
    const s = new Set<string>();
    vehicles.forEach((v) => s.add(v.plate.toUpperCase()));
    fines.forEach((f) => s.add(f.plate.toUpperCase()));
    return Array.from(s).sort();
  }, [vehicles, fines]);

  const filteredFines = useMemo(() => {
    return fines.filter((f) => {
      const infDate = f.infractionDate.slice(0, 10);
      if (dateFrom && infDate < dateFrom) return false;
      if (dateTo && infDate > dateTo) return false;
      if (selectedPlate !== 'ALL' && f.plate.toUpperCase() !== selectedPlate) return false;
      if (selectedDriverId !== 'ALL') {
        const drv = drivers.find((d) => d.id === selectedDriverId);
        const matchId = f.driverId === selectedDriverId;
        const matchName = drv && f.driverName && f.driverName.toLowerCase() === drv.name.toLowerCase();
        if (!matchId && !matchName) return false;
      }
      if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
      if (authorityFilter !== 'ALL' && f.issuingAuthority !== authorityFilter) return false;
      return true;
    });
  }, [fines, dateFrom, dateTo, selectedPlate, selectedDriverId, statusFilter, authorityFilter, drivers]);

  // Metrics
  const totalAmount = filteredFines.reduce((acc, f) => acc + f.fineAmount, 0);
  const totalSne = filteredFines.reduce((acc, f) => acc + (f.discountAmount || f.fineAmount * 0.8), 0);
  const totalPaid = filteredFines.filter((f) => f.status === 'PAGA').reduce((acc, f) => acc + f.fineAmount, 0);
  const totalOpen = filteredFines.filter((f) => f.status !== 'PAGA').reduce((acc, f) => acc + f.fineAmount, 0);
  const totalPoints = filteredFines.reduce((acc, f) => acc + f.points, 0);

  // Breakdown by Driver
  const driverSummary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; totalValue: number; points: number }>();
    filteredFines.forEach((f) => {
      const key = f.driverName?.trim() || 'Sem Condutor Identificado';
      const curr = map.get(key) || { name: key, count: 0, totalValue: 0, points: 0 };
      curr.count += 1;
      curr.totalValue += f.fineAmount;
      curr.points += f.points;
      map.set(key, curr);
    });
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredFines]);

  // Breakdown by Vehicle Plate
  const vehicleSummary = useMemo(() => {
    const map = new Map<string, { plate: string; model: string; count: number; totalValue: number }>();
    filteredFines.forEach((f) => {
      const p = f.plate.toUpperCase();
      const veh = vehicles.find((v) => v.plate.toUpperCase() === p);
      const curr = map.get(p) || {
        plate: p,
        model: veh?.brandModel || 'Veículo da Frota',
        count: 0,
        totalValue: 0,
      };
      curr.count += 1;
      curr.totalValue += f.fineAmount;
      map.set(p, curr);
    });
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredFines, vehicles]);

  const getReportTitle = () => {
    switch (reportType) {
      case 'POR_MOTORISTA':
        return 'Relatório de Multas por Motorista e Pontuação';
      case 'POR_VEICULO':
        return 'Relatório de Multas por Veículo da Frota';
      case 'FINANCEIRO':
        return 'Relatório Financeiro de Multas e Descontos SNE';
      default:
        return 'Relatório Geral Consolidado de Infrações de Trânsito';
    }
  };

  const getFilterSummaryText = () => {
    const parts: string[] = [];
    if (dateFrom || dateTo) parts.push(`Período: ${dateFrom || 'Início'} a ${dateTo || 'Hoje'}`);
    if (selectedPlate !== 'ALL') parts.push(`Placa: ${selectedPlate}`);
    if (selectedDriverId !== 'ALL') {
      const d = drivers.find((drv) => drv.id === selectedDriverId);
      if (d) parts.push(`Motorista: ${d.name}`);
    }
    if (statusFilter !== 'ALL') parts.push(`Status: ${statusFilter}`);
    if (authorityFilter !== 'ALL') parts.push(`Órgão: ${authorityFilter}`);
    return parts.length > 0 ? parts.join(' • ') : 'Todos os registros do período';
  };

  const handlePrintReport = () => {
    const payload = buildFinesReportPrintPayload(filteredFines, getReportTitle(), getFilterSummaryText());
    onOpenPrintModal(payload);
  };

  const handleDownloadPdfReport = () => {
    const payload = buildFinesReportPrintPayload(filteredFines, getReportTitle(), getFilterSummaryText());
    payload.onDownloadPdf();
  };

  return (
    <div id="fines-report-view" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileBarChart className="w-6 h-6 text-blue-600" />
            <span>Gerador de Relatórios de Multas</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Emissão de relatórios gerenciais e financeiros por período, motorista, veículo e status, com opção de impressão A4, PDF e Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintReport}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório (A4)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdfReport}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Relatório em PDF</span>
          </button>

          <button
            type="button"
            onClick={() => exportFinesToCsv(filteredFines, 'Relatorio_Gerencial_Multas')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Planilha (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Report Configuration & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'GERAL', label: 'Relatório Geral Analítico' },
                { id: 'POR_MOTORISTA', label: 'Por Motorista / Condutor' },
                { id: 'POR_VEICULO', label: 'Por Veículo / Placa' },
                { id: 'FINANCEIRO', label: 'Resumo Financeiro & SNE' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReportType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  reportType === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setSelectedDriverId('ALL');
              setSelectedPlate('ALL');
              setStatusFilter('ALL');
              setAuthorityFilter('ALL');
            }}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetar Filtros</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Data Inicial</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Data Final</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Motorista</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="ALL">Todos os Motoristas</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Placa do Veículo</label>
            <select
              value={selectedPlate}
              onChange={(e) => setSelectedPlate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="ALL">Todas as Placas</option>
              {availablePlates.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="ALL">Todos os Status</option>
              <option value="VENCIDA">Vencidas</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="EM_RECURSO">Em Recurso</option>
              <option value="PAGA">Pagas</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Órgão Autuador</label>
            <select
              value={authorityFilter}
              onChange={(e) => setAuthorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="ALL">Todos os Órgãos</option>
              <option value="DETRAN">DETRAN</option>
              <option value="PRF">PRF</option>
              <option value="DER">DER</option>
              <option value="DNIT">DNIT</option>
              <option value="PREFEITURA / CET">PREFEITURA / CET</option>
            </select>
          </div>
        </div>
      </div>

      {/* Executive Report Sheet */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 block">
              Controle Interno de Infrações de Trânsito • Relatório Oficial
            </span>
            <h3 className="text-lg font-black text-slate-900 uppercase">{getReportTitle()}</h3>
            <p className="text-xs text-slate-600">Critérios: {getFilterSummaryText()}</p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-600">
            <p>
              Data de Emissão: <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
            </p>
            <p>
              Termos de Folha Emitidos: <strong>{terms.length}</strong>
            </p>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Total de Autuações</span>
            <span className="text-xl font-black text-slate-900">{filteredFines.length}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Valor Total Bruto</span>
            <span className="text-xl font-black text-red-700 font-mono">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Com Desconto SNE (20%)</span>
            <span className="text-xl font-black text-emerald-700 font-mono">{formatCurrency(totalSne)}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Em Aberto / Vencido</span>
            <span className="text-xl font-black text-amber-700 font-mono">{formatCurrency(totalOpen)}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Quitado / Pontos</span>
            <span className="text-base font-black text-slate-900 font-mono">
              {formatCurrency(totalPaid)} ({totalPoints} pts)
            </span>
          </div>
        </div>

        {/* Grouped Summaries (By Driver & By Vehicle) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Consolidation by Driver */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Resumo por Motorista / Condutor</span>
              </span>
              <span>{driverSummary.length} condutor(es)</span>
            </div>
            <div className="divide-y divide-slate-200 max-h-56 overflow-y-auto text-xs">
              {driverSummary.length === 0 ? (
                <p className="p-4 text-center text-slate-500">Sem dados no período.</p>
              ) : (
                driverSummary.map((item) => (
                  <div key={item.name} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.count} multa(s) • {item.points} pontos na CNH
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(item.totalValue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Consolidation by Vehicle */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                <span>Resumo por Veículo (Placa)</span>
              </span>
              <span>{vehicleSummary.length} placa(s)</span>
            </div>
            <div className="divide-y divide-slate-200 max-h-56 overflow-y-auto text-xs">
              {vehicleSummary.length === 0 ? (
                <p className="p-4 text-center text-slate-500">Sem dados no período.</p>
              ) : (
                vehicleSummary.map((item) => (
                  <div key={item.plate} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 font-mono">
                        {item.plate} <span className="font-sans font-normal text-slate-600">— {item.model}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">{item.count} multa(s) registrada(s)</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(item.totalValue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detailed Analytical List */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-800">
            Listagem Analítica de Multas do Relatório ({filteredFines.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Nº AIT</th>
                  <th className="py-2.5 px-3">Placa</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Órgão</th>
                  <th className="py-2.5 px-3">Cód. / Infração</th>
                  <th className="py-2.5 px-3">Motorista</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredFines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Nenhuma multa encontrada para compor o relatório.
                    </td>
                  </tr>
                ) : (
                  filteredFines.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => onSelectFine(f)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{f.aitNumber}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{f.plate}</td>
                      <td className="py-2.5 px-3">{formatDate(f.infractionDate)}</td>
                      <td className="py-2.5 px-3">{f.issuingAuthority}</td>
                      <td className="py-2.5 px-3 max-w-xs truncate">
                        {f.infractionCode} — {f.infractionDescription}
                      </td>
                      <td className="py-2.5 px-3">{f.driverName || 'Não ident.'}</td>
                      <td className="py-2.5 px-3">{formatDate(f.dueDate)}</td>
                      <td className="py-2.5 px-3 font-bold">{f.status}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(f.fineAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
