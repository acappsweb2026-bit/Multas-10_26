import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Camera,
  Sparkles,
  Search,
  Filter,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  ExternalLink,
  ShieldCheck,
  Fuel,
  FileWarning,
  Eye,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { Vehicle, TrafficFine, Driver, UserSession } from '../types';
import { formatCurrency } from '../lib/formatters';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  fines: TrafficFine[];
  drivers: Driver[];
  currentUser?: UserSession;
  onOpenNewVehicleModal: () => void;
  onOpenScanCrlvModal?: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onConsultPlateInDetran: (plate: string) => void;
  onSelectFine: (fine: TrafficFine) => void;
  onViewFinePdf?: (fine: TrafficFine) => void;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({
  vehicles,
  fines,
  drivers,
  currentUser,
  onOpenNewVehicleModal,
  onEditVehicle,
  onDeleteVehicle,
  onConsultPlateInDetran,
  onSelectFine,
  onViewFinePdf,
}) => {
  const isPlogUser = currentUser?.username?.toLowerCase() === 'plog';
  const [viewMode, setViewMode] = useState<'rows' | 'cards'>('rows');
  const [searchTerm, setSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState<'ALL' | 'PLOG' | 'FROTA_GERAL'>(
    isPlogUser ? 'PLOG' : 'ALL'
  );
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedVehicleForFines, setSelectedVehicleForFines] = useState<Vehicle | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Helper to determine if vehicle belongs to P-LOG
  const isVehiclePlog = (v: Vehicle): boolean => {
    if (v.isPlogVehicle) return true;
    const owner = (v.ownerName || '').toLowerCase();
    const compName = (v.companyName || '').toLowerCase();
    const cnpj = (v.ownerCnpjCpf || v.companyCnpj || '').replace(/\D/g, '');
    if (owner.includes('p-log') || compName.includes('p-log') || cnpj.includes('14285932')) {
      return true;
    }
    // Check if assigned driver is a P-LOG driver
    if (v.assignedDriverId) {
      const drv = drivers.find((d) => d.id === v.assignedDriverId);
      if (drv && (drv.isPlogDriver || drv.operationType === 'PLOG')) return true;
    }
    return false;
  };

  const totalPlogVehicles = vehicles.filter(isVehiclePlog).length;
  const totalFrotaVehicles = vehicles.filter((v) => !isVehiclePlog(v)).length;

  const getVehicleFines = (plate: string) => {
    const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return fines.filter((f) => f.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate);
  };

  const getDriverForVehicle = (driverId?: string) => {
    if (!driverId) return null;
    return drivers.find((d) => d.id === driverId);
  };

  const filteredVehicles = vehicles.filter((v) => {
    const isPlog = isVehiclePlog(v);

    // Strict isolation for PLOG user
    if (isPlogUser && !isPlog) {
      return false;
    }

    const matchesOperation =
      operationFilter === 'ALL' ||
      (operationFilter === 'PLOG' && isPlog) ||
      (operationFilter === 'FROTA_GERAL' && !isPlog);

    const matchesSearch =
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brandModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.renavam.includes(searchTerm) ||
      v.chassis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.companyName && v.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || v.vehicleType === typeFilter;

    return matchesOperation && matchesSearch && matchesType;
  });

  return (
    <div id="vehicles-view" className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-600" />
            <span>Cadastro de Veículos da Frota</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de caminhões, cavalos mecânicos e carretas com controle de débitos e licenciamento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-new-vehicle-top"
            type="button"
            onClick={onOpenNewVehicleModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Veículo</span>
          </button>
        </div>
      </div>

      {/* Segmented Filter Bar: Todos vs Veículos P-LOG vs Frota Geral */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isPlogUser && (
            <button
              type="button"
              onClick={() => setOperationFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                operationFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Todos os Veículos ({vehicles.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setOperationFilter('PLOG')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              operationFilter === 'PLOG'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>📦 Veículos P-LOG ({totalPlogVehicles})</span>
          </button>

          {!isPlogUser && (
            <button
              type="button"
              onClick={() => setOperationFilter('FROTA_GERAL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                operationFilter === 'FROTA_GERAL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>🚚 Frota Geral ({totalFrotaVehicles})</span>
            </button>
          )}
        </div>

        {isPlogUser ? (
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            Sessão P-LOG: Exibindo apenas veículos autorizados da Operação P-LOG
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-slate-500">
            Empresa Ativa: {currentUser?.companyName || 'Matriz Gestão'}
          </span>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por placa, modelo, renavam ou chassi..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Toggle Linha / Cards */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('rows')}
              title="Exibição em Linha (Tabela)"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'rows'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Em Linhas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Exibição em Cards (Containers)"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Containers</span>
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos os Tipos de Veículo</option>
            <option value="Toco">Toco</option>
            <option value="Truck">Truck</option>
            <option value="Bitruck">Bitruck</option>
            <option value="3/4">3/4 (Três Quartos)</option>
            <option value="Van">Van / Furgão</option>
            <option value="Utilitário">Utilitário / Pickup</option>
            <option value="Cavalo Mecânico">Cavalo Mecânico</option>
            <option value="Caminhão">Caminhão</option>
            <option value="Carreta">Carreta / Reboque</option>
            <option value="Automóvel">Automóvel</option>
            <option value="Ônibus">Ônibus</option>
          </select>
        </div>
      </div>

      {/* RENDER VIEW: LINHAS (TABELA) vs CONTAINERS (CARDS) */}
      {viewMode === 'rows' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Veículos Cadastrados na Frota ({filteredVehicles.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Listagem em linha • Consultas Detran/Gov.br, condutores vinculados e débitos de infração
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase font-bold text-slate-600 bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4"># / Placa</th>
                  <th className="py-3.5 px-3">Marca / Modelo & Tipo</th>
                  <th className="py-3.5 px-3">RENAVAM / Chassi</th>
                  <th className="py-3.5 px-3">Combustível / Registro</th>
                  <th className="py-3.5 px-3">Motorista Titular</th>
                  <th className="py-3.5 px-3">Proprietário / Empresa</th>
                  <th className="py-3.5 px-3">Licenciamento</th>
                  <th className="py-3.5 px-3">Multas & Débitos</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      Nenhum veículo encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle, index) => {
                    const vehicleFines = getVehicleFines(vehicle.plate);
                    const totalFinesAmt = vehicleFines.reduce((acc, f) => acc + f.fineAmount, 0);
                    const overdueCount = vehicleFines.filter((f) => f.status === 'VENCIDA').length;
                    const assignedDriver = getDriverForVehicle(vehicle.assignedDriverId);
                    const isPlog = isVehiclePlog(vehicle);

                    return (
                      <tr
                        key={vehicle.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* 1. Placa Mercosul */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-mono text-slate-400 w-5">
                              {index + 1}.
                            </span>
                            <div className="rounded border-2 border-blue-600 bg-white overflow-hidden shadow-2xs shrink-0 w-24">
                              <div className="bg-blue-700 text-white text-[7px] font-bold text-center py-0.2 tracking-wider uppercase flex items-center justify-center gap-1">
                                <span>BRASIL</span>
                              </div>
                              <div className="text-slate-900 font-mono font-black text-xs text-center py-0.5 tracking-wider">
                                {vehicle.plate}
                              </div>
                            </div>
                            {isPlog ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                                P-LOG
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                GERAL
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Marca / Modelo & Tipo */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {vehicle.brandModel}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {vehicle.vehicleType} • {vehicle.yearFabMod} • {vehicle.color}
                          </p>
                        </td>

                        {/* 3. RENAVAM / Chassi */}
                        <td className="py-3 px-3">
                          <p className="font-mono font-bold text-slate-800 text-xs">
                            {vehicle.renavam}
                          </p>
                          <p className="font-mono text-[10px] text-slate-500 truncate max-w-[130px]" title={vehicle.chassis}>
                            {vehicle.chassis}
                          </p>
                        </td>

                        {/* 4. Combustível / Registro */}
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-800 text-[11px]">
                            {vehicle.fuel}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {vehicle.cityUf}
                          </p>
                        </td>

                        {/* 5. Motorista Titular */}
                        <td className="py-3 px-3">
                          {assignedDriver ? (
                            <div>
                              <p className="font-semibold text-slate-900">{assignedDriver.name}</p>
                              <p className="text-[10px] font-mono text-slate-500">CNH: {assignedDriver.cnhNumber}</p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sem motorista fixo</span>
                          )}
                        </td>

                        {/* 6. Proprietário / Empresa */}
                        <td className="py-3 px-3 max-w-[160px]">
                          <p className="font-semibold text-slate-800 truncate" title={vehicle.ownerName}>
                            {vehicle.ownerName || vehicle.companyName || 'Matriz Gestão'}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 truncate">
                            {vehicle.ownerCnpjCpf || vehicle.companyCnpj || '—'}
                          </p>
                        </td>

                        {/* 7. Licenciamento */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              vehicle.licensingStatus === 'EM_DIA'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {vehicle.licensingStatus === 'EM_DIA' ? 'Em Dia' : 'Restrição / Vencido'}
                          </span>
                        </td>

                        {/* 8. Multas & Débitos */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">
                              {formatCurrency(totalFinesAmt)}
                            </span>
                            {overdueCount > 0 && (
                              <span className="px-1 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-bold shrink-0">
                                {overdueCount} venc.
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {vehicleFines.length} autuaç{vehicleFines.length === 1 ? 'ão' : 'ões'}
                          </span>
                        </td>

                        {/* 9. Ações */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onConsultPlateInDetran(vehicle.plate)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Consultar e Puxar Multas no Detran/Gov.br"
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Puxar Multas</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedVehicleForFines(vehicle)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Ver multas desta placa"
                            >
                              <FileWarning className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onEditVehicle(vehicle)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Editar Veículo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {confirmDeleteId === vehicle.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteVehicle(vehicle.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Excluir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(vehicle.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remover Veículo"
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
      ) : (
        /* Vehicle Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((vehicle) => {
          const vehicleFines = getVehicleFines(vehicle.plate);
          const totalFinesAmt = vehicleFines.reduce((acc, f) => acc + f.fineAmount, 0);
          const overdueCount = vehicleFines.filter((f) => f.status === 'VENCIDA').length;
          const assignedDriver = getDriverForVehicle(vehicle.assignedDriverId);

          return (
            <div
              key={vehicle.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div>
                {/* Header: Placa Mercosul & Licenciamento */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  {/* Styled Mercosul Plate */}
                  <div className="rounded-lg border-2 border-blue-600 bg-white shadow-2xs overflow-hidden w-28">
                    <div className="bg-blue-700 text-white text-[8px] font-bold text-center py-0.5 tracking-wider uppercase flex items-center justify-center gap-1">
                      <span>BRASIL</span>
                    </div>
                    <div className="text-slate-900 font-mono font-black text-sm text-center py-0.5 tracking-wider">
                      {vehicle.plate}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      vehicle.licensingStatus === 'EM_DIA'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    Licenc. {vehicle.licensingStatus === 'EM_DIA' ? 'Em Dia' : 'Atrasado'}
                  </span>
                </div>

                {/* Model and Specs */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {vehicle.brandModel}
                  </h3>
                  {isVehiclePlog(vehicle) ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      📦 P-LOG
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      🚚 Frota Geral
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  {vehicle.vehicleType} • {vehicle.yearFabMod} • {vehicle.color}
                </p>

                {/* CRLV Specs Box */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs mb-3 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">RENAVAM:</span>
                    <span className="text-slate-900 font-mono font-bold">{vehicle.renavam}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chassi:</span>
                    <span className="text-slate-700 font-mono text-[11px]">{vehicle.chassis}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Combustível:</span>
                    <span className="text-slate-800 font-medium">{vehicle.fuel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Registro:</span>
                    <span className="text-slate-800 font-medium">{vehicle.cityUf}</span>
                  </div>
                </div>

                {/* Assigned Driver */}
                <div className="text-[11px] text-slate-600 mb-3">
                  <span>Motorista Titular: </span>
                  {assignedDriver ? (
                    <strong className="text-slate-900 font-semibold">{assignedDriver.name}</strong>
                  ) : (
                    <span className="text-slate-400 italic">Nenhum motorista fixo</span>
                  )}
                </div>

                {/* Fines Metric Bar */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <FileWarning className="w-4 h-4 text-amber-600" />
                    <span className="text-slate-700 font-semibold">{vehicleFines.length} multas</span>
                    {overdueCount > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                        {overdueCount} vencida
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(totalFinesAmt)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
                <button
                  onClick={() => onConsultPlateInDetran(vehicle.plate)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Consultar Detran</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedVehicleForFines(vehicle)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Ver Multas da Placa"
                  >
                    <FileWarning className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditVehicle(vehicle)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Editar Veículo"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {confirmDeleteId === vehicle.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteVehicle(vehicle.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold cursor-pointer"
                      >
                        Excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(vehicle.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remover Veículo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal for viewing fines for a specific vehicle */}
      {selectedVehicleForFines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl text-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Infrações da Placa: {selectedVehicleForFines.plate}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedVehicleForFines.brandModel} • Renavam: {selectedVehicleForFines.renavam}
                </p>
              </div>
              <button
                onClick={() => setSelectedVehicleForFines(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {getVehicleFines(selectedVehicleForFines.plate).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nenhuma multa registrada para este veículo.
              </p>
            ) : (
              <div className="space-y-3">
                {getVehicleFines(selectedVehicleForFines.plate).map((fine) => (
                  <div
                    key={fine.id}
                    onClick={() => {
                      setSelectedVehicleForFines(null);
                      onSelectFine(fine);
                    }}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-slate-900 text-xs">{fine.aitNumber}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                            fine.status === 'VENCIDA'
                              ? 'bg-red-100 text-red-700'
                              : fine.status === 'PAGA'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {fine.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 line-clamp-1">{fine.infractionDescription}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Local: {fine.infractionLocation}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {onViewFinePdf && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVehicleForFines(null);
                            onViewFinePdf(fine);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver PDF</span>
                        </button>
                      )}
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        R$ {fine.fineAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
