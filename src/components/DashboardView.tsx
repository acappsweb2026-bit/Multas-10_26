import React from 'react';
import {
  AlertTriangle,
  FileWarning,
  CheckCircle2,
  Clock,
  TrendingUp,
  Truck,
  Users,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Flame,
  Award,
  DollarSign,
  Search,
  FileBarChart,
} from 'lucide-react';
import { TrafficFine, Driver, Vehicle } from '../types';
import { formatCurrency, formatDate, getDaysOverdue } from '../lib/formatters';
import { ActiveTab } from './Sidebar';

interface DashboardViewProps {
  fines: TrafficFine[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onSelectFine: (fine: TrafficFine) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onPayFine: (fineId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  fines,
  drivers,
  vehicles,
  onSelectFine,
  onNavigateTab,
  onPayFine,
}) => {
  // 1. Calculations & Metrics
  const totalFines = fines.length;
  const overdueFines = fines.filter(
    (f) => f.status === 'VENCIDA' || (f.status === 'PENDENTE' && getDaysOverdue(f.dueDate) > 0)
  );
  const pendingFines = fines.filter(
    (f) => f.status === 'PENDENTE' && getDaysOverdue(f.dueDate) === 0
  );
  const paidFines = fines.filter((f) => f.status === 'PAGA');
  const appealFines = fines.filter((f) => f.status === 'EM_RECURSO');

  const totalValueOverdue = overdueFines.reduce((acc, f) => acc + f.fineAmount, 0);
  const totalValuePending = pendingFines.reduce((acc, f) => acc + f.fineAmount, 0);
  const totalValuePaid = paidFines.reduce((acc, f) => acc + f.fineAmount, 0);

  // 2. Multa mais aplicada (Grouping by infractionCode)
  const codeStatsMap: Record<string, { code: string; desc: string; count: number; totalAmount: number; severity: string }> = {};
  fines.forEach((fine) => {
    if (!codeStatsMap[fine.infractionCode]) {
      codeStatsMap[fine.infractionCode] = {
        code: fine.infractionCode,
        desc: fine.infractionDescription,
        count: 0,
        totalAmount: 0,
        severity: fine.severity,
      };
    }
    codeStatsMap[fine.infractionCode].count += 1;
    codeStatsMap[fine.infractionCode].totalAmount += fine.fineAmount;
  });
  const mostAppliedFines = Object.values(codeStatsMap).sort((a, b) => b.count - a.count);

  // 3. Motorista com mais ocorrencias de multas
  const driverStatsMap: Record<string, { driver: Driver; fineCount: number; totalAmount: number; points: number }> = {};
  // Initialize with all drivers
  drivers.forEach((d) => {
    driverStatsMap[d.id] = { driver: d, fineCount: 0, totalAmount: 0, points: d.currentPoints };
  });
  fines.forEach((fine) => {
    if (fine.driverId && driverStatsMap[fine.driverId]) {
      driverStatsMap[fine.driverId].fineCount += 1;
      driverStatsMap[fine.driverId].totalAmount += fine.fineAmount;
    }
  });
  const topInfringingDrivers = Object.values(driverStatsMap).sort((a, b) => b.fineCount - a.fineCount || b.points - a.points);

  // 4. Veiculo com mais multas
  const vehicleStatsMap: Record<string, { vehicle: Vehicle; fineCount: number; totalAmount: number }> = {};
  vehicles.forEach((v) => {
    vehicleStatsMap[v.plate] = { vehicle: v, fineCount: 0, totalAmount: 0 };
  });
  fines.forEach((fine) => {
    const cleanPlate = fine.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (vehicleStatsMap[cleanPlate]) {
      vehicleStatsMap[cleanPlate].fineCount += 1;
      vehicleStatsMap[cleanPlate].totalAmount += fine.fineAmount;
    }
  });
  const topInfringingVehicles = Object.values(vehicleStatsMap).sort((a, b) => b.fineCount - a.fineCount);

  // Severity Distribution
  const gravissimaCount = fines.filter((f) => f.severity === 'GRAVISSIMA').length;
  const graveCount = fines.filter((f) => f.severity === 'GRAVE').length;
  const mediaCount = fines.filter((f) => f.severity === 'MEDIA').length;
  const leveCount = fines.filter((f) => f.severity === 'LEVE').length;

  return (
    <div id="dashboard-view" className="space-y-6 animate-fade-in">
      {/* Top Banner with Fleet Quick Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Visão Geral da Frota & Multas</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              Tempo Real
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitoramento de autos de infração, débitos vencidos e controle de pontuação CNH
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('fine-search')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>Pesquisar Multas</span>
          </button>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileBarChart className="w-3.5 h-3.5" />
            <span>Gerar Relatório de Multas</span>
          </button>
          <button
            onClick={() => onNavigateTab('detran')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Consultar Detran</span>
          </button>
          <button
            onClick={() => onNavigateTab('fines')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Ver Todos os Autos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Multas Vencidas - CRITICAL CARD */}
        <div
          id="kpi-overdue-fines"
          className="bg-white p-5 rounded-2xl border-2 border-red-200 shadow-xs relative overflow-hidden group hover:border-red-400 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
              Multas Vencidas
            </span>
            <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
              {overdueFines.length} autos
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {formatCurrency(totalValueOverdue)}
          </p>
          <p className="text-[11px] text-red-600 mt-2 flex items-center justify-between font-medium">
            <span>Incidência de juros e bloqueio</span>
            <span className="font-bold">{Math.round((overdueFines.length / (totalFines || 1)) * 100)}% da frota</span>
          </p>
        </div>

        {/* Multas Pendentes (A Vencer) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Multas a Vencer
            </span>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
              {pendingFines.length} autos
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {formatCurrency(totalValuePending)}
          </p>
          <p className="text-[11px] text-emerald-700 mt-2 font-medium">
            Economize até 20% pagando via SNE
          </p>
        </div>

        {/* Multas Pagas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Multas Quitadas
            </span>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              {paidFines.length} pagas
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {formatCurrency(totalValuePaid)}
          </p>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            {appealFines.length > 0 ? `${appealFines.length} em recurso JARI` : 'Regularizadas com sucesso'}
          </p>
        </div>

        {/* Total Geral de Autos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <FileWarning className="w-4 h-4 text-blue-600" />
              Total de Infrações
            </span>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              {totalFines} total
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {formatCurrency(totalValueOverdue + totalValuePending + totalValuePaid)}
          </p>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            {vehicles.length} veículos • {drivers.length} motoristas
          </p>
        </div>
      </div>

      {/* Main 3 Rankings Section (Multa mais aplicada, Motorista com mais multas, Veículo com mais multas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Multa mais aplicada */}
        <div
          id="ranking-most-applied-fines"
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Multa Mais Aplicada</h3>
                  <p className="text-[10px] text-slate-500">Infrações de maior incidência</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                Ranking CTB
              </span>
            </div>

            <div className="space-y-3">
              {mostAppliedFines.slice(0, 4).map((item, idx) => (
                <div
                  key={item.code}
                  className={`p-3 rounded-xl border transition-all ${
                    idx === 0
                      ? 'bg-red-50/40 border-red-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-800 shadow-2xs">
                        #{idx + 1}
                      </span>
                      <span className="font-mono font-bold text-blue-700">Cód. {item.code}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                        {item.severity}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono">{item.count} autuações</span>
                  </div>

                  <p className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed mb-2 font-medium">
                    {item.desc}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-200">
                    <span>Acumulado: <strong className="text-slate-900">{formatCurrency(item.totalAmount)}</strong></span>
                    <span>{Math.round((item.count / (totalFines || 1)) * 100)}% das multas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('fines')}
            className="mt-4 w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <span>Ver todas as infrações</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* 2. Motorista com mais ocorrências de multas */}
        <div
          id="ranking-top-infringing-drivers"
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Motoristas com Mais Ocorrências</h3>
                  <p className="text-[10px] text-slate-500">Acompanhamento de condutores</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Pontos CNH
              </span>
            </div>

            <div className="space-y-3">
              {topInfringingDrivers.slice(0, 4).map((item, idx) => (
                <div
                  key={item.driver.id}
                  className={`p-3 rounded-xl border transition-all ${
                    idx === 0 && item.fineCount > 0
                      ? 'bg-amber-50/40 border-amber-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-800 shadow-2xs">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{item.driver.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.driver.status === 'SUSPENSA'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : item.driver.status === 'ALERTA'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {item.driver.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1.5">
                    <span>CNH Cat. <strong className="text-slate-900">{item.driver.cnhCategory}</strong></span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {item.fineCount} multas ({item.points} pts)
                    </span>
                  </div>

                  {/* Visual Points Progress Bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.points >= 40 ? 'bg-red-500' : item.points >= 20 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (item.points / 40) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('drivers')}
            className="mt-4 w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <span>Gerenciar todos os motoristas</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* 3. Veículo com mais multas */}
        <div
          id="ranking-top-infringing-vehicles"
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Veículos com Mais Multas</h3>
                  <p className="text-[10px] text-slate-500">Placas e débitos acumulados</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                Frota Pro
              </span>
            </div>

            <div className="space-y-3">
              {topInfringingVehicles.slice(0, 4).map((item, idx) => (
                <div
                  key={item.vehicle.id}
                  className={`p-3 rounded-xl border transition-all ${
                    idx === 0 && item.fineCount > 0
                      ? 'bg-blue-50/40 border-blue-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-800 shadow-2xs">
                        #{idx + 1}
                      </span>
                      {/* Styled Mercosul Plate */}
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 font-mono font-bold text-blue-700 text-xs">
                        {item.vehicle.plate}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{item.fineCount} multas</span>
                  </div>

                  <p className="text-[11px] text-slate-800 line-clamp-1 mb-1 font-semibold">
                    {item.vehicle.brandModel}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                    <span className="font-medium uppercase tracking-wider">{item.vehicle.vehicleType}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(item.totalAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('vehicles')}
            className="mt-4 w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <span>Gerenciar todos os veículos</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Dedicated Section: Status de Multas Vencidas */}
      <div id="section-overdue-fines-status" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Painel de Controle: Status de Multas Vencidas</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Autos com prazo expirado sujeitos a restrição no licenciamento do Detran
            </p>
          </div>

          <span className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            Total Vencido: {formatCurrency(totalValueOverdue)}
          </span>
        </div>

        {overdueFines.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-900">Nenhuma Multa Vencida!</h4>
            <p className="text-xs text-slate-500 mt-1">Todos os autos da frota estão rigorosamente em dia.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase font-bold text-slate-600 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Auto (AIT)</th>
                  <th className="py-3 px-3">Placa</th>
                  <th className="py-3 px-3">Infração</th>
                  <th className="py-3 px-3">Vencimento</th>
                  <th className="py-3 px-3">Atraso</th>
                  <th className="py-3 px-3">Valor Integral</th>
                  <th className="py-3 px-3">Condutor</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueFines.map((fine) => {
                  const days = getDaysOverdue(fine.dueDate);
                  return (
                    <tr
                      key={fine.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => onSelectFine(fine)}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:text-blue-600">
                        {fine.aitNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 font-mono font-bold text-[11px]">
                          {fine.plate}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-700" title={fine.infractionDescription}>
                        <span className="font-mono text-red-600 font-semibold mr-1">{fine.infractionCode}</span>
                        {fine.infractionDescription}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600">{formatDate(fine.dueDate)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold text-[10px]">
                          {days} dias atrasada
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {formatCurrency(fine.fineAmount)}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{fine.driverName || 'Não indicado'}</td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onPayFine(fine.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs transition-colors cursor-pointer"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Severity Breakdown Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <span>Distribuição de Infrações por Gravidade</span>
          <span className="text-xs text-slate-500 font-normal">(CTB - Código de Trânsito Brasileiro)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-200">
            <div className="flex items-center justify-between text-xs text-red-800 font-bold mb-1">
              <span>Gravíssima (7 pts)</span>
              <span className="text-sm">{gravissimaCount}</span>
            </div>
            <p className="text-[11px] text-red-600">Risco alto de suspensão</p>
          </div>

          <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between text-xs text-amber-800 font-bold mb-1">
              <span>Grave (5 pts)</span>
              <span className="text-sm">{graveCount}</span>
            </div>
            <p className="text-[11px] text-amber-600">Penalidade severa</p>
          </div>

          <div className="p-3.5 bg-yellow-50/70 rounded-xl border border-yellow-200">
            <div className="flex items-center justify-between text-xs text-yellow-800 font-bold mb-1">
              <span>Média (4 pts)</span>
              <span className="text-sm">{mediaCount}</span>
            </div>
            <p className="text-[11px] text-yellow-700">Excesso de velocidade até 20%</p>
          </div>

          <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between text-xs text-blue-800 font-bold mb-1">
              <span>Leve (3 pts)</span>
              <span className="text-sm">{leveCount}</span>
            </div>
            <p className="text-[11px] text-blue-600">Advertências por escrito</p>
          </div>
        </div>
      </div>
    </div>
  );
};
