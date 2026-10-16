import React, { useState } from 'react';
import {
  Users,
  Plus,
  Sparkles,
  Search,
  CreditCard,
  Calendar,
  Trash2,
  Edit2,
  Phone,
  Mail,
  Truck,
  FileWarning,
  FileText,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { Driver, TrafficFine, Vehicle, UserSession } from '../types';
import { formatDate, formatCPF } from '../lib/formatters';
import { DriverExcelImportModal } from './DriverExcelImportModal';
import { downloadDriverExcelTemplate } from '../lib/driverExcelImporter';

interface DriversViewProps {
  drivers: Driver[];
  fines: TrafficFine[];
  vehicles: Vehicle[];
  currentUser?: UserSession;
  onOpenNewDriverModal: () => void;
  onEditDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
  onSelectFine: (fine: TrafficFine) => void;
  onViewFinePdf?: (fine: TrafficFine) => void;
  onBulkImportDrivers?: (importedDrivers: Driver[], updateExisting: boolean) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  fines,
  vehicles,
  currentUser,
  onOpenNewDriverModal,
  onEditDriver,
  onDeleteDriver,
  onSelectFine,
  onViewFinePdf,
  onBulkImportDrivers,
}) => {
  const isPlogUser = currentUser?.username?.toLowerCase() === 'plog';
  const [searchTerm, setSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState<'ALL' | 'PLOG' | 'FROTA_GERAL'>(
    isPlogUser ? 'PLOG' : 'ALL'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDriverForFines, setSelectedDriverForFines] = useState<Driver | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isImportExcelModalOpen, setIsImportExcelModalOpen] = useState(false);

  const totalPlogCount = drivers.filter((d) => d.isPlogDriver || d.operationType === 'PLOG').length;
  const totalFrotaCount = drivers.filter((d) => !d.isPlogDriver && d.operationType !== 'PLOG').length;

  const filteredDrivers = drivers.filter((driver) => {
    const isPlog = Boolean(driver.isPlogDriver || driver.operationType === 'PLOG');

    // Strict tenant isolation: PLOG user cannot see drivers from other companies
    if (isPlogUser && !isPlog) {
      return false;
    }

    const matchesOperation =
      operationFilter === 'ALL' ||
      (operationFilter === 'PLOG' && isPlog) ||
      (operationFilter === 'FROTA_GERAL' && !isPlog);

    const matchesSearch =
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.cpf.includes(searchTerm) ||
      (driver.rg && driver.rg.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (driver.phone && driver.phone.includes(searchTerm)) ||
      (driver.observations && driver.observations.toLowerCase().includes(searchTerm.toLowerCase())) ||
      driver.cnhNumber.includes(searchTerm) ||
      (driver.assignedVehiclePlate &&
        driver.assignedVehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'ALL' || driver.cnhCategory === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || driver.status === statusFilter;

    return matchesOperation && matchesSearch && matchesCategory && matchesStatus;
  });

  const getDriverFines = (driverId: string) => {
    return fines.filter((f) => f.driverId === driverId);
  };

  return (
    <div id="drivers-view" className="space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Cadastro de Motoristas e Profissionais</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Listagem e gestão de condutores cadastrados, pontuação e prontuário no Detran
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-download-driver-template"
            onClick={downloadDriverExcelTemplate}
            className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Baixar planilha modelo Excel com as colunas: MOTORISTA, CPF, RG, CONTATO, OBSERVAÇÃO"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Modelo Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            id="btn-import-driver-excel"
            onClick={() => setIsImportExcelModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Importar motoristas via planilha Excel (.xlsx, .xls, .csv)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar Planilha Excel</span>
          </button>

          <button
            id="btn-new-driver-top"
            onClick={onOpenNewDriverModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Motorista</span>
          </button>
        </div>
      </div>

      {/* Segmented Filter Bar: Todos vs Motoristas P-LOG vs Frota Geral */}
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
              <Users className="w-3.5 h-3.5" />
              <span>Todos os Motoristas ({drivers.length})</span>
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
            <span>📦 Motoristas P-LOG ({totalPlogCount})</span>
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
              <span>🚚 Frota Geral ({totalFrotaCount})</span>
            </button>
          )}
        </div>

        {isPlogUser && (
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            Sessão P-LOG: Exibindo condutores vinculados à Operação C.A
          </span>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar motorista por nome, CPF, CNH ou placa..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
          >
            <option value="ALL">Todas Categorias CNH</option>
            <option value="E">Categoria E (Carreta)</option>
            <option value="D">Categoria D (Ônibus/Van)</option>
            <option value="C">Categoria C (Caminhão)</option>
            <option value="B">Categoria B (Automóvel)</option>
            <option value="A">Categoria A (Moto)</option>
            <option value="AE">Categoria AE</option>
            <option value="AD">Categoria AD</option>
            <option value="AB">Categoria AB</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="REGULAR">Regular (0 a 19 pts)</option>
            <option value="ALERTA">Em Alerta (20 a 39 pts)</option>
            <option value="SUSPENSA">Suspensão (40+ pts)</option>
            <option value="CASSADA">Cassada</option>
          </select>
        </div>
      </div>

      {/* Drivers Row List Table (Listagem em Linha) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Motoristas e Profissionais Cadastrados ({filteredDrivers.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Exibição em linha • Clique em editar para atualizar dados ou ver infrações
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase font-bold text-slate-600 bg-slate-50 border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-3 text-center w-10">#</th>
                <th className="py-3 px-3 min-w-[200px]">Motorista / Profissional</th>
                <th className="py-3 px-3 min-w-[130px]">CPF</th>
                <th className="py-3 px-3 min-w-[110px]">RG</th>
                <th className="py-3 px-3 min-w-[130px]">Contato</th>
                <th className="py-3 px-3 min-w-[140px]">CNH / Categoria</th>
                <th className="py-3 px-3 min-w-[110px]">Validade CNH</th>
                <th className="py-3 px-3 min-w-[130px]">Pontuação & Status</th>
                <th className="py-3 px-3 min-w-[110px]">Veículo Fixo</th>
                <th className="py-3 px-3 min-w-[160px]">Observações</th>
                <th className="py-3 px-3 min-w-[100px] text-center">Infrações</th>
                <th className="py-3 px-4 text-right min-w-[130px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Nenhum motorista cadastrado</h4>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        Cadastre condutores individualmente ou importe uma planilha Excel com as colunas: <strong>MOTORISTA, CPF, RG, CONTATO, OBSERVAÇÃO</strong>.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        <button
                          type="button"
                          onClick={() => setIsImportExcelModalOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Importar Planilha Excel</span>
                        </button>
                        <button
                          type="button"
                          onClick={onOpenNewDriverModal}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Novo Motorista</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver, index) => {
                  const driverFines = getDriverFines(driver.id);
                  const overdueDriverFines = driverFines.filter((f) => f.status === 'VENCIDA');
                  const totalPoints = driver.currentPoints;
                  const isPlog = Boolean(driver.isPlogDriver || driver.operationType === 'PLOG');

                  return (
                    <tr
                      key={driver.id}
                      className="hover:bg-slate-50/80 transition-colors group border-b border-slate-100"
                    >
                      {/* 1. Índice */}
                      <td className="py-3 px-3 text-center text-[11px] font-mono text-slate-400">
                        {index + 1}
                      </td>

                      {/* 2. Nome do Motorista (sem avatar/imagem, alinhado em linha) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase whitespace-nowrap">
                            {driver.name}
                          </span>
                          {isPlog ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                              P-LOG
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              Frota
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. CPF */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-medium text-slate-800 whitespace-nowrap">
                          {formatCPF(driver.cpf)}
                        </span>
                      </td>

                      {/* 4. RG */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-700 whitespace-nowrap">
                          {driver.rg ? driver.rg : <span className="text-slate-400 italic">-</span>}
                        </span>
                      </td>

                      {/* 5. Contato (Telefone / WhatsApp) */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-800 whitespace-nowrap flex items-center gap-1">
                          {driver.phone ? (
                            <>
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{driver.phone}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">Sem contato</span>
                          )}
                        </span>
                      </td>

                      {/* 6. CNH & Categoria */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-mono font-bold text-slate-900">
                            {driver.cnhNumber}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-blue-700">
                            Cat. {driver.cnhCategory}
                          </span>
                        </div>
                      </td>

                      {/* 7. Validade CNH */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-slate-700 font-medium whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(driver.cnhExpiration)}</span>
                        </div>
                      </td>

                      {/* 8. Pontuação & Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              totalPoints >= 40
                                ? 'text-red-600'
                                : totalPoints >= 20
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {totalPoints} pts
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              driver.status === 'SUSPENSA' || driver.status === 'CASSADA'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : driver.status === 'ALERTA'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {driver.status}
                          </span>
                        </div>
                      </td>

                      {/* 9. Veículo Fixo */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {driver.assignedVehiclePlate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold text-xs">
                            <Truck className="w-3 h-3 text-blue-600" />
                            {driver.assignedVehiclePlate}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Nenhum</span>
                        )}
                      </td>

                      {/* 10. Observações */}
                      <td className="py-3 px-3">
                        {driver.observations ? (
                          <p className="text-slate-600 truncate max-w-[180px] text-xs" title={driver.observations}>
                            {driver.observations}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* 11. Infrações */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedDriverForFines(driver)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Ver infrações e prontuário"
                        >
                          <FileWarning className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-bold text-slate-800">
                            {driverFines.length}
                          </span>
                          {overdueDriverFines.length > 0 && (
                            <span className="px-1 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-bold">
                              {overdueDriverFines.length}v
                            </span>
                          )}
                        </button>
                      </td>

                      {/* 12. Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDriverForFines(driver)}
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] transition-colors cursor-pointer"
                            title="Abrir prontuário completo"
                          >
                            Prontuário
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditDriver(driver)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Editar Cadastro do Motorista"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteId === driver.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteDriver(driver.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Confirmar
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
                              onClick={() => setConfirmDeleteId(driver.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remover Motorista do Sistema e Supabase"
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

      {/* Modal / Side Drawer to see fines for selected driver */}
      {selectedDriverForFines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl text-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Prontuário do Condutor: {selectedDriverForFines.name}
                </h3>
                <p className="text-xs text-slate-500">
                  CPF: {selectedDriverForFines.cpf} • CNH: {selectedDriverForFines.cnhNumber} (Cat. {selectedDriverForFines.cnhCategory}) • {selectedDriverForFines.currentPoints} pontos acumulados
                </p>
              </div>
              <button
                onClick={() => setSelectedDriverForFines(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Documentos & Filiação do Motorista */}
            <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-600">
              {selectedDriverForFines.motherName && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Mãe (Filiação):</span>
                  <span className="font-semibold text-slate-800">{selectedDriverForFines.motherName}</span>
                </div>
              )}
              {selectedDriverForFines.fatherName && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Pai (Filiação):</span>
                  <span className="font-semibold text-slate-800">{selectedDriverForFines.fatherName}</span>
                </div>
              )}
              {selectedDriverForFines.renachNumber && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nº RENACH:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedDriverForFines.renachNumber}</span>
                </div>
              )}
              {selectedDriverForFines.cnhSecurityCode && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Cód. Segurança CNH:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedDriverForFines.cnhSecurityCode}</span>
                </div>
              )}
              {selectedDriverForFines.cnhIssueDate && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Emissão CNH:</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedDriverForFines.cnhIssueDate)}</span>
                </div>
              )}
              {selectedDriverForFines.firstLicenseDate && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">1ª Habilitação:</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedDriverForFines.firstLicenseDate)}</span>
                </div>
              )}
            </div>

            {getDriverFines(selectedDriverForFines.id).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nenhuma infração registrada para este motorista. Prontuário 100% limpo!
              </p>
            ) : (
              <div className="space-y-3">
                {getDriverFines(selectedDriverForFines.id).map((fine) => (
                  <div
                    key={fine.id}
                    onClick={() => {
                      setSelectedDriverForFines(null);
                      onSelectFine(fine);
                    }}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-slate-900 text-xs">{fine.aitNumber}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-800 font-mono px-2 py-0.5 rounded border border-blue-200 font-bold">
                          {fine.plate}
                        </span>
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
                      <p className="text-[11px] text-slate-500 mt-1">Data: {formatDate(fine.infractionDate)}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {onViewFinePdf && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDriverForFines(null);
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

      {/* Driver Excel Import Modal */}
      <DriverExcelImportModal
        isOpen={isImportExcelModalOpen}
        onClose={() => setIsImportExcelModalOpen(false)}
        existingDrivers={drivers}
        currentUser={currentUser}
        onImportSuccess={(importedDrivers, updateExisting) => {
          if (onBulkImportDrivers) {
            onBulkImportDrivers(importedDrivers, updateExisting);
          }
        }}
      />
    </div>
  );
};
