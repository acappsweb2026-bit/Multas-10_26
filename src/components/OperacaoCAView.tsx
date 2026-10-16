import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  FileCheck,
  DollarSign,
  AlertCircle,
  Truck,
  Calendar,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Clock,
  Briefcase,
  FileText,
  Sparkles,
  User,
  FileSignature,
  Printer,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { OperacaoCAItem, OperacaoCATerm, Driver, Vehicle } from '../types';
import {
  parseExcelOperacaoCA,
  exportOperacaoCAToExcel,
  downloadSampleOperacaoCATemplate,
  ImportResult,
} from '../lib/excelImporter';
import { OperacaoCATermModal } from './OperacaoCATermModal';
import { OperacaoCAPaymentModal } from './OperacaoCAPaymentModal';

interface OperacaoCAViewProps {
  items: OperacaoCAItem[];
  drivers?: Driver[];
  vehicles?: Vehicle[];
  onSaveItem: (item: OperacaoCAItem) => void;
  onDeleteItem: (id: string) => void;
  onBulkImport: (newItems: OperacaoCAItem[], overwriteExisting?: OperacaoCAItem[]) => void;
  onClearAll?: () => void;
  storedTerms?: OperacaoCATerm[];
  onSaveTerm?: (term: OperacaoCATerm) => void;
  onDeleteTerm?: (termId: string) => void;
  onOpenAIModal?: () => void;
}

export const OperacaoCAView: React.FC<OperacaoCAViewProps> = ({
  items,
  drivers = [],
  vehicles = [],
  onSaveItem,
  onDeleteItem,
  onBulkImport,
  onClearAll,
  storedTerms = [],
  onSaveTerm,
  onDeleteTerm,
  onOpenAIModal,
}) => {
  // Navigation tabs: 'fines' (Autos de Infração) or 'terms' (Termos e Recibos Armazenados)
  const [activeSubTab, setActiveSubTab] = useState<'fines' | 'terms'>('fines');
  const [isSheetMenuOpen, setIsSheetMenuOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [folhaFilter, setFolhaFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL');

  // Modal States
  const [editingItem, setEditingItem] = useState<OperacaoCAItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  const [paymentModalItem, setPaymentModalItem] = useState<OperacaoCAItem | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [termModalFine, setTermModalFine] = useState<OperacaoCAItem | null>(null);
  const [termModalDriverFines, setTermModalDriverFines] = useState<OperacaoCAItem[]>([]);
  const [termModalDriverName, setTermModalDriverName] = useState<string>('');
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [viewingExistingTerm, setViewingExistingTerm] = useState<OperacaoCATerm | null>(null);

  const [linkDriverItem, setLinkDriverItem] = useState<OperacaoCAItem | null>(null);
  const [isLinkDriverModalOpen, setIsLinkDriverModalOpen] = useState(false);
  const [selectedDriverNameForLink, setSelectedDriverNameForLink] = useState('');

  // Duplicate Warning Modal
  const [duplicateModalData, setDuplicateModalData] = useState<ImportResult | null>(null);

  // Clear Database Confirmation Modal
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState(false);

  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extract distinct driver names for the filter dropdown
  const distinctDrivers = useMemo(() => {
    const names = new Set<string>();
    items.forEach((it) => {
      if (it.driverName && it.driverName.trim()) {
        names.add(it.driverName.trim());
      }
    });
    drivers.forEach((d) => {
      if (d.name && d.name.trim()) {
        names.add(d.name.trim());
      }
    });
    return Array.from(names).sort();
  }, [items, drivers]);

  // File Upload Handler (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) return;

        const result = parseExcelOperacaoCA(buffer, items, drivers);

        if (result.duplicatesExisting.length > 0 || result.duplicatesInternal.length > 0) {
          // Open duplicate warning modal to alert user: duplicates will NOT be imported!
          setDuplicateModalData(result);
        } else {
          // No duplicates! Directly import all
          if (result.newItems.length > 0) {
            onBulkImport(result.newItems);
            setImportNotification({
              type: 'success',
              message: `✅ Importação concluída com sucesso! ${result.newItems.length} novos autos da Operação C.A foram adicionados sem duplicidades.`,
            });
          } else {
            setImportNotification({
              type: 'info',
              message: 'Nenhum registro válido encontrado na planilha importada.',
            });
          }
        }
      } catch (err: any) {
        setImportNotification({
          type: 'warning',
          message: `Erro ao processar arquivo: ${err?.message || 'Formato de planilha inválido.'}`,
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Strictly skip duplicates and import only new documents
  const handleImportOnlyNewWithoutDuplicates = () => {
    if (!duplicateModalData) return;
    const { newItems, duplicatesExisting, duplicatesInternal } = duplicateModalData;
    const duplicateCount = duplicatesExisting.length + duplicatesInternal.length;

    if (newItems.length > 0) {
      onBulkImport(newItems);
      setImportNotification({
        type: 'success',
        message: `✅ Importação concluída: ${newItems.length} novos autos adicionados. ${duplicateCount} documento(s) com AIT repetido foram REJEITADOS para evitar duplicidades no sistema.`,
      });
    } else {
      setImportNotification({
        type: 'warning',
        message: `⚠️ Nenhum documento novo importado: todos os ${duplicateCount} autos na planilha já estavam cadastrados no sistema.`,
      });
    }
    setDuplicateModalData(null);
  };

  // Clear / Zerar Base Handlers
  const handleConfirmClearAll = () => {
    if (onClearAll) {
      onClearAll();
      setIsConfirmClearModalOpen(false);
      setImportNotification({
        type: 'success',
        message: 'Base de dados da Operação C.A zerada com sucesso! O sistema está pronto para novos lançamentos e importações.',
      });
    }
  };

  // KPIs
  const totalCount = items.length;
  const totalValue = items.reduce((acc, it) => acc + (it.totalValue || 0), 0);
  const totalAdminFee = items.reduce((acc, it) => acc + (it.adminFee || 0), 0);
  const paidCount = items.filter((it) => it.paymentStatus === 'PAGO').length;
  const pendingPaymentCount = items.filter((it) => it.paymentStatus !== 'PAGO').length;
  const folhaCount = items.filter((it) => (it.payrollDeduction || '').toLowerCase().includes('sim')).length;

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        !searchTerm ||
        it.ait.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (it.driverName && it.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        it.infractionDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (it.infractionLocation && it.infractionLocation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (it.invoiceNumber && it.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (it.nominatedName && it.nominatedName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'EXPIRADO' && (it.notificationStatus || '').toLowerCase().includes('expirado')) ||
        (statusFilter === 'SEM_INDICACAO' && (it.notificationStatus || '').toLowerCase().includes('sem ind'));

      const matchPayment =
        paymentFilter === 'ALL' ||
        (paymentFilter === 'PAGO' && it.paymentStatus === 'PAGO') ||
        (paymentFilter === 'PENDENTE' && it.paymentStatus !== 'PAGO');

      const matchFolha =
        folhaFilter === 'ALL' ||
        (folhaFilter === 'SIM' && (it.payrollDeduction || '').toLowerCase().includes('sim')) ||
        (folhaFilter === 'NAO' && (it.payrollDeduction || '').toLowerCase() === 'não');

      const matchMonth =
        monthFilter === 'ALL' ||
        (it.driverStatusCompetence && it.driverStatusCompetence.toLowerCase().includes(monthFilter.toLowerCase()));

      const matchDriver =
        driverFilter === 'ALL' ||
        (it.driverName && it.driverName.toLowerCase() === driverFilter.toLowerCase());

      return matchSearch && matchStatus && matchPayment && matchFolha && matchMonth && matchDriver;
    });
  }, [items, searchTerm, statusFilter, paymentFilter, folhaFilter, monthFilter, driverFilter]);

  // Open Term Generator for single fine
  const handleOpenTermForSingleFine = (fine: OperacaoCAItem) => {
    setTermModalFine(fine);
    setTermModalDriverFines([]);
    setTermModalDriverName(fine.driverName || '');
    setViewingExistingTerm(null);
    setIsTermModalOpen(true);
  };

  // Open Term Generator for all fines of selected driver
  const handleOpenTermForDriverGroup = (name: string) => {
    const driverFines = items.filter(
      (it) => it.driverName && it.driverName.toLowerCase() === name.toLowerCase()
    );
    if (driverFines.length === 0) return;
    setTermModalFine(null);
    setTermModalDriverFines(driverFines);
    setTermModalDriverName(name);
    setViewingExistingTerm(null);
    setIsTermModalOpen(true);
  };

  // Open Link Driver Quick Modal
  const handleOpenLinkDriver = (item: OperacaoCAItem) => {
    setLinkDriverItem(item);
    setSelectedDriverNameForLink(item.driverName || '');
    setIsLinkDriverModalOpen(true);
  };

  const handleSaveDriverLink = () => {
    if (!linkDriverItem) return;
    const updated: OperacaoCAItem = {
      ...linkDriverItem,
      driverName: selectedDriverNameForLink.trim() || undefined,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    onSaveItem(updated);
    setIsLinkDriverModalOpen(false);
    setLinkDriverItem(null);
  };

  return (
    <div id="operacao-ca-view" className="space-y-6 animate-fade-in">
      {/* Hidden File Input for .xlsx */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
            <Briefcase className="w-3.5 h-3.5 text-amber-600" />
            <span>Operação C.A — Controle de Multas & Termos</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Gestão de Infrações — Operação C.A</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Controle de autos, vinculação de motoristas à placa, registro de pagamento com Nota Fiscal e emissão de termos e recibos
          </p>
        </div>

        {/* Action Buttons: Menu da Planilha + Novo Auto */}
        <div className="flex items-center gap-2.5">
          {/* Dropdown Menu para as Ações da Planilha & Zerar Base */}
          <div className="relative">
            <button
              type="button"
              id="btn-ca-sheet-menu"
              onClick={() => setIsSheetMenuOpen(!isSheetMenuOpen)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              title="Abrir menu de ações: importar, exportar, modelo e zerar base"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Menu da Planilha</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                  isSheetMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isSheetMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsSheetMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-30 animate-fade-in text-xs">
                  <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Operações da Planilha
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSheetMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/80 flex items-center gap-2.5 text-slate-800 font-semibold cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="block font-bold text-slate-900">Importar Planilha .xlsx</span>
                      <span className="text-[10px] text-slate-500 block">
                        Valida AITs e bloqueia duplicidade
                      </span>
                    </div>
                  </button>

                  {onOpenAIModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSheetMenuOpen(false);
                        onOpenAIModal();
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50/80 flex items-center gap-2.5 text-slate-800 font-semibold cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="block font-bold text-slate-900">Importar com Google AI</span>
                        <span className="text-[10px] text-slate-500 block">
                          Digitaliza AIT, imagem ou PDF com IA
                        </span>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsSheetMenuOpen(false);
                      exportOperacaoCAToExcel(items);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/80 flex items-center gap-2.5 text-slate-800 font-semibold cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="block font-bold text-slate-900">Exportar .xlsx</span>
                      <span className="text-[10px] text-slate-500 block">
                        Baixar todos os registros da tela
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSheetMenuOpen(false);
                      downloadSampleOperacaoCATemplate();
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-purple-50/80 flex items-center gap-2.5 text-slate-800 font-semibold cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <span className="block font-bold text-slate-900">Baixar Modelo Excel</span>
                      <span className="text-[10px] text-slate-500 block">
                        Planilha padrão da Operação C.A
                      </span>
                    </div>
                  </button>

                  {onClearAll && (
                    <>
                      <div className="border-t border-slate-100 my-1.5" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsSheetMenuOpen(false);
                          setIsConfirmClearModalOpen(true);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-red-50 flex items-center gap-2.5 text-red-700 font-bold cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                        <div>
                          <span className="block text-red-700">Zerar Base da Operação</span>
                          <span className="text-[10px] text-red-500 block font-normal">
                            Limpar e reiniciar registros
                          </span>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Botão Importar Notificação com Google AI */}
          {onOpenAIModal && (
            <button
              type="button"
              id="btn-ca-ai-import"
              onClick={onOpenAIModal}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-amber-400/30"
              title="Importar Notificação de Trânsito ou Foto com Google Gemini AI"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Importar com Google AI</span>
            </button>
          )}

          {/* Botão Novo Auto */}
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Auto</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {importNotification && (
        <div
          className={`p-4 rounded-xl border-2 text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-fade-in ${
            importNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : importNotification.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {importNotification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : importNotification.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span>{importNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Total de Autos (AIT)
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Registros na Operação C.A</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Valor Total Acumulado
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Multas + Taxas Adm</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Multas Pagas
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{paidCount}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Com Nota Fiscal registrada</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Pagamentos Pendentes
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendingPaymentCount}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Aguardando liquidação</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Termos / Recibos
          </span>
          <p className="text-2xl font-black text-purple-600 mt-1">{storedTerms.length}</p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Gerados e armazenados</span>
        </div>
      </div>

      {/* Tabs Selector: Autos vs Termos Armazenados */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('fines')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'fines'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Autos de Infração ({items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('terms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'terms'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>Termos e Recibos Armazenados ({storedTerms.length})</span>
        </button>
      </div>

      {activeSubTab === 'fines' ? (
        <>
          {/* Filters & Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por AIT, Placa, Motorista, NF..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Driver Filter */}
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
              >
                <option value="ALL">Todos os Motoristas</option>
                {distinctDrivers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Status Pagamento Filter */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
              >
                <option value="ALL">Pagamento (Todos)</option>
                <option value="PAGO">Pago (Liquidado)</option>
                <option value="PENDENTE">Pendente</option>
              </select>

              {/* Desconto Folha Filter */}
              <select
                value={folhaFilter}
                onChange={(e) => setFolhaFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
              >
                <option value="ALL">Desconto em Folha (Todos)</option>
                <option value="SIM">Sim-F.Log (Descontar)</option>
                <option value="NAO">Não Descontar</option>
              </select>

              {/* Status Notificação Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
              >
                <option value="ALL">Status Notificação (Todos)</option>
                <option value="EXPIRADO">Prazo Expirado</option>
                <option value="SEM_INDICACAO">Sem Indicação</option>
              </select>

              {/* Quick Action: Gerar Termo do Motorista Selecionado */}
              {driverFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => handleOpenTermForDriverGroup(driverFilter)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title={`Gerar Termo/Recibo para o motorista ${driverFilter}`}
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>Gerar Recibo de {driverFilter}</span>
                </button>
              )}

              {(searchTerm ||
                statusFilter !== 'ALL' ||
                paymentFilter !== 'ALL' ||
                folhaFilter !== 'ALL' ||
                driverFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setPaymentFilter('ALL');
                    setFolhaFilter('ALL');
                    setDriverFilter('ALL');
                  }}
                  className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Main Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3.5 whitespace-nowrap">AIT</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Placa / Motorista</th>
                    <th className="py-3 px-3.5 min-w-[260px]">DESCRIÇÃO DA INFRAÇÃO</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Valor Cobrado</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Taxa Adm</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap font-black">Valor Total</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Status Pagamento / NF</th>
                    <th className="py-3 px-3 whitespace-nowrap">Data Envio</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Desconto Folha</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Recurso</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Ações & Termo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                        <p className="font-semibold text-sm text-slate-700">Nenhum auto encontrado na Operação C.A</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Importe uma planilha .xlsx usando o botão acima ou cadastre um novo auto manualmente.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* AIT */}
                        <td className="py-2.5 px-3.5 font-black text-slate-900 whitespace-nowrap">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {it.ait}
                          </span>
                        </td>

                        {/* Placa & Motorista Vinculado (Conforme solicitado pelo usuário) */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded">
                                {it.plate}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenLinkDriver(it)}
                                title="Vincular ou alterar motorista deste veículo"
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                              <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[160px]" title={it.driverName || 'Não vinculado'}>
                                {it.driverName ? it.driverName : <span className="text-slate-400 italic font-normal">Não vinculado</span>}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* DESCRIÇÃO DA INFRAÇÃO (Infração da Planilha) & Local */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex flex-col gap-1">
                            <p className="font-bold text-slate-900 leading-snug line-clamp-2" title={it.infractionDescription}>
                              {it.infractionDescription || (
                                <span className="text-amber-700 italic font-normal bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                                  Sem descrição informada
                                </span>
                              )}
                            </p>
                            {it.infractionLocation && (
                              <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate max-w-xs" title={`Local: ${it.infractionLocation}`}>
                                <span className="text-slate-400">📍 Local:</span>
                                <span className="truncate">{it.infractionLocation}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Valor Cobrado */}
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                          {it.originalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>

                        {/* Taxa Adm */}
                        <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                          {it.adminFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>

                        {/* Total */}
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                          {it.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>

                        {/* Status Pagamento & Nota Fiscal (Opção quando a multa for paga) */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {it.paymentStatus === 'PAGO' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentModalItem(it);
                                setIsPaymentModalOpen(true);
                              }}
                              className="text-left p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer group block"
                              title="Clique para ver ou alterar dados do pagamento"
                            >
                              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>MULTA PAGA</span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-800 mt-0.5">
                                NF: <span className="font-mono">{it.invoiceNumber || 'S/N'}</span>
                              </p>
                              <p className="text-[10px] text-slate-600 truncate max-w-[140px]" title={it.paidBy}>
                                Pago por: {it.paidBy || 'Não informado'}
                              </p>
                              {it.paidAt && (
                                <p className="text-[9px] text-slate-500">Data: {it.paidAt}</p>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentModalItem(it);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Registrar pagamento desta multa e informar Nota Fiscal"
                            >
                              <DollarSign className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Registrar Pagamento</span>
                            </button>
                          )}
                        </td>

                        {/* Data Envio */}
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {it.emailNoticeDate || '—'}
                        </td>

                        {/* Desconto Folha */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] ${
                              (it.payrollDeduction || '').toLowerCase().includes('sim')
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {it.payrollDeduction || 'Sim-F.Log'}
                          </span>
                        </td>

                        {/* Recurso */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] font-semibold ${
                              it.appealStatus === 'Sim' ? 'text-blue-700 font-bold' : 'text-slate-500'
                            }`}
                          >
                            {it.appealStatus || 'Não'}
                          </span>
                        </td>

                        {/* Ações & Termo */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Botão Gerar Termo / Recibo */}
                            <button
                              type="button"
                              onClick={() => handleOpenTermForSingleFine(it)}
                              className="p-1.5 rounded-lg text-purple-700 hover:bg-purple-100 bg-purple-50 transition-colors cursor-pointer"
                              title="Gerar Termo / Recibo com campo para assinatura do motorista"
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(it);
                                setIsItemModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Editar Auto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja excluir o AIT ${it.ait}?`)) {
                                  onDeleteItem(it.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Excluir Auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Exibindo <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> autos da Operação C.A
              </span>
              {onClearAll && items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsConfirmClearModalOpen(true)}
                  className="text-red-600 hover:text-red-800 font-bold cursor-pointer"
                >
                  Zerar e Limpar Toda a Base Operação C.A
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Sub-tab: Termos e Recibos Armazenados */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-purple-600" />
                <span>Termos e Recibos Armazenados da Operação C.A</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Histórico de termos gerados para colheita de assinatura do motorista e comprovação de ciência
              </p>
            </div>
          </div>

          {storedTerms.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              <FileSignature className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="font-semibold text-sm text-slate-700">Nenhum termo gerado até o momento</p>
              <p className="text-xs text-slate-500 mt-1">
                Na tabela de autos de infração, clique no ícone roxo de termo para gerar um recibo com assinatura.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-3">Protocolo</th>
                    <th className="py-2.5 px-3">Motorista</th>
                    <th className="py-2.5 px-3">Placa</th>
                    <th className="py-2.5 px-3">AIT(s)</th>
                    <th className="py-2.5 px-3">Data Notificação</th>
                    <th className="py-2.5 px-3">Local da Infração</th>
                    <th className="py-2.5 px-3 text-right">Valor Consolidado</th>
                    <th className="py-2.5 px-3 text-center">Status Assinatura</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storedTerms.map((term) => (
                    <tr key={term.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{term.protocolNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{term.driverName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{term.plate}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{term.ait}</td>
                      <td className="py-2.5 px-3">{term.infractionDate}</td>
                      <td className="py-2.5 px-3 max-w-xs truncate" title={term.infractionLocation}>
                        {term.infractionLocation}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {term.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            term.status === 'ASSINADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {term.status === 'ASSINADO' ? '✅ Assinado' : '⏳ Emitido'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingExistingTerm(term);
                              setTermModalFine(null);
                              setIsTermModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            title="Visualizar ou imprimir este termo"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600" />
                            <span>Imprimir / Ver</span>
                          </button>
                          {onDeleteTerm && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Excluir o termo ${term.protocolNumber}?`)) {
                                  onDeleteTerm(term.id);
                                }
                              }}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Excluir termo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ⚠️ MODAL DE ALERTA DE DOCUMENTO DUPLICADO (Exatamente como o usuário solicitou) */}
      {duplicateModalData && (
        <div
          id="duplicate-warning-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-3xl bg-white border-2 border-red-400 rounded-2xl shadow-2xl text-slate-900 my-8 overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 bg-red-50 border-b border-red-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-red-950">
                    ⚠️ Aviso: Documento Duplicado Detectado na Planilha!
                  </h3>
                  <p className="text-xs text-red-800 mt-1 leading-relaxed">
                    Foram identificados <strong>{duplicateModalData.duplicatesExisting.length} auto(s)</strong> com AIT já existente no sistema e{' '}
                    <strong>{duplicateModalData.duplicatesInternal.length} duplicidade(s)</strong> no próprio arquivo.{' '}
                    <strong className="underline">A duplicidade NÃO será importada</strong> para manter os documentos íntegros.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-red-100/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of Duplicates */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                <span className="font-bold text-slate-900">Resumo da Leitura:</span>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Total de linhas na planilha: <strong>{duplicateModalData.totalRowsParsed}</strong></li>
                  <li>Novos autos válidos (sem duplicidade): <strong className="text-emerald-700">{duplicateModalData.newItems.length}</strong></li>
                  <li>Autos duplicados que serão ignorados: <strong className="text-red-700">{duplicateModalData.duplicatesExisting.length + duplicateModalData.duplicatesInternal.length}</strong></li>
                </ul>
              </div>

              {/* Table of Duplicated Items */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Documentos com AIT Repetido (Serão Rejeitados):
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                        <th className="py-2 px-3">AIT Duplicado</th>
                        <th className="py-2 px-3">Placa</th>
                        <th className="py-2 px-3">Infração</th>
                        <th className="py-2 px-3 text-right">Valor</th>
                        <th className="py-2 px-3">Motivo da Rejeição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {duplicateModalData.duplicatesExisting.map((dup, idx) => (
                        <tr key={`dup-ext-${idx}`} className="bg-red-50/40 hover:bg-red-50/70">
                          <td className="py-2 px-3 font-mono font-black text-red-700">{dup.scanned.ait}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{dup.scanned.plate}</td>
                          <td className="py-2 px-3 truncate max-w-xs">{dup.scanned.infractionDescription}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {dup.scanned.originalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                              Já existe no sistema
                            </span>
                          </td>
                        </tr>
                      ))}
                      {duplicateModalData.duplicatesInternal.map((dup, idx) => (
                        <tr key={`dup-int-${idx}`} className="bg-amber-50/40 hover:bg-amber-50/70">
                          <td className="py-2 px-3 font-mono font-black text-amber-700">{dup.ait}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{dup.plate}</td>
                          <td className="py-2 px-3 truncate max-w-xs">{dup.infractionDescription}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {dup.originalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Repetido no arquivo
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDuplicateModalData(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar Importação
              </button>

              <button
                type="button"
                onClick={handleImportOnlyNewWithoutDuplicates}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Importar Apenas Documentos Novos ({duplicateModalData.newItems.length}) — Rejeitar Duplicados
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL DE CONFIRMAÇÃO PARA ZERAR BASE (Habilitar e zerar conforme pedido) */}
      {isConfirmClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="relative w-full max-w-md bg-white border-2 border-red-300 rounded-2xl shadow-2xl p-6 text-slate-900 animate-scale-up space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">Zerar Base da Operação C.A?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta ação apagará permanentemente todos os <strong>{items.length} autos</strong> de infração e recibos
                da Operação C.A, deixando o banco limpo e pronto para novos lançamentos.
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Esta operação não poderá ser desfeita.</span>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmClearModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Zerar Base</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR MOTORISTA RÁPIDO */}
      {isLinkDriverModalOpen && linkDriverItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-900 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Vincular Motorista à Placa {linkDriverItem.plate}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkDriverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Selecione ou digite o nome do motorista
              </label>
              <input
                type="text"
                value={selectedDriverNameForLink}
                onChange={(e) => setSelectedDriverNameForLink(e.target.value)}
                placeholder="Nome do motorista condutor"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-semibold uppercase"
                list="drivers-datalist"
              />
              <datalist id="drivers-datalist">
                {distinctDrivers.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            {distinctDrivers.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Sugestões de Motoristas Cadastrados:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {distinctDrivers.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedDriverNameForLink(name)}
                      className="px-2 py-1 rounded text-[10px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 cursor-pointer"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLinkDriverModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDriverLink}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Vinculação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Item Add / Edit Modal */}
      {isItemModalOpen && (
        <OperacaoCAItemModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          initialData={editingItem}
          distinctDrivers={distinctDrivers}
          onSave={(item) => {
            onSaveItem(item);
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Modal de Pagamento da Multa */}
      {isPaymentModalOpen && paymentModalItem && (
        <OperacaoCAPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentModalItem(null);
          }}
          item={paymentModalItem}
          onSavePayment={(updated) => {
            onSaveItem(updated);
            setIsPaymentModalOpen(false);
            setPaymentModalItem(null);
          }}
        />
      )}

      {/* Modal de Emissão e Assinatura do Termo / Recibo */}
      {isTermModalOpen && (
        <OperacaoCATermModal
          isOpen={isTermModalOpen}
          onClose={() => {
            setIsTermModalOpen(false);
            setTermModalFine(null);
            setTermModalDriverFines([]);
            setViewingExistingTerm(null);
          }}
          item={termModalFine}
          itemsForDriver={termModalDriverFines}
          driverName={termModalDriverName}
          registeredDrivers={drivers}
          vehicles={vehicles}
          existingTerm={viewingExistingTerm}
          onSaveTerm={(term) => {
            if (onSaveTerm) onSaveTerm(term);
            setIsTermModalOpen(false);
            setTermModalFine(null);
            setTermModalDriverFines([]);
            setViewingExistingTerm(null);
          }}
        />
      )}
    </div>
  );
};

// Sub-component: Modal for Manual Item Creation / Edition with Driver & Payment Support
interface OperacaoCAItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: OperacaoCAItem) => void;
  initialData?: OperacaoCAItem | null;
  distinctDrivers?: string[];
}

const OperacaoCAItemModal: React.FC<OperacaoCAItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  distinctDrivers = [],
}) => {
  const [formData, setFormData] = useState<Partial<OperacaoCAItem>>(() => {
    if (initialData) return { ...initialData };
    return {
      ait: '',
      plate: '',
      driverName: '',
      infractionDescription: '',
      originalValue: 104.13,
      emailNoticeDate: '',
      nominationDeadline: '',
      nominatedName: 'P-LOG TRANSPORTES',
      discountPaymentDeadline: '',
      notificationStatus: 'Sem Indicação',
      infractionLocation: '',
      adminFee: 10.41,
      driverStatusCompetence: 'Indisponível Motorista',
      year: new Date().getFullYear(),
      payrollDeduction: 'Sim-F.Log',
      appealStatus: 'Não',
      totalValue: 114.54,
      paymentStatus: 'PENDENTE',
      paidAt: '',
      paidBy: '',
      invoiceNumber: '',
    };
  });

  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleOriginalValueChange = (val: number) => {
    const fee = Number((val * 0.1).toFixed(2));
    const total = Number((val + fee).toFixed(2));
    setFormData((prev) => ({
      ...prev,
      originalValue: val,
      adminFee: fee,
      totalValue: total,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ait || !formData.ait.trim()) {
      setFormError('Informe o número do AIT (Auto de Infração).');
      return;
    }
    if (!formData.plate || !formData.plate.trim()) {
      setFormError('Informe a placa do veículo.');
      return;
    }

    const saved: OperacaoCAItem = {
      id: initialData?.id || `ca-${Date.now().toString(36)}`,
      ait: formData.ait.trim().toUpperCase(),
      plate: formData.plate.trim().toUpperCase(),
      driverName: formData.driverName?.trim() || undefined,
      infractionDescription: formData.infractionDescription?.trim() || 'INFRAÇÃO DE TRÂNSITO',
      originalValue: Number(formData.originalValue) || 0,
      emailNoticeDate: formData.emailNoticeDate || '',
      nominationDeadline: formData.nominationDeadline || '',
      nominatedName: formData.nominatedName || 'P-LOG TRANSPORTES',
      discountPaymentDeadline: formData.discountPaymentDeadline || '',
      notificationStatus: formData.notificationStatus || 'Sem Indicação',
      infractionLocation: formData.infractionLocation || '',
      adminFee: Number(formData.adminFee) || 0,
      driverStatusCompetence: formData.driverStatusCompetence || '',
      year: Number(formData.year) || new Date().getFullYear(),
      payrollDeduction: formData.payrollDeduction || 'Sim-F.Log',
      appealStatus: formData.appealStatus || 'Não',
      totalValue: Number(formData.totalValue) || 0,
      paymentStatus: formData.paymentStatus || 'PENDENTE',
      paidAt: formData.paidAt || undefined,
      paidBy: formData.paidBy?.trim() || undefined,
      invoiceNumber: formData.invoiceNumber?.trim() || undefined,
      createdAt: initialData?.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialData ? 'Editar Auto — Operação C.A' : 'Novo Auto — Operação C.A'}
              </h3>
              <p className="text-xs text-slate-500">Preencha os dados do auto de infração da Operação C.A</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número do AIT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ait || ''}
                  onChange={(e) => setFormData({ ...formData, ait: e.target.value })}
                  placeholder="ex: 2167909384"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Placa do Veículo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.plate || ''}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  placeholder="ex: TDX1E88"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Motorista Vinculado */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Motorista Vinculado à Placa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={formData.driverName || ''}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="ex: CARLOS EDUARDO SILVA"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 uppercase font-medium"
                    list="drivers-modal-datalist"
                  />
                  <datalist id="drivers-modal-datalist">
                    {distinctDrivers.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Infração
                </label>
                <input
                  type="text"
                  value={formData.infractionDescription || ''}
                  onChange={(e) => setFormData({ ...formData, infractionDescription: e.target.value })}
                  placeholder="ex: TRANSITAR EM VELOCIDADE SUPERIOR A MAXIMA PERMITIDA EM ATE 20"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Cobrado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.originalValue || ''}
                  onChange={(e) => handleOriginalValueChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Taxa Administrativa (10%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.adminFee || ''}
                  onChange={(e) => {
                    const fee = parseFloat(e.target.value) || 0;
                    setFormData((prev) => ({
                      ...prev,
                      adminFee: fee,
                      totalValue: Number(((prev.originalValue || 0) + fee).toFixed(2)),
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data Envio (Email/Multa)
                </label>
                <input
                  type="text"
                  value={formData.emailNoticeDate || ''}
                  onChange={(e) => setFormData({ ...formData, emailNoticeDate: e.target.value })}
                  placeholder="ex: 20/03/2026 19:06"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data Limite Indicação
                </label>
                <input
                  type="text"
                  value={formData.nominationDeadline || ''}
                  onChange={(e) => setFormData({ ...formData, nominationDeadline: e.target.value })}
                  placeholder="ex: 19/04/2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Indicado
                </label>
                <input
                  type="text"
                  value={formData.nominatedName || ''}
                  onChange={(e) => setFormData({ ...formData, nominatedName: e.target.value })}
                  placeholder="ex: P-LOG TRANSPORTES"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status da Notificação
                </label>
                <input
                  type="text"
                  value={formData.notificationStatus || ''}
                  onChange={(e) => setFormData({ ...formData, notificationStatus: e.target.value })}
                  placeholder="ex: 20/03/2026 Prazo Expirado"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Local da Infração
                </label>
                <input
                  type="text"
                  value={formData.infractionLocation || ''}
                  onChange={(e) => setFormData({ ...formData, infractionLocation: e.target.value })}
                  placeholder="ex: SP 330 - KM 084 METROS 000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Desconto em Folha
                </label>
                <select
                  value={formData.payrollDeduction || 'Sim-F.Log'}
                  onChange={(e) => setFormData({ ...formData, payrollDeduction: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  <option value="Sim-F.Log">Sim-F.Log (Descontar em Folha)</option>
                  <option value="Não">Não Descontar</option>
                </select>
              </div>

              {/* Status de Pagamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status do Pagamento
                </label>
                <select
                  value={formData.paymentStatus || 'PENDENTE'}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'PAGO' | 'PENDENTE' })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="PAGO">Pago</option>
                </select>
              </div>

              {formData.paymentStatus === 'PAGO' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Por quem foi pago?
                    </label>
                    <input
                      type="text"
                      value={formData.paidBy || ''}
                      onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                      placeholder="ex: P-LOG TRANSPORTES ou Motorista"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número da Nota Fiscal (NF)
                    </label>
                    <input
                      type="text"
                      value={formData.invoiceNumber || ''}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      placeholder="ex: NF-98421"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Auto</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
