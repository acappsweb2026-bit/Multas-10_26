import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Camera,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  DollarSign,
  Scale,
  RefreshCw,
  Eye,
  FileWarning,
  Briefcase,
  AlertCircle,
  Truck,
  User,
} from 'lucide-react';
import { TrafficFine, OperacaoCAItem, Vehicle, Driver } from '../types';
import { extractFineFromPdf } from '../services/apiService';
import { COMMON_CTB_CODES } from '../data/mockData';
import { formatCurrency } from '../lib/formatters';

interface AIFineImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFine: (fine: TrafficFine) => Promise<void> | void;
  onSaveOperacaoCAItem?: (item: OperacaoCAItem) => Promise<void> | void;
  initialTarget?: 'general' | 'operacao-ca';
  vehicles: Vehicle[];
  drivers: Driver[];
  existingFines: TrafficFine[];
  existingCAItems?: OperacaoCAItem[];
}

export const AIFineImportModal: React.FC<AIFineImportModalProps> = ({
  isOpen,
  onClose,
  onSaveFine,
  onSaveOperacaoCAItem,
  initialTarget = 'general',
  vehicles,
  drivers,
  existingFines,
  existingCAItems = [],
}) => {
  const [targetType, setTargetType] = useState<'general' | 'operacao-ca'>(initialTarget);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [aiSource, setAiSource] = useState('');
  const [formError, setFormError] = useState('');

  // Form fields for extracted / verified data
  const [aitNumber, setAitNumber] = useState('');
  const [plate, setPlate] = useState('');
  const [infractionDate, setInfractionDate] = useState('');
  const [infractionLocation, setInfractionLocation] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [infractionCode, setInfractionCode] = useState('745-50');
  const [infractionDescription, setInfractionDescription] = useState('Transitar em velocidade superior à máxima permitida em até 20%');
  const [fineAmount, setFineAmount] = useState<number>(130.16);
  const [discountAmount, setDiscountAmount] = useState<number>(104.13);
  const [originalAmount, setOriginalAmount] = useState<number>(130.16);
  const [dueDate, setDueDate] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('DETRAN');
  const [driverId, setDriverId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [isDoubledFine, setIsDoubledFine] = useState(false);
  const [multiplierFactor, setMultiplierFactor] = useState(1);

  // Operação C.A specific fields
  const [adminFee, setAdminFee] = useState<number>(13.016);
  const [payrollDeduction, setPayrollDeduction] = useState('Sim-F.Log');
  const [nominatedName, setNominatedName] = useState('P-LOG TRANSPORTES');
  const [nominationDeadline, setNominationDeadline] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PENDENTE' | 'PAGO'>('PENDENTE');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetType(initialTarget);
      setFormError('');
      setStatusMessage('');
      if (!dueDate) {
        const nextMonth = new Date(Date.now() + 30 * 86400000);
        setDueDate(nextMonth.toISOString().slice(0, 10));
      }
      if (!nominationDeadline) {
        const next30 = new Date(Date.now() + 30 * 86400000);
        setNominationDeadline(next30.toISOString().slice(0, 10));
      }
    }
  }, [isOpen, initialTarget]);

  if (!isOpen) return null;

  // Duplicate Check
  const duplicateInGeneral = existingFines.find(
    (f) => aitNumber && f.aitNumber.trim().toUpperCase() === aitNumber.trim().toUpperCase()
  );
  const duplicateInCA = existingCAItems.find(
    (item) => aitNumber && item.ait.trim().toUpperCase() === aitNumber.trim().toUpperCase()
  );
  const isDuplicate = targetType === 'general' ? !!duplicateInGeneral : !!duplicateInCA;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setFormError('');
    setIsProcessing(true);
    setStatusMessage('Lendo arquivo e enviando para auditoria pelo Google Gemini AI...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setFileBase64(base64);

        try {
          const res = await extractFineFromPdf({
            base64Data: base64,
            mimeType: file.type || 'application/pdf',
            fileName: file.name,
          });

          if (res.success && res.data) {
            const d = res.data;
            if (d.aitNumber) setAitNumber(d.aitNumber.trim().toUpperCase());
            if (d.plate) setPlate(d.plate.trim().toUpperCase());
            if (d.infractionDate) setInfractionDate(d.infractionDate.slice(0, 16));
            if (d.infractionLocation) setInfractionLocation(d.infractionLocation);
            if (d.city) setCity(d.city);
            if (d.state) setState(d.state);
            if (d.infractionCode) setInfractionCode(d.infractionCode);
            if (d.infractionDescription) setInfractionDescription(d.infractionDescription);
            if (d.dueDate) setDueDate(d.dueDate.slice(0, 10));
            if (d.issuingAuthority) setIssuingAuthority(d.issuingAuthority);

            const amt = Number(d.fineAmount) || 130.16;
            setFineAmount(amt);
            setOriginalAmount(Number(d.originalAmount) || amt);
            setDiscountAmount(Number(d.discountAmount) || Number((amt * 0.8).toFixed(2)));
            setAdminFee(Number((amt * 0.1).toFixed(3)));

            if (d.isDoubledFine || (d.multiplierFactor && d.multiplierFactor > 1)) {
              setIsDoubledFine(true);
              setMultiplierFactor(d.multiplierFactor || 2);
            }

            // Attempt to match driver by vehicle plate
            const cleanPlate = (d.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const matchingVeh = vehicles.find((v) => v.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate);
            if (matchingVeh && matchingVeh.assignedDriverId) {
              const drv = drivers.find((dr) => dr.id === matchingVeh.assignedDriverId);
              if (drv) {
                setDriverId(drv.id);
                setDriverName(drv.name);
              }
            } else if (d.driverName) {
              setDriverName(d.driverName);
            }

            setAiSource(res.source || 'gemini-flash-latest');
            setStatusMessage(`✅ Dados extraídos com sucesso via ${res.source || 'Google Gemini AI'}!`);
          } else {
            setStatusMessage('⚠️ A IA leu parcialmente o documento. Complete os campos necessários abaixo.');
          }
        } catch (err: any) {
          setStatusMessage(`Aviso: ${err?.message || 'Falha na leitura automática. Preencha os campos abaixo.'}`);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsProcessing(false);
      setFormError('Erro ao carregar o arquivo selecionado.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSelectCtbCode = (code: string) => {
    const found = COMMON_CTB_CODES.find((c) => c.code === code);
    if (found) {
      setInfractionCode(found.code);
      setInfractionDescription(found.desc);
      const val = found.value;
      const effectiveMult = isDoubledFine ? 2 : 1;
      const total = Number((val * effectiveMult).toFixed(2));
      setFineAmount(total);
      setOriginalAmount(val);
      setDiscountAmount(Number((total * 0.8).toFixed(2)));
      setAdminFee(Number((total * 0.1).toFixed(3)));
    }
  };

  const handleToggleDoubled = (doubled: boolean) => {
    setIsDoubledFine(doubled);
    const factor = doubled ? 2 : 1;
    setMultiplierFactor(factor);
    const newTotal = Number((originalAmount * factor).toFixed(2));
    setFineAmount(newTotal);
    setDiscountAmount(Number((newTotal * 0.8).toFixed(2)));
    setAdminFee(Number((newTotal * 0.1).toFixed(3)));
  };

  const handleLoadSample = (sampleType: 'radar' | 'ca' | 'celular') => {
    const randomAit = `AIT-${Math.floor(100000000 + Math.random() * 900000000)}`;
    const randomVeh = vehicles[Math.floor(Math.random() * vehicles.length)] || { plate: 'TDX1E88' };
    const randomDrv = drivers[Math.floor(Math.random() * drivers.length)] || { name: 'CARLOS EDUARDO SILVA', id: 'drv-01' };

    setAitNumber(randomAit);
    setPlate(randomVeh.plate);
    setDriverId(randomDrv.id);
    setDriverName(randomDrv.name);
    setInfractionDate(new Date().toISOString().slice(0, 16));
    setCity('São Paulo');
    setState('SP');

    if (sampleType === 'radar') {
      setInfractionLocation('SP-330 Rod. Anhanguera, KM 084 - Pista Sul');
      handleSelectCtbCode('745-50');
      setIssuingAuthority('DER');
    } else if (sampleType === 'ca') {
      setTargetType('operacao-ca');
      setInfractionLocation('BR-381 KM 870, Sentido SP/MG - Operação C.A');
      setInfractionCode('746-30');
      setInfractionDescription('Transitar em velocidade superior à máxima permitida em mais de 20% até 50%');
      setOriginalAmount(195.23);
      setFineAmount(195.23);
      setDiscountAmount(156.18);
      setAdminFee(19.523);
      setIssuingAuthority('PRF');
      setNominatedName('P-LOG TRANSPORTES');
    } else {
      setInfractionLocation('Av. Marginal Tietê, próximo à Ponte das Bandeiras');
      handleSelectCtbCode('736-62');
      setIssuingAuthority('CET');
    }

    setAiSource('modelo-simulado-ia');
    setStatusMessage('Exemplo preenchido! Confira os dados e clique em Salvar.');
  };

  const handleSave = async () => {
    setFormError('');
    const cleanAit = (aitNumber || '').trim().toUpperCase();
    const cleanPlate = (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleanAit) {
      setFormError('Informe o número do Auto de Infração (AIT).');
      return;
    }
    if (!cleanPlate || cleanPlate.length < 6) {
      setFormError('Informe uma placa válida.');
      return;
    }

    setIsSaving(true);
    try {
      if (targetType === 'operacao-ca') {
        const caItem: OperacaoCAItem = {
          id: `ca-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ait: cleanAit,
          plate: cleanPlate,
          driverName: driverName.trim().toUpperCase() || undefined,
          driverId: driverId || undefined,
          infractionDescription: infractionDescription.trim(),
          originalValue: Number(fineAmount) || 130.16,
          emailNoticeDate: infractionDate ? infractionDate.replace('T', ' ') : new Date().toISOString().slice(0, 10),
          nominationDeadline: nominationDeadline || undefined,
          nominatedName: nominatedName || 'P-LOG TRANSPORTES',
          discountPaymentDeadline: dueDate || undefined,
          notificationStatus: 'Notificado via Google AI',
          infractionLocation: infractionLocation || 'Operação C.A',
          adminFee: Number(adminFee) || Number((fineAmount * 0.1).toFixed(3)),
          driverStatusCompetence: 'Operação C.A',
          year: new Date().getFullYear(),
          payrollDeduction: payrollDeduction || 'Sim-F.Log',
          appealStatus: 'Não',
          totalValue: Number((Number(fineAmount) + Number(adminFee)).toFixed(2)),
          paymentStatus: paymentStatus,
          createdAt: new Date().toISOString().slice(0, 10),
        };

        if (onSaveOperacaoCAItem) {
          await onSaveOperacaoCAItem(caItem);
        }
      } else {
        const newFine: TrafficFine = {
          id: `fine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          aitNumber: cleanAit,
          plate: cleanPlate,
          infractionDate: infractionDate || new Date().toISOString(),
          infractionLocation: infractionLocation || 'Via Pública',
          city: city || 'São Paulo',
          state: state || 'SP',
          infractionCode: infractionCode || '745-50',
          infractionDescription: infractionDescription || 'Infração de Trânsito',
          fineAmount: Number(fineAmount) || 130.16,
          discountAmount: Number(discountAmount) || Number((fineAmount * 0.8).toFixed(2)),
          originalAmount: Number(originalAmount) || Number(fineAmount) || 130.16,
          isDoubledFine: isDoubledFine,
          multiplierFactor: multiplierFactor,
          isNicFine: isDoubledFine,
          ownerCnpjRazaoSocial: 'P-LOG TRANSPORTES & C.A',
          driverId: driverId || undefined,
          driverName: driverName ? driverName.trim().toUpperCase() : undefined,
          dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          status: 'PENDENTE',
          severity: isDoubledFine ? 'GRAVISSIMA' : fineAmount >= 293 ? 'GRAVISSIMA' : fineAmount >= 195 ? 'GRAVE' : 'MEDIA',
          points: isDoubledFine ? 0 : 4,
          issuingAuthority: (issuingAuthority as TrafficFine['issuingAuthority']) || 'DETRAN',
          pdfFileName: selectedFile?.name || `AIT_${cleanAit}_${cleanPlate}.pdf`,
          pdfDataUrl: fileBase64 || undefined,
          pdfMimeType: selectedFile?.type || 'application/pdf',
          importedAt: new Date().toISOString(),
          isDetranSynced: false,
          notes: `Importado com sucesso via Google Gemini AI (${aiSource || 'gemini-flash-latest'})`,
          termSigned: false,
        };

        await onSaveFine(newFine);
      }

      onClose();
    } catch (err: any) {
      setFormError(`Erro ao salvar: ${err?.message || 'Falha ao sincronizar'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="ai-fine-import-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="ai-fine-import-modal-card"
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-6 overflow-hidden animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Importação Inteligente com Google AI
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                  Google Gemini Multimodal
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Faça upload da Notificação (PDF ou Imagem) para leitura instantânea de AIT, placa, CTB e valores
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[82vh] overflow-y-auto space-y-5">
          {/* Target Selection: Multas de Trânsito ou Operação C.A */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Destino do Cadastro:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType('general')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  targetType === 'general'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <FileWarning className={`w-5 h-5 shrink-0 mt-0.5 ${targetType === 'general' ? 'text-white' : 'text-blue-600'}`} />
                <div>
                  <div className="font-bold text-xs sm:text-sm">Multas de Trânsito Geral</div>
                  <div className={`text-[11px] mt-0.5 ${targetType === 'general' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Cadastro principal de AITs, pontuação na CNH e relatórios
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('operacao-ca')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  targetType === 'operacao-ca'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Briefcase className={`w-5 h-5 shrink-0 mt-0.5 ${targetType === 'operacao-ca' ? 'text-white' : 'text-amber-600'}`} />
                <div>
                  <div className="font-bold text-xs sm:text-sm">Operação C.A & Logística P-LOG</div>
                  <div className={`text-[11px] mt-0.5 ${targetType === 'operacao-ca' ? 'text-amber-100' : 'text-slate-500'}`}>
                    Planilha dedicada com taxa administrativa (10%) e desconto em folha
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isProcessing
                ? 'border-blue-400 bg-blue-50/50'
                : selectedFile
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-slate-300 hover:border-blue-500 bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            {isProcessing ? (
              <div className="space-y-3 py-4">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-900">
                  Google Gemini AI processando o documento...
                </p>
                <p className="text-xs text-slate-500">
                  Extraindo AIT, placa, CTB, local e valores sem perder dados
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Arraste o PDF ou foto da notificação da multa aqui
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Formatos suportados: PDF oficial Detran/SENATRAN/PRF, JPG, PNG
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Selecionar Arquivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Tirar Foto com a Câmera</span>
                  </button>
                </div>

                {/* Quick Simulation Buttons */}
                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-[11px] text-slate-500 font-semibold">Testar com modelo rápido:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('ca')}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Exemplo Operação C.A (Velocidade)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('radar')}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Exemplo Radar Rodoviário (745-50)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('celular')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Exemplo Celular (736-62)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMessage.includes('✅')
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {statusMessage.includes('✅') ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Form Error */}
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Duplicate Warning */}
          {isDuplicate && (
            <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-black">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Aviso de Duplicidade: O Auto AIT {aitNumber} já existe no sistema!</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Ao salvar, o registro existente no Supabase e na visualização será atualizado sem criar duplicidade.
              </p>
            </div>
          )}

          {/* Extracted Fields Form */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Dados Auditados do Auto de Infração (AIT)</span>
              </h4>
              {aiSource && (
                <span className="text-[10px] font-mono text-slate-500">
                  Motor: {aiSource}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Número do Auto (AIT) *
                </label>
                <input
                  type="text"
                  value={aitNumber}
                  onChange={(e) => setAitNumber(e.target.value.toUpperCase())}
                  placeholder="Ex: 2167909384"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Placa do Veículo *
                </label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="Ex: TDX1E88"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs uppercase font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Data e Hora da Infração *
                </label>
                <input
                  type="datetime-local"
                  value={infractionDate}
                  onChange={(e) => setInfractionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Local da Infração
                </label>
                <input
                  type="text"
                  value={infractionLocation}
                  onChange={(e) => setInfractionLocation(e.target.value)}
                  placeholder="Ex: SP-330 Rodovia Anhanguera, KM 84"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Município / UF
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Município"
                    className="col-span-2 px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={state}
                    maxLength={2}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="UF"
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs uppercase font-bold text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Cód. CTB
                </label>
                <input
                  type="text"
                  value={infractionCode}
                  onChange={(e) => setInfractionCode(e.target.value)}
                  placeholder="Ex: 745-50"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Descrição do Enquadramento
                </label>
                <input
                  type="text"
                  value={infractionDescription}
                  onChange={(e) => setInfractionDescription(e.target.value)}
                  placeholder="Ex: Transitar em velocidade superior à máxima permitida em até 20%"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Values & Deadlines */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Valor da Multa (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={fineAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setFineAmount(val);
                      setOriginalAmount(val);
                      setDiscountAmount(Number((val * 0.8).toFixed(2)));
                      setAdminFee(Number((val * 0.1).toFixed(3)));
                    }}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 font-mono text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Vencimento com Desconto
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Órgão Autuador
                </label>
                <select
                  value={issuingAuthority}
                  onChange={(e) => setIssuingAuthority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="DETRAN">DETRAN</option>
                  <option value="PRF">PRF (Polícia Rodoviária Federal)</option>
                  <option value="DER">DER (Dep. Estradas e Rodagem)</option>
                  <option value="DNIT">DNIT</option>
                  <option value="CET">CET / Município</option>
                  <option value="SENATRAN">SENATRAN</option>
                </select>
              </div>
            </div>

            {/* Driver Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Vincular Motorista Cadastrado
                </label>
                <select
                  value={driverId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setDriverId(selId);
                    const found = drivers.find((d) => d.id === selId);
                    if (found) setDriverName(found.name);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Selecione da Lista de Motoristas --</option>
                  {drivers.map((drv) => (
                    <option key={drv.id} value={drv.id}>
                      {drv.name} (CPF: {drv.cpf} - CNH: {drv.cnhNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nome do Condutor (Informado no AIT)
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value.toUpperCase())}
                  placeholder="Nome do Condutor no AIT"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs uppercase font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Target Specific Extra Fields */}
            {targetType === 'operacao-ca' ? (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider block">
                  Configurações Operação C.A & Desconto em Folha
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-amber-900 block mb-1">
                      Taxa Administrativa (10%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={adminFee}
                      onChange={(e) => setAdminFee(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-900 block mb-1">
                      Desconto em Folha
                    </label>
                    <select
                      value={payrollDeduction}
                      onChange={(e) => setPayrollDeduction(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Sim-F.Log">Sim-F.Log</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-900 block mb-1">
                      Status Pagamento
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="PAGO">PAGO</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Opção: Multa Dobrada (Fator 2x - NIC PJ Art. 257 § 8º CTB)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Aplica valor dobrado (2x) sem pontuação na CNH do condutor
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isDoubledFine}
                    onChange={(e) => handleToggleDoubled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            {targetType === 'general' ? 'Destino: Multas de Trânsito' : 'Destino: Planilha Operação C.A'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isProcessing}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                targetType === 'general'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Salvando no Supabase & Vercel...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar e Sincronizar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
