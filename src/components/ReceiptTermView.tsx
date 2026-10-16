import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
  CheckCircle2,
  FileWarning,
  DollarSign,
  Plus,
  Trash2,
  PenTool,
  Scissors,
  Building,
  AlertTriangle,
  Eye,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Driver, DriverReceiptTerm, TrafficFine, Vehicle } from '../types';
import { formatCurrency, formatDate, maskDate, maskDateTime } from '../lib/formatters';
import {
  PrintableDocumentPayload,
  buildTermPrintPayload,
  triggerNativeHtmlPrint,
} from '../lib/printService';

export type PrintDocumentMode = 'AMBOS' | 'APENAS_TERMO' | 'APENAS_RECIBO';

interface ReceiptTermViewProps {
  fines: TrafficFine[];
  drivers: Driver[];
  vehicles: Vehicle[];
  terms: DriverReceiptTerm[];
  selectedFineForTerm: TrafficFine | null;
  onSaveTerm: (term: DriverReceiptTerm) => void;
  onSignTerm: (termId: string) => void;
  onDeleteTerm: (termId: string) => void;
  onOpenPrintModal?: (payload: PrintableDocumentPayload) => void;
  companyName?: string;
  companyCnpj?: string;
}

function sanitizeCompanyField(val?: string): string {
  if (!val) return '';
  if (/transbra[s]?il|translogistica|14\.285\.932/i.test(val)) {
    return '';
  }
  return val;
}

export const ReceiptTermView: React.FC<ReceiptTermViewProps> = ({
  fines,
  drivers,
  vehicles,
  terms,
  selectedFineForTerm,
  onSaveTerm,
  onSignTerm,
  onDeleteTerm,
  onOpenPrintModal,
  companyName = '',
  companyCnpj = '',
}) => {
  const [selectedFineId, setSelectedFineId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [aitNumber, setAitNumber] = useState<string>('');
  const [plate, setPlate] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverCpf, setDriverCpf] = useState<string>('');
  const [driverCnh, setDriverCnh] = useState<string>('');
  const [notificationDate, setNotificationDate] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [infractionDate, setInfractionDate] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  });
  const [infractionLocation, setInfractionLocation] = useState<string>('');
  const [cityState, setCityState] = useState<string>('São Paulo/SP');
  const [infractionCode, setInfractionCode] = useState<string>('7455-0');
  const [infractionDescription, setInfractionDescription] = useState<string>(
    'Transitar em velocidade superior à máxima permitida em até 20%'
  );
  const [points, setPoints] = useState<number>(4);
  const [issuingAuthority, setIssuingAuthority] = useState<string>('DER');
  const [originalFineAmount, setOriginalFineAmount] = useState<number>(130.16);
  const [isDoubledFine, setIsDoubledFine] = useState<boolean>(false);
  const [useSneDiscount, setUseSneDiscount] = useState<boolean>(false);
  const [installments, setInstallments] = useState<number>(1);
  const [payrollMonth, setPayrollMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [employerName, setEmployerName] = useState<string>(() => sanitizeCompanyField(companyName));
  const [employerCnpj, setEmployerCnpj] = useState<string>(() => sanitizeCompanyField(companyCnpj));
  const [observations, setObservations] = useState<string>(
    'Desconto autorizado nos termos do Art. 462, § 1º da CLT e cláusula contratual de responsabilidade por infrações de trânsito.'
  );
  const [activePreviewTerm, setActivePreviewTerm] = useState<DriverReceiptTerm | null>(null);
  const [digitalSignatureTyped, setDigitalSignatureTyped] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);
  const [printMode, setPrintMode] = useState<PrintDocumentMode>('AMBOS');

  // Check if there is already an emitted term for the current AIT or Fine ID (prevents duplicate emission)
  const existingTermForCurrentAit = useMemo(() => {
    const cleanAit = aitNumber.trim().toUpperCase();
    if (!cleanAit && !selectedFineId) return null;
    return (
      terms.find(
        (t) =>
          (selectedFineId && t.fineId === selectedFineId) ||
          (cleanAit.length >= 3 && t.aitNumber.trim().toUpperCase() === cleanAit)
      ) || null
    );
  }, [terms, aitNumber, selectedFineId]);

  const loadTermIntoForm = (term: DriverReceiptTerm) => {
    setActivePreviewTerm(term);
    setSelectedFineId(term.fineId || '');
    setSelectedDriverId(term.driverId || '');
    setAitNumber(term.aitNumber);
    setPlate(term.plate);
    setVehicleModel(term.vehicleModel);
    setDriverName(term.driverName);
    setDriverCpf(term.driverCpf);
    setDriverCnh(term.driverCnh);
    setInfractionDate(term.infractionDate);
    setInfractionLocation(term.infractionLocation);
    setCityState(term.cityState);
    setInfractionCode(term.infractionCode);
    setInfractionDescription(term.infractionDescription);
    setPoints(term.originalPoints ?? (term.points > 0 ? term.points : 4));
    setIssuingAuthority(term.issuingAuthority);
    setOriginalFineAmount(term.originalFineAmount);
    setIsDoubledFine(Boolean(term.isDoubledFine));
    setUseSneDiscount(term.useSneDiscount);
    setInstallments(term.installments);
    setPayrollMonth(term.payrollMonth);
    setEmployerName(sanitizeCompanyField(term.companyName));
    setEmployerCnpj(sanitizeCompanyField(term.companyCnpj));
    if (term.observations) {
      setObservations(term.observations);
    }
  };

  // Populate from selectedFineForTerm when navigated from FinesView or FineDetailModal
  useEffect(() => {
    if (selectedFineForTerm) {
      populateFromFine(selectedFineForTerm);
    } else if (fines.length > 0 && !selectedFineId && !aitNumber) {
      populateFromFine(fines[0]);
    }
  }, [selectedFineForTerm]);

  const populateFromFine = (fine: TrafficFine) => {
    // First check if a term was already emitted for this fine or AIT
    const alreadyEmitted = terms.find(
      (t) =>
        t.fineId === fine.id ||
        t.aitNumber.trim().toUpperCase() === fine.aitNumber.trim().toUpperCase()
    );

    if (alreadyEmitted) {
      loadTermIntoForm(alreadyEmitted);
      setSaveNotice({
        type: 'warning',
        text: `Termo/Recibo já emitido para o AIT ${fine.aitNumber} (Protocolo ${alreadyEmitted.protocolNumber}). O documento existente foi carregado para impressão ou atualização, evitando duplicidade.`,
      });
      return;
    }

    setActivePreviewTerm(null);
    setSelectedFineId(fine.id);
    setAitNumber(fine.aitNumber);
    setPlate(fine.plate);

    const matchedVehicle = vehicles.find(
      (v) => v.plate.toUpperCase() === fine.plate.toUpperCase()
    );
    setVehicleModel(matchedVehicle?.brandModel || 'Veículo da Frota');

    const matchedDriver =
      drivers.find((d) => d.id === fine.driverId) ||
      (matchedVehicle?.assignedDriverId
        ? drivers.find((d) => d.id === matchedVehicle.assignedDriverId)
        : undefined);

    if (matchedDriver) {
      setSelectedDriverId(matchedDriver.id);
      setDriverName(matchedDriver.name);
      setDriverCpf(matchedDriver.cpf);
      setDriverCnh(`${matchedDriver.cnhNumber} (Cat. ${matchedDriver.cnhCategory})`);
    } else {
      setDriverName(fine.driverName || '');
    }

    const fineIsAlreadyDoubled = Boolean(
      fine.isDoubledFine || (fine.multiplierFactor && fine.multiplierFactor > 1)
    );
    const baseAmount1x =
      fine.originalAmount ||
      (fineIsAlreadyDoubled
        ? Number((fine.fineAmount / (fine.multiplierFactor || 2)).toFixed(2))
        : fine.fineAmount);

    setInfractionDate(fine.infractionDate);
    setInfractionLocation(fine.infractionLocation);
    setCityState(`${fine.city}/${fine.state}`);
    setInfractionCode(fine.infractionCode);
    setInfractionDescription(fine.infractionDescription);
    setPoints(fine.points > 0 ? fine.points : 4);
    setIssuingAuthority(fine.issuingAuthority);
    setOriginalFineAmount(baseAmount1x);
    setIsDoubledFine(fineIsAlreadyDoubled);

    const cleanOwner = sanitizeCompanyField(fine.ownerCnpjRazaoSocial);
    if (cleanOwner && !employerName) {
      setEmployerName(cleanOwner);
    }
  };

  const handleSelectFineDropdown = (fineId: string) => {
    setSelectedFineId(fineId);
    const found = fines.find((f) => f.id === fineId);
    if (found) {
      populateFromFine(found);
    }
  };

  const handleSelectDriverDropdown = (drvId: string) => {
    setSelectedDriverId(drvId);
    const found = drivers.find((d) => d.id === drvId);
    if (found) {
      setDriverName(found.name);
      setDriverCpf(found.cpf);
      setDriverCnh(`${found.cnhNumber} (Cat. ${found.cnhCategory})`);
      if (found.assignedVehiclePlate) {
        setPlate(found.assignedVehiclePlate);
        const matchVeh = vehicles.find(
          (v) => v.plate.toUpperCase() === found.assignedVehiclePlate?.toUpperCase()
        );
        if (matchVeh) {
          setVehicleModel(matchVeh.brandModel);
        }
      }
    }
  };

  const handleSelectVehicleDropdown = (plateVal: string) => {
    setPlate(plateVal.toUpperCase());
    const matchVeh = vehicles.find(
      (v) => v.plate.toUpperCase() === plateVal.toUpperCase()
    );
    if (matchVeh) {
      setVehicleModel(matchVeh.brandModel);
      if (matchVeh.assignedDriverId) {
        handleSelectDriverDropdown(matchVeh.assignedDriverId);
      }
    }
  };

  const effectiveFineAmountBeforeDiscount = isDoubledFine
    ? Number((originalFineAmount * 2).toFixed(2))
    : Number(originalFineAmount.toFixed(2));

  const finalDeductedAmount = useSneDiscount
    ? Number((effectiveFineAmountBeforeDiscount * 0.8).toFixed(2))
    : effectiveFineAmountBeforeDiscount;

  const effectivePoints = isDoubledFine ? 0 : points;

  const installmentValue = Number((finalDeductedAmount / Math.max(1, installments)).toFixed(2));

  const effectiveCompanyName = sanitizeCompanyField(employerName) || 'Setor de Gestão de Frota / RH';
  const effectiveCompanyCnpj = sanitizeCompanyField(employerCnpj);

  const currentPreviewTerm: DriverReceiptTerm = {
    id: existingTermForCurrentAit?.id || activePreviewTerm?.id || 'preview-term',
    protocolNumber:
      existingTermForCurrentAit?.protocolNumber ||
      activePreviewTerm?.protocolNumber ||
      `TRM-${new Date().getFullYear()}-${String(terms.length + 1).padStart(4, '0')}`,
    fineId: selectedFineId || existingTermForCurrentAit?.fineId || undefined,
    aitNumber: aitNumber || 'AIT-000000',
    plate: plate || 'AAA0A00',
    vehicleModel: vehicleModel || 'Veículo Comercial',
    driverId: selectedDriverId || existingTermForCurrentAit?.driverId || undefined,
    driverName: driverName || 'NOME DO MOTORISTA PROFISSIONAL',
    driverCpf: driverCpf || '000.000.000-00',
    driverCnh: driverCnh || '00000000000',
    infractionDate: infractionDate,
    infractionLocation: infractionLocation || 'Local da Infração conforme Notificação',
    cityState: cityState || 'São Paulo/SP',
    infractionCode: infractionCode || '7455-0',
    infractionDescription: infractionDescription,
    points: effectivePoints,
    originalPoints: points,
    issuingAuthority: issuingAuthority,
    originalFineAmount: originalFineAmount,
    finalDeductedAmount: finalDeductedAmount,
    isDoubledFine: isDoubledFine,
    useSneDiscount: useSneDiscount,
    installments: installments,
    installmentValue: installmentValue,
    payrollMonth: payrollMonth,
    companyName: effectiveCompanyName,
    companyCnpj: effectiveCompanyCnpj,
    status:
      existingTermForCurrentAit?.status === 'ASSINADO' ||
      activePreviewTerm?.status === 'ASSINADO' ||
      digitalSignatureTyped.trim().length > 3
        ? 'ASSINADO'
        : 'PENDENTE_ASSINATURA',
    signedAt:
      existingTermForCurrentAit?.signedAt ||
      activePreviewTerm?.signedAt ||
      (digitalSignatureTyped.trim().length > 3 ? new Date().toISOString() : undefined),
    signatureHash:
      existingTermForCurrentAit?.signatureHash ||
      activePreviewTerm?.signatureHash ||
      (digitalSignatureTyped.trim().length > 3
        ? `SHA256-${Math.random().toString(36).substring(2, 12).toUpperCase()}`
        : undefined),
    observations: observations,
    createdAt: existingTermForCurrentAit?.createdAt || activePreviewTerm?.createdAt || new Date().toISOString().slice(0, 10),
  };

  const handleGenerateAndSaveTerm = (markAsSigned: boolean) => {
    if (!driverName.trim() || !aitNumber.trim() || !plate.trim()) {
      setSaveNotice({
        type: 'warning',
        text: 'Preencha ao menos o Nome do Motorista, Nº do AIT e Placa do Veículo para emitir o termo ou recibo.',
      });
      return;
    }

    const isUpdatingExisting = Boolean(existingTermForCurrentAit);
    const targetId = existingTermForCurrentAit?.id || `term-${Date.now().toString().slice(-6)}`;
    const targetProtocol =
      existingTermForCurrentAit?.protocolNumber ||
      `TRM-${new Date().getFullYear()}-${String(terms.length + 1).padStart(4, '0')}`;

    const isSignedNow =
      markAsSigned ||
      existingTermForCurrentAit?.status === 'ASSINADO' ||
      digitalSignatureTyped.trim().length > 3;

    const termToSave: DriverReceiptTerm = {
      ...currentPreviewTerm,
      id: targetId,
      protocolNumber: targetProtocol,
      status: isSignedNow ? 'ASSINADO' : 'PENDENTE_ASSINATURA',
      signedAt: isSignedNow
        ? existingTermForCurrentAit?.signedAt || new Date().toISOString()
        : undefined,
      signatureHash: isSignedNow
        ? existingTermForCurrentAit?.signatureHash || `ASSINATURA-${Date.now().toString(36).toUpperCase()}`
        : undefined,
    };

    onSaveTerm(termToSave);
    setActivePreviewTerm(termToSave);

    if (isUpdatingExisting) {
      setSaveNotice({
        type: 'warning',
        text: `Termo/Recibo ${termToSave.protocolNumber} (AIT ${termToSave.aitNumber}) atualizado sem duplicar registro!`,
      });
    } else {
      setSaveNotice({
        type: 'success',
        text: markAsSigned
          ? `Termo ${termToSave.protocolNumber} emitido e assinado com sucesso!`
          : `Termo ${termToSave.protocolNumber} gerado e salvo! Pronto para impressão.`,
      });
    }
    setTimeout(() => setSaveNotice(null), 6000);
  };

  // Dedicated Print Function that opens the Interactive Print Preview Modal + PDF generator
  const triggerPrintDocument = (mode: PrintDocumentMode = printMode, termOverride?: DriverReceiptTerm) => {
    const termToPrint = termOverride || currentPreviewTerm;
    if (termOverride) {
      loadTermIntoForm(termOverride);
    }
    setPrintMode(mode);

    const payload = buildTermPrintPayload(termToPrint, mode);
    if (onOpenPrintModal) {
      onOpenPrintModal(payload);
    } else {
      triggerNativeHtmlPrint(payload.htmlContent);
    }
  };

  const handleDirectDownloadPdf = (mode: PrintDocumentMode = printMode, termOverride?: DriverReceiptTerm) => {
    const termToPrint = termOverride || currentPreviewTerm;
    const payload = buildTermPrintPayload(termToPrint, mode);
    payload.onDownloadPdf();
  };

  return (
    <div id="receipt-term-view" className="space-y-6 animate-fade-in">
      {/* Header Banner (No Print) */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Termo de Ciência de Multas & Recibo de Desconto em Folha</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Emissão sem duplicidade e opção de impressão direta do Termo de Ciência (Art. 462 § 1º CLT) ou Recibo de Multa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Visualizar / Ver Termo Button */}
          <button
            type="button"
            onClick={() => triggerPrintDocument('AMBOS')}
            className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="Visualizar Termo Completo na tela antes de imprimir"
          >
            <Eye className="w-4 h-4" />
            <span>Visualizar / Ver Termo</span>
          </button>

          <button
            type="button"
            onClick={() => handleGenerateAndSaveTerm(false)}
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {existingTermForCurrentAit ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Atualizar Termo Existente</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Emitir e Salvar Termo</span>
              </>
            )}
          </button>

          {/* Direct Print Options: Termo + Recibo, Apenas Termo, Apenas Recibo */}
          <button
            type="button"
            onClick={() => triggerPrintDocument('AMBOS')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5"
            title="Imprimir folha A4 com o Termo de Ciência + Recibo do Motorista"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Termo + Recibo (2 Vias)</span>
          </button>

          <button
            type="button"
            onClick={() => triggerPrintDocument('APENAS_TERMO')}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 transition-all flex items-center gap-1.5"
            title="Imprimir somente o Termo de Ciência e Desconto em Folha"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>Imprimir Só Termo</span>
          </button>

          <button
            type="button"
            onClick={() => triggerPrintDocument('APENAS_RECIBO')}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Imprimir somente o Recibo da Multa para o Motorista"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            <span>Imprimir Só Recibo</span>
          </button>

          <button
            type="button"
            onClick={() => handleDirectDownloadPdf(printMode)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="Baixar arquivo PDF A4 pronto para impressão"
          >
            <Download className="w-4 h-4" />
            <span>Baixar PDF</span>
          </button>
        </div>
      </div>

      {/* Duplicate Prevention Alert Banner when AIT already has an emitted Term/Receipt */}
      {existingTermForCurrentAit && (
        <div className="no-print p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-black text-amber-950">
                Aviso de Controle de Duplicidade — Termo/Recibo Já Emitido para o AIT {existingTermForCurrentAit.aitNumber}
              </p>
              <p className="text-amber-900">
                Já consta o protocolo <strong>{existingTermForCurrentAit.protocolNumber}</strong> emitido para o motorista{' '}
                <strong>{existingTermForCurrentAit.driverName}</strong> (Placa {existingTermForCurrentAit.plate}). O sistema bloqueia a duplicação e permite imprimir ou atualizar este mesmo documento.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => triggerPrintDocument('AMBOS', existingTermForCurrentAit)}
              className="px-3 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Agora</span>
            </button>
          </div>
        </div>
      )}

      {saveNotice && (
        <div
          className={`no-print p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            saveNotice.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {saveNotice.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{saveNotice.text}</span>
        </div>
      )}

      {/* Configuration & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Term Builder Form (Hidden on Print) */}
        <div className="no-print lg:col-span-5 space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600" />
                <span>Configurar Dados do Termo e Recibo</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActivePreviewTerm(null);
                  setSelectedFineId('');
                  setAitNumber('');
                  setPlate('');
                  setDriverName('');
                  setDriverCpf('');
                  setDriverCnh('');
                  setSaveNotice(null);
                }}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Limpar Campos
              </button>
            </div>

            {/* Quick Select Existing Fine */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1. Selecionar Multa Cadastrada (Opcional)
              </label>
              <select
                value={selectedFineId}
                onChange={(e) => {
                  setActivePreviewTerm(null);
                  handleSelectFineDropdown(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- Preencher manualmente ou escolher AIT --</option>
                {fines.map((f) => {
                  const hasTerm = terms.some(
                    (t) =>
                      t.fineId === f.id ||
                      t.aitNumber.trim().toUpperCase() === f.aitNumber.trim().toUpperCase()
                  );
                  return (
                    <option key={f.id} value={f.id}>
                      AIT {f.aitNumber} • Placa {f.plate} • {formatCurrency(f.fineAmount)}{' '}
                      {hasTerm ? '[TERMO JÁ EMITIDO]' : `(${f.driverName || 'Sem condutor'})`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Quick Select Driver */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Selecionar Motorista Responsável
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => {
                  setActivePreviewTerm(null);
                  handleSelectDriverDropdown(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- Selecionar motorista cadastrado ou digitar abaixo --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} • CPF {d.cpf} • CNH {d.cnhNumber}
                    {d.isPlogDriver || d.operationType === 'PLOG' ? ' [P-LOG]' : ''}
                    {d.assignedVehiclePlate ? ` (Placa: ${d.assignedVehiclePlate})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Select Vehicle to Link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. Vincular Veículo da Frota (Placa)
              </label>
              <select
                value={plate}
                onChange={(e) => {
                  setActivePreviewTerm(null);
                  handleSelectVehicleDropdown(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono font-bold"
              >
                <option value="">-- Selecionar veículo cadastrado ou digitar placa abaixo --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.plate}>
                    {v.plate} — {v.brandModel || 'Veículo'}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nome Completo do Motorista *
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => {
                    setActivePreviewTerm(null);
                    setDriverName(e.target.value);
                  }}
                  placeholder="Ex: Marcos Vinícius de Oliveira"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">CPF do Motorista *</label>
                <input
                  type="text"
                  value={driverCpf}
                  onChange={(e) => {
                    setActivePreviewTerm(null);
                    setDriverCpf(e.target.value);
                  }}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nº Registro CNH</label>
                <input
                  type="text"
                  value={driverCnh}
                  onChange={(e) => {
                    setActivePreviewTerm(null);
                    setDriverCnh(e.target.value);
                  }}
                  placeholder="00000000000 (Cat. E)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Employer / Company Optional Fields (Clean, no TransBrasil) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Empresa / Empregador (Cabeçalho)
                </label>
                <input
                  type="text"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  placeholder="Nome da sua empresa ou setor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  CNPJ / Documento (Opcional)
                </label>
                <input
                  type="text"
                  value={employerCnpj}
                  onChange={(e) => setEmployerCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            {/* AIT & Vehicle Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nº Auto (AIT) *</label>
                <input
                  type="text"
                  value={aitNumber}
                  onChange={(e) => {
                    setActivePreviewTerm(null);
                    setAitNumber(e.target.value.toUpperCase());
                  }}
                  placeholder="R9081294-8"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Placa *</label>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => {
                    setActivePreviewTerm(null);
                    setPlate(e.target.value.toUpperCase());
                  }}
                  placeholder="BRA2E19"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cód. Infração</label>
                <input
                  type="text"
                  value={infractionCode}
                  onChange={(e) => {
                    setActivePreviewTerm(null);
                    setInfractionCode(e.target.value);
                  }}
                  placeholder="7455-0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Local da Infração</label>
              <input
                type="text"
                value={infractionLocation}
                onChange={(e) => {
                  setActivePreviewTerm(null);
                  setInfractionLocation(e.target.value);
                }}
                placeholder="Rodovia Castelo Branco, KM 32 - Barueri/SP"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            {/* Máscaras de Datas: Notificação e Infração */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Data da Notificação (DD/MM/AAAA HH:MM)
                </label>
                <input
                  type="text"
                  value={notificationDate}
                  onChange={(e) => {
                    setActivePreviewTerm(null);
                    setNotificationDate(maskDateTime(e.target.value));
                  }}
                  maxLength={16}
                  placeholder="DD/MM/AAAA HH:MM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Data da Infração (DD/MM/AAAA)
                </label>
                <input
                  type="text"
                  value={infractionDate}
                  onChange={(e) => {
                    setActivePreviewTerm(null);
                    setInfractionDate(maskDate(e.target.value));
                  }}
                  maxLength={10}
                  placeholder="DD/MM/AAAA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Payroll Deduction Settings */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
              <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-700" />
                <span>Condições de Desconto em Folha de Pagamento</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Valor Base da Multa (1x)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={originalFineAmount}
                    onChange={(e) => {
                      setActivePreviewTerm(null);
                      setOriginalFineAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Parcelas na Folha</label>
                  <select
                    value={installments}
                    onChange={(e) => {
                      setActivePreviewTerm(null);
                      setInstallments(Number(e.target.value));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value={1}>1x de {formatCurrency(finalDeductedAmount)} (À vista)</option>
                    <option value={2}>2x de {formatCurrency(finalDeductedAmount / 2)}</option>
                    <option value={3}>3x de {formatCurrency(finalDeductedAmount / 3)}</option>
                    <option value={4}>4x de {formatCurrency(finalDeductedAmount / 4)}</option>
                    <option value={5}>5x de {formatCurrency(finalDeductedAmount / 5)}</option>
                    <option value={6}>6x de {formatCurrency(finalDeductedAmount / 6)}</option>
                    <option value={10}>10x de {formatCurrency(finalDeductedAmount / 10)}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mês/Folha Inicial</label>
                  <input
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => {
                      setActivePreviewTerm(null);
                      setPayrollMonth(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Opção de Dobrar o Pagamento da Multa para Não Indicar Pontuação na CNH */}
              <div
                onClick={() => {
                  setActivePreviewTerm(null);
                  setIsDoubledFine((prev) => !prev);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isDoubledFine
                    ? 'bg-amber-100/90 border-amber-400 text-amber-950 shadow-2xs'
                    : 'bg-white border-slate-300 hover:border-blue-400 text-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-start gap-2.5 text-xs font-bold cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isDoubledFine}
                      onChange={(e) => {
                        setActivePreviewTerm(null);
                        setIsDoubledFine(e.target.checked);
                      }}
                      className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 shrink-0"
                    />
                    <div>
                      <span className="block text-slate-900">
                        Dobrar Pagamento da Multa (2x = {formatCurrency(originalFineAmount * 2)}) — Sem Pontos na CNH
                      </span>
                      <span className="block text-[11px] font-normal text-slate-600 mt-0.5">
                        {isDoubledFine
                          ? 'Ativado: O motorista pagará a multa dobrada para não indicar pontuação na sua CNH nem de terceiros (0 pontos na CNH).'
                          : `Clique para dobrar o valor da multa e isentar o lançamento dos ${points} pontos na CNH do motorista ou de terceiros.`}
                      </span>
                    </div>
                  </label>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                      isDoubledFine ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isDoubledFine ? '2x (0 PTS CNH)' : '1x NORMAL'}
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={useSneDiscount}
                  onChange={(e) => {
                    setActivePreviewTerm(null);
                    setUseSneDiscount(e.target.checked);
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>
                  Aplicar desconto SNE de 20% ({formatCurrency(effectiveFineAmountBeforeDiscount * 0.8)}) sobre o valor{' '}
                  {isDoubledFine ? 'dobrado (2x)' : 'da multa'}
                </span>
              </label>
            </div>

            {/* Digital Signature Input */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <label className="block text-xs font-bold text-emerald-900">
                Assinatura Digital / Ciência do Motorista (Opcional na tela)
              </label>
              <input
                type="text"
                value={digitalSignatureTyped}
                onChange={(e) => {
                  setActivePreviewTerm(null);
                  setDigitalSignatureTyped(e.target.value);
                }}
                placeholder="Digite o nome completo do motorista para assinar eletronicamente..."
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-serif italic text-slate-900"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-800">
                  Ou imprima o documento ao lado para assinatura física a caneta.
                </span>
                <button
                  type="button"
                  onClick={() => handleGenerateAndSaveTerm(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  {existingTermForCurrentAit ? 'Atualizar & Assinar' : 'Confirmar Ciência & Assinar'}
                </button>
              </div>
            </div>
          </div>

          {/* Saved Terms History List (Deduplicated + Direct Print Action per Item) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Termos e Recibos Emitidos ({terms.length})
              </h3>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Sem duplicidade por AIT
              </span>
            </div>

            {terms.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Nenhum termo ou recibo emitido ainda. Configure acima e clique em "Emitir e Salvar Termo".
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {terms.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => loadTermIntoForm(t)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      currentPreviewTerm.id === t.id
                        ? 'bg-blue-50 border-blue-400'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900">{t.protocolNumber}</span>
                        <span className="text-[11px] font-mono font-semibold text-blue-700">AIT {t.aitNumber}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            t.status === 'ASSINADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status === 'ASSINADO' ? 'ASSINADO' : 'AGUARDANDO ASSINATURA'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-0.5">
                        {t.driverName} • Placa {t.plate} • {t.installments}x de {formatCurrency(t.installmentValue)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => triggerPrintDocument('AMBOS', t)}
                        title="Imprimir Termo e Recibo"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Imprimir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDirectDownloadPdf('AMBOS', t)}
                        title="Baixar PDF deste Termo/Recibo"
                        className="px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </button>

                      {t.status !== 'ASSINADO' && (
                        <button
                          type="button"
                          onClick={() => onSignTerm(t.id)}
                          title="Marcar como Assinado"
                          className="px-2 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold"
                        >
                          Assinar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteTerm(t.id);
                          if (activePreviewTerm?.id === t.id) setActivePreviewTerm(null);
                        }}
                        title="Excluir Termo/Recibo"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Printable A4 Document (1ª Via Empresa + 2ª Via Recibo Motorista) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Print Mode Filter Bar above Preview */}
          <div className="no-print bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Modo de Visualização e Impressão:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPrintMode('AMBOS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  printMode === 'AMBOS'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Termo + Recibo (2 Vias)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('APENAS_TERMO')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  printMode === 'APENAS_TERMO'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Apenas Termo de Ciência
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('APENAS_RECIBO')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  printMode === 'APENAS_RECIBO'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Apenas Recibo de Multa
              </button>
            </div>
          </div>

          <div
            id="printable-receipt-sheet"
            className="print-only-sheet bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-md p-6 sm:p-8 space-y-6"
          >
            {/* 1ª VIA - TERMO DE CIÊNCIA E AUTORIZAÇÃO DE DESCONTO EM FOLHA */}
            {(printMode === 'AMBOS' || printMode === 'APENAS_TERMO') && (
              <div className="space-y-4">
                {/* Document Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
                      Controle Interno de Infrações de Trânsito • RH & Frota
                    </p>
                    <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                      Termo de Ciência de Multa e Autorização de Desconto em Folha
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">
                      {currentPreviewTerm.companyName}
                      {currentPreviewTerm.companyCnpj ? ` — CNPJ: ${currentPreviewTerm.companyCnpj}` : ''}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="inline-block px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-mono font-bold text-xs text-slate-900">
                      Protocolo: {currentPreviewTerm.protocolNumber}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">1ª Via: Arquivo RH / Departamento de Frota</p>
                  </div>
                </div>

                {/* Driver & Vehicle Identification Table */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Motorista / Condutor Responsável:
                    </span>
                    <strong className="text-slate-900 text-sm">{currentPreviewTerm.driverName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">CPF / CNH:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {currentPreviewTerm.driverCpf} • {currentPreviewTerm.driverCnh}
                    </span>
                  </div>
                </div>

                {/* Fine / AIT Details Box */}
                <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-[11px] flex items-center justify-between">
                    <span>Dados do Auto de Infração de Trânsito (AIT)</span>
                    <span className="font-mono text-red-700">AIT Nº {currentPreviewTerm.aitNumber}</span>
                  </div>
                  <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Placa / Veículo:</span>
                      <span className="font-mono font-bold text-slate-900">{currentPreviewTerm.plate}</span>{' '}
                      <span className="text-slate-600">({currentPreviewTerm.vehicleModel})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Data e Hora:</span>
                      <span className="font-semibold text-slate-900">{formatDate(currentPreviewTerm.infractionDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Órgão / Pontuação:</span>
                      <span className="font-semibold text-slate-900">
                        {currentPreviewTerm.issuingAuthority} •{' '}
                        {currentPreviewTerm.isDoubledFine ? (
                          <span className="text-emerald-700 font-bold">
                            0 pts (Multa Dobrada 2x — Sem Pontos na CNH)
                          </span>
                        ) : (
                          `${currentPreviewTerm.points} pts`
                        )}
                      </span>
                    </div>
                    <div className="sm:col-span-3">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Local da Infração:</span>
                      <span className="font-semibold text-slate-900">
                        {currentPreviewTerm.infractionLocation} ({currentPreviewTerm.cityState})
                      </span>
                    </div>
                    <div className="sm:col-span-3">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        Enquadramento CTB (Cód. {currentPreviewTerm.infractionCode}):
                      </span>
                      <span className="text-slate-800">{currentPreviewTerm.infractionDescription}</span>
                    </div>
                  </div>
                </div>

                {/* Financial & Payroll Deduction Summary */}
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Valor Base do Auto (1x):
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-800">
                      {formatCurrency(currentPreviewTerm.originalFineAmount)}
                    </span>
                    {currentPreviewTerm.isDoubledFine && (
                      <span className="block text-[10px] text-amber-800 font-bold">
                        Dobrada (2x s/ Pontos CNH): {formatCurrency(currentPreviewTerm.originalFineAmount * 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Valor Total Autorizado p/ Desconto:
                    </span>
                    <span className="text-base font-mono font-black text-red-700">
                      {formatCurrency(currentPreviewTerm.finalDeductedAmount)}
                    </span>
                    {currentPreviewTerm.isDoubledFine && (
                      <span className="block text-[10px] text-amber-800 font-bold">
                        Multa Dobrada (2x) • 0 Pontos na CNH
                      </span>
                    )}
                    {currentPreviewTerm.useSneDiscount && (
                      <span className="block text-[10px] text-emerald-700 font-semibold">Com 20% Desconto SNE</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Forma de Desconto em Folha:</span>
                    <span className="text-sm font-mono font-bold text-blue-800">
                      {currentPreviewTerm.installments}x de {formatCurrency(currentPreviewTerm.installmentValue)}
                    </span>
                    <span className="block text-[10px] text-slate-600">
                      Início: Folha {currentPreviewTerm.payrollMonth}
                    </span>
                  </div>
                </div>

                {/* Legal Declaration Text */}
                <div className="text-[11px] leading-relaxed text-slate-700 space-y-1.5 text-justify bg-white p-3 rounded-lg border border-slate-200">
                  <p>
                    <strong>DECLARAÇÃO DE CIÊNCIA E AUTORIZAÇÃO (ART. 462, § 1º DA CLT):</strong> Pelo presente instrumento, eu,{' '}
                    <strong>{currentPreviewTerm.driverName}</strong>, inscrito(a) no CPF sob o nº{' '}
                    <strong>{currentPreviewTerm.driverCpf}</strong> e portador(a) da CNH nº{' '}
                    <strong>{currentPreviewTerm.driverCnh}</strong>, declaro ter plena ciência da autuação de trânsito acima
                    descrita (AIT <strong>{currentPreviewTerm.aitNumber}</strong>), ocorrida enquanto o veículo de placa{' '}
                    <strong>{currentPreviewTerm.plate}</strong> encontrava-se sob minha condução e responsabilidade profissional.
                  </p>
                  {currentPreviewTerm.isDoubledFine ? (
                    <p>
                      Reconheço a responsabilidade pela infração e, por{' '}
                      <strong>
                        OPÇÃO DE PAGAMENTO DA MULTA DOBRADA (2x — Não Indicação de Condutor / NIC, Art. 257, § 8º do CTB)
                      </strong>{' '}
                      para que <strong>os pontos não sejam lançados em minha CNH nem na CNH de terceiros (0 pontos na CNH)</strong>,{' '}
                      <strong>AUTORIZO EXPRESSAMENTE</strong> o empregador (<strong>{currentPreviewTerm.companyName}</strong>) a
                      proceder ao desconto em minha folha de pagamento do montante total dobrado de{' '}
                      <strong>{formatCurrency(currentPreviewTerm.finalDeductedAmount)}</strong>, dividido em{' '}
                      <strong>
                        {currentPreviewTerm.installments} parcela(s) mensal(is) de{' '}
                        {formatCurrency(currentPreviewTerm.installmentValue)}
                      </strong>
                      , iniciando na competência <strong>{currentPreviewTerm.payrollMonth}</strong>.
                    </p>
                  ) : (
                    <p>
                      Reconheço a responsabilidade pela infração e <strong>AUTORIZO EXPRESSAMENTE</strong> o empregador (
                      <strong>{currentPreviewTerm.companyName}</strong>) a proceder ao desconto em minha folha de pagamento do
                      montante total de <strong>{formatCurrency(currentPreviewTerm.finalDeductedAmount)}</strong>, dividido em{' '}
                      <strong>
                        {currentPreviewTerm.installments} parcela(s) mensal(is) de{' '}
                        {formatCurrency(currentPreviewTerm.installmentValue)}
                      </strong>
                      , iniciando na competência <strong>{currentPreviewTerm.payrollMonth}</strong>, bem como a assinatura do
                      formulário de Indicação de Real Condutor perante o órgão autuador ({currentPreviewTerm.issuingAuthority}).
                    </p>
                  )}
                </div>

                {/* Signature Lines (1ª Via) */}
                <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-center text-xs">
                  <div className="border-t border-slate-800 pt-2">
                    {currentPreviewTerm.status === 'ASSINADO' || digitalSignatureTyped.trim().length > 3 ? (
                      <p className="font-serif italic text-sm text-blue-900 font-bold mb-0.5">
                        {digitalSignatureTyped || currentPreviewTerm.driverName} (Assinado Digitalmente)
                      </p>
                    ) : null}
                    <p className="font-bold text-slate-900">{currentPreviewTerm.driverName}</p>
                    <p className="text-[10px] text-slate-600">
                      Assinatura do Motorista (Ciência e Autorização de Desconto)
                    </p>
                  </div>

                  <div className="border-t border-slate-800 pt-2">
                    <p className="font-bold text-slate-900">{currentPreviewTerm.companyName}</p>
                    <p className="text-[10px] text-slate-600">Gestão de Frota / Recursos Humanos (Carimbo e Visto)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cut Line Separator (Only when showing both) */}
            {printMode === 'AMBOS' && (
              <div className="py-2 flex items-center gap-2 text-slate-400">
                <Scissors className="w-4 h-4 shrink-0" />
                <div className="w-full border-t-2 border-dashed border-slate-300" />
                <span className="text-[10px] uppercase font-bold tracking-wider shrink-0">
                  Destacar Recibo do Motorista
                </span>
              </div>
            )}

            {/* 2ª VIA - RECIBO COMPROVANTE DO MOTORISTA */}
            {(printMode === 'AMBOS' || printMode === 'APENAS_RECIBO') && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                  <div>
                    <h4 className="font-black uppercase text-slate-900 text-xs">
                      Recibo de Ciência de Infração e Desconto em Folha — Via do Motorista
                    </h4>
                    <p className="text-[10px] text-slate-600">
                      {currentPreviewTerm.companyName} • Protocolo: {currentPreviewTerm.protocolNumber}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-xs text-slate-900">
                    Data: {formatDate(currentPreviewTerm.createdAt)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Motorista:</span>
                    <strong className="text-slate-900">{currentPreviewTerm.driverName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Auto (AIT) / Placa:</span>
                    <strong className="font-mono text-slate-900">
                      {currentPreviewTerm.aitNumber} ({currentPreviewTerm.plate})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Valor Total Desconto:</span>
                    <strong className="font-mono text-red-700">
                      {formatCurrency(currentPreviewTerm.finalDeductedAmount)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Parcelamento Folha:</span>
                    <strong className="font-mono text-blue-800">
                      {currentPreviewTerm.installments}x de {formatCurrency(currentPreviewTerm.installmentValue)}
                    </strong>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-600">
                  <span>
                    Local: {currentPreviewTerm.infractionLocation} • Cód. CTB: {currentPreviewTerm.infractionCode}
                  </span>
                  <span className="border-t border-slate-700 pt-1 px-8 font-semibold text-slate-800">
                    Visto RH / Recebimento da 1ª Via Assinada
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
