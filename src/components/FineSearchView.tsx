import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Printer,
  Download,
  FileSpreadsheet,
  RotateCcw,
  FileText,
  MapPin,
  Eye,
  Calendar,
  Truck,
  User,
  DollarSign,
  SlidersHorizontal,
} from 'lucide-react';
import { TrafficFine, Vehicle, Driver } from '../types';
import { formatCurrency, formatDate, getDaysOverdue } from '../lib/formatters';
import {
  PrintableDocumentPayload,
  buildFineDetailPrintPayload,
  buildFinesReportPrintPayload,
  exportFinesToCsv,
} from '../lib/printService';

interface FineSearchViewProps {
  fines: TrafficFine[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onSelectFine: (fine: TrafficFine) => void;
  onViewFinePdf?: (fine: TrafficFine) => void;
  onGenerateTerm: (fine: TrafficFine) => void;
  onOpenPrintModal: (payload: PrintableDocumentPayload) => void;
  onOpenReportView?: () => void;
}

export const FineSearchView: React.FC<FineSearchViewProps> = ({
  fines,
  vehicles,
  drivers,
  onSelectFine,
  onViewFinePdf,
  onGenerateTerm,
  onOpenPrintModal,
  onOpenReportView,
}) => {
  // Dedicated Search Filters
  const [queryText, setQueryText] = useState('');
  const [plateFilter, setPlateFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [authorityFilter, setAuthorityFilter] = useState('ALL');
  const [doubledFilter, setDoubledFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'AMOUNT_DESC' | 'AMOUNT_ASC' | 'DUE_ASC' | 'PLATE_ASC'>('DATE_DESC');

  // Unique plates from vehicles + fines
  const availablePlates = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => set.add(v.plate.toUpperCase()));
    fines.forEach((f) => set.add(f.plate.toUpperCase()));
    return Array.from(set).sort();
  }, [vehicles, fines]);

  const handleClearFilters = () => {
    setQueryText('');
    setPlateFilter('ALL');
    setDriverFilter('ALL');
    setStatusFilter('ALL');
    setSeverityFilter('ALL');
    setAuthorityFilter('ALL');
    setDoubledFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('DATE_DESC');
  };

  const searchedFines = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const minVal = minAmount !== '' ? parseFloat(minAmount) : null;
    const maxVal = maxAmount !== '' ? parseFloat(maxAmount) : null;

    const filtered = fines.filter((fine) => {
      // Text search across all fields
      if (q) {
        const matchText =
          fine.aitNumber.toLowerCase().includes(q) ||
          fine.plate.toLowerCase().includes(q) ||
          fine.infractionCode.toLowerCase().includes(q) ||
          fine.infractionDescription.toLowerCase().includes(q) ||
          fine.infractionLocation.toLowerCase().includes(q) ||
          fine.city.toLowerCase().includes(q) ||
          fine.state.toLowerCase().includes(q) ||
          fine.issuingAuthority.toLowerCase().includes(q) ||
          (fine.driverName && fine.driverName.toLowerCase().includes(q));
        if (!matchText) return false;
      }

      // Plate filter
      if (plateFilter !== 'ALL' && fine.plate.toUpperCase() !== plateFilter) {
        return false;
      }

      // Driver filter
      if (driverFilter === 'UNASSIGNED') {
        if (fine.driverId || (fine.driverName && fine.driverName.trim() !== '')) return false;
      } else if (driverFilter !== 'ALL') {
        const matchedDriver = drivers.find((d) => d.id === driverFilter);
        const byId = fine.driverId === driverFilter;
        const byName =
          matchedDriver &&
          fine.driverName &&
          fine.driverName.toLowerCase() === matchedDriver.name.toLowerCase();
        if (!byId && !byName) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && fine.status !== statusFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'ALL' && fine.severity !== severityFilter) {
        return false;
      }

      // Authority filter
      if (authorityFilter !== 'ALL' && fine.issuingAuthority !== authorityFilter) {
        return false;
      }

      // Doubled / NIC filter
      const isDoubled = !!fine.isDoubledFine || (fine.multiplierFactor && fine.multiplierFactor > 1);
      if (doubledFilter === 'DOUBLED' && !isDoubled) return false;
      if (doubledFilter === 'NORMAL' && isDoubled) return false;

      // Date range filter
      const infDateOnly = fine.infractionDate.slice(0, 10);
      if (dateFrom && infDateOnly < dateFrom) return false;
      if (dateTo && infDateOnly > dateTo) return false;

      // Amount range filter
      if (minVal !== null && !isNaN(minVal) && fine.fineAmount < minVal) return false;
      if (maxVal !== null && !isNaN(maxVal) && fine.fineAmount > maxVal) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'AMOUNT_DESC':
          return b.fineAmount - a.fineAmount;
        case 'AMOUNT_ASC':
          return a.fineAmount - b.fineAmount;
        case 'DUE_ASC':
          return a.dueDate.localeCompare(b.dueDate);
        case 'PLATE_ASC':
          return a.plate.localeCompare(b.plate);
        case 'DATE_DESC':
        default:
          return b.infractionDate.localeCompare(a.infractionDate);
      }
    });
  }, [
    fines,
    queryText,
    plateFilter,
    driverFilter,
    statusFilter,
    severityFilter,
    authorityFilter,
    doubledFilter,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    sortBy,
    drivers,
  ]);

  const totalAmount = searchedFines.reduce((acc, f) => acc + f.fineAmount, 0);
  const totalSneAmount = searchedFines.reduce((acc, f) => acc + (f.discountAmount || f.fineAmount * 0.8), 0);
  const totalPoints = searchedFines.reduce((acc, f) => acc + f.points, 0);

  const buildFilterDescription = () => {
    const parts: string[] = [];
    if (queryText.trim()) parts.push(`Termo: "${queryText.trim()}"`);
    if (plateFilter !== 'ALL') parts.push(`Placa: ${plateFilter}`);
    if (statusFilter !== 'ALL') parts.push(`Status: ${statusFilter}`);
    if (severityFilter !== 'ALL') parts.push(`Gravidade: ${severityFilter}`);
    if (authorityFilter !== 'ALL') parts.push(`Órgão: ${authorityFilter}`);
    if (dateFrom || dateTo) parts.push(`Período: ${dateFrom || 'Início'} até ${dateTo || 'Hoje'}`);
    return parts.length > 0 ? parts.join(' • ') : 'Todas as multas pesquisadas';
  };

  const handlePrintSearchResults = () => {
    const payload = buildFinesReportPrintPayload(
      searchedFines,
      'Relatório de Pesquisa de Multas de Trânsito',
      buildFilterDescription()
    );
    onOpenPrintModal(payload);
  };

  const handleDownloadSearchPdf = () => {
    const payload = buildFinesReportPrintPayload(
      searchedFines,
      'Relatório de Pesquisa de Multas de Trânsito',
      buildFilterDescription()
    );
    payload.onDownloadPdf();
  };

  return (
    <div id="fine-search-view" className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Search className="w-6 h-6 text-blue-600" />
            <span>Central de Pesquisa de Multas</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Tela dedicada para consulta avançada de infrações por AIT, placa, motorista, período, órgão, gravidade e valores
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintSearchResults}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Pesquisa ({searchedFines.length})</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSearchPdf}
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Baixar PDF</span>
          </button>

          <button
            type="button"
            onClick={() => exportFinesToCsv(searchedFines, 'Pesquisa_Multas')}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.CSV)</span>
          </button>

          {onOpenReportView && (
            <button
              type="button"
              onClick={onOpenReportView}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Relatórios Gerenciais</span>
            </button>
          )}
        </div>
      </div>

      {/* Comprehensive Search & Multi-Filter Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Filtros Combinados de Pesquisa</span>
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar Todos os Filtros</span>
          </button>
        </div>

        {/* Main Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Digite Nº do AIT, Placa, Nome do Motorista, Código CTB (ex: 7455-0), Local/Rodovia ou Cidade..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Filter Grid Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Placa do Veículo</label>
            <select
              value={plateFilter}
              onChange={(e) => setPlateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="ALL">Todas as Placas ({availablePlates.length})</option>
              {availablePlates.map((p) => (
                <option key={p} value={p}>
                  Placa {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Motorista / Condutor</label>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="ALL">Todos os Motoristas</option>
              <option value="UNASSIGNED">Sem Condutor Identificado</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (CNH {d.cnhNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status da Multa</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="ALL">Todos os Status</option>
              <option value="VENCIDA">Vencidas (Em Atraso)</option>
              <option value="PENDENTE">Pendentes (A Vencer)</option>
              <option value="EM_RECURSO">Em Recurso JARI/CETRAN</option>
              <option value="PAGA">Multas Quitadas / Pagas</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Gravidade CTB</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="ALL">Todas as Gravidades</option>
              <option value="GRAVISSIMA">Gravíssima (7 pontos)</option>
              <option value="GRAVE">Grave (5 pontos)</option>
              <option value="MEDIA">Média (4 pontos)</option>
              <option value="LEVE">Leve (3 pontos)</option>
            </select>
          </div>
        </div>

        {/* Filter Grid Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-1">
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

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo (NIC / Simples)</label>
            <select
              value={doubledFilter}
              onChange={(e) => setDoubledFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="ALL">Todas (1x e 2x)</option>
              <option value="DOUBLED">Multas Dobradas (NIC 2x)</option>
              <option value="NORMAL">Multas Simples (1x)</option>
            </select>
          </div>

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
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Valor Mín. / Máx. (R$)</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="Mín"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
              <input
                type="number"
                placeholder="Máx"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Ordenar Por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            >
              <option value="DATE_DESC">Data Mais Recente</option>
              <option value="AMOUNT_DESC">Maior Valor (R$)</option>
              <option value="AMOUNT_ASC">Menor Valor (R$)</option>
              <option value="DUE_ASC">Vencimento Mais Próximo</option>
              <option value="PLATE_ASC">Placa (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Summary Metrics of Search Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 block">Multas Encontradas</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{searchedFines.length}</p>
          <span className="text-[11px] text-slate-500">de {fines.length} cadastradas no total</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 block">Soma Valor Integral</span>
          <p className="text-2xl font-black text-red-600 font-mono mt-1">{formatCurrency(totalAmount)}</p>
          <span className="text-[11px] text-slate-500">Total bruto das multas filtradas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 block">Soma com Desconto SNE (20%)</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">{formatCurrency(totalSneAmount)}</p>
          <span className="text-[11px] text-emerald-700">
            Economia potencial de {formatCurrency(totalAmount - totalSneAmount)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 block">Pontuação Somada</span>
          <p className="text-2xl font-black text-blue-700 font-mono mt-1">{totalPoints} pts</p>
          <span className="text-[11px] text-slate-500">Pontos acumulados na seleção</span>
        </div>
      </div>

      {/* Search Results Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Resultados da Pesquisa ({searchedFines.length} registro{searchedFines.length === 1 ? '' : 's'})
          </h3>
          <span className="text-xs text-slate-500">Clique em qualquer linha para abrir a ficha completa</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase font-bold text-slate-500 bg-slate-100/80 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Nº AIT / Órgão</th>
                <th className="py-3.5 px-3">Placa</th>
                <th className="py-3.5 px-3">Data / Local</th>
                <th className="py-3.5 px-3">Infração CTB</th>
                <th className="py-3.5 px-3">Motorista</th>
                <th className="py-3.5 px-3">Vencimento</th>
                <th className="py-3.5 px-3">Valor</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Ações / Impressão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {searchedFines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Nenhuma multa encontrada para os critérios pesquisados.
                  </td>
                </tr>
              ) : (
                searchedFines.map((fine) => {
                  const daysOverdue = getDaysOverdue(fine.dueDate);
                  const isOverdue = fine.status === 'VENCIDA' || (fine.status === 'PENDENTE' && daysOverdue > 0);
                  const isDoubled = !!fine.isDoubledFine || (fine.multiplierFactor && fine.multiplierFactor > 1);

                  return (
                    <tr
                      key={fine.id}
                      onClick={() => onSelectFine(fine)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{fine.aitNumber}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {fine.issuingAuthority} {isDoubled ? '• NIC 2x' : ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-blue-700 text-xs">{fine.plate}</span>
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="font-medium text-slate-900">{formatDate(fine.infractionDate)}</p>
                        <p className="text-[11px] text-slate-600 truncate" title={fine.infractionLocation}>
                          {fine.infractionLocation} ({fine.city}/{fine.state})
                        </p>
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <span className="font-mono font-bold text-red-700 text-[11px]">
                          Cód. {fine.infractionCode}
                        </span>{' '}
                        <span className="text-[10px] text-slate-500">
                          • {fine.severity} ({fine.points} pts)
                        </span>
                        <p className="text-[11px] text-slate-700 line-clamp-1">{fine.infractionDescription}</p>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-slate-800 font-medium">{fine.driverName || 'Não identificado'}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`font-semibold ${isOverdue && fine.status !== 'PAGA' ? 'text-red-600' : 'text-slate-800'}`}>
                          {formatDate(fine.dueDate)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-slate-900 block">
                          {formatCurrency(fine.fineAmount)}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">
                          SNE: {formatCurrency(fine.discountAmount || fine.fineAmount * 0.8)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[11px] font-bold ${
                            fine.status === 'PAGA'
                              ? 'text-emerald-700'
                              : fine.status === 'VENCIDA'
                              ? 'text-red-700'
                              : fine.status === 'EM_RECURSO'
                              ? 'text-purple-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {fine.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {onViewFinePdf && (
                            <button
                              type="button"
                              onClick={() => onViewFinePdf(fine)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Visualizar PDF Importado desta Multa"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver PDF</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenPrintModal(buildFineDetailPrintPayload(fine))}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Imprimir Ficha do Auto de Infração"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Imprimir AIT</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onGenerateTerm(fine)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Emitir / Imprimir Termo ou Recibo desta Multa"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Termo/Recibo</span>
                          </button>
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
