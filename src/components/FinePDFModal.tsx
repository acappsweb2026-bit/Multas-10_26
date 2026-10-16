import React, { useState, useEffect } from 'react';
import {
  X,
  FileWarning,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Scale,
  Zap,
} from 'lucide-react';
import { TrafficFine, Vehicle, Driver, FineSeverity, FineStatus } from '../types';
import { COMMON_CTB_CODES } from '../data/mockData';
import { formatCurrency } from '../lib/formatters';
import { generateImportedFinePdfDataUrl } from '../lib/printService';

interface FinePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFine: (fine: TrafficFine) => void;
  onSaveBulkFines?: (fines: TrafficFine[]) => void;
  editingFine?: TrafficFine | null;
  vehicles: Vehicle[];
  drivers: Driver[];
  existingFines?: TrafficFine[];
  initialTab?: 'pdf' | 'bulk' | 'form' | 'preview';
}

const generateRandomAit = () => {
  const prefix = ['R', 'PR', 'SP', 'BR', 'DER', 'MG', 'RJ'][Math.floor(Math.random() * 7)];
  const num = Math.floor(1000000 + Math.random() * 9000000);
  const dig = Math.floor(1 + Math.random() * 9);
  return `${prefix}${num}-${dig}`;
};

const SAMPLE_LOCATIONS = [
  'Rodovia Castelo Branco, KM 32 - Pista Expressa',
  'Rodovia dos Bandeirantes, KM 72 - Sentido Interior',
  'BR-116 (Presidente Dutra), KM 205 - Sentido SP/RJ',
  'Rodovia Anhanguera, KM 58 - Jundiaí/SP',
  'Av. Marginal Tietê, próximo à Ponte da Freguesia do Ó',
  'Rodovia Régis Bittencourt (BR-116), KM 284 - Embu das Artes/SP',
  'Av. Brasil, 1400 - Rio de Janeiro/RJ',
];

export const FinePDFModal: React.FC<FinePDFModalProps> = ({
  isOpen,
  onClose,
  onSaveFine,
  editingFine,
  vehicles,
  drivers,
  existingFines = [],
}) => {
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [multiplierFactor, setMultiplierFactor] = useState<number>(1);
  const [isDoubledFine, setIsDoubledFine] = useState<boolean>(false);

  const [formData, setFormData] = useState<Partial<TrafficFine>>({
    aitNumber: '',
    plate: '',
    infractionDate: '',
    infractionLocation: '',
    city: '',
    state: '',
    infractionCode: '',
    infractionDescription: '',
    fineAmount: 0,
    discountAmount: 0,
    originalAmount: 0,
    isDoubledFine: false,
    multiplierFactor: 1,
    isNicFine: false,
    ownerCnpjRazaoSocial: '',
    dueDate: '',
    status: 'PENDENTE',
    severity: 'MEDIA',
    points: 0,
    issuingAuthority: '',
    driverId: '',
    driverName: '',
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [duplicateFineFound, setDuplicateFineFound] = useState<TrafficFine | null>(null);

  const findDuplicateFine = (candidate: Partial<TrafficFine>, currentEditId?: string): TrafficFine | null => {
    const cleanAit = (candidate.aitNumber || '').trim().toUpperCase();
    const cleanPlate = (candidate.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanCode = (candidate.infractionCode || '').trim();
    const cleanDate = (candidate.infractionDate || '').slice(0, 16);

    return (
      existingFines.find((f) => {
        if (currentEditId && f.id === currentEditId) return false;
        const fAit = f.aitNumber.trim().toUpperCase();
        const fPlate = f.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const fDate = f.infractionDate.slice(0, 16);
        return (
          (cleanAit.length >= 4 && fAit === cleanAit) ||
          (cleanPlate.length >= 6 && cleanDate.length >= 10 && fPlate === cleanPlate && fDate === cleanDate && f.infractionCode === cleanCode)
        );
      }) || null
    );
  };

  useEffect(() => {
    if (editingFine) {
      setFormData(editingFine);
      const original = editingFine.originalAmount || (editingFine.multiplierFactor && editingFine.multiplierFactor > 1 ? editingFine.fineAmount / editingFine.multiplierFactor : editingFine.fineAmount);
      setBaseAmount(original);
      setMultiplierFactor(editingFine.multiplierFactor || (editingFine.isDoubledFine ? 2 : 1));
      setIsDoubledFine(!!editingFine.isDoubledFine || (editingFine.multiplierFactor ? editingFine.multiplierFactor > 1 : false));
    } else {
      setBaseAmount(0);
      setMultiplierFactor(1);
      setIsDoubledFine(false);
      setFormData({
        aitNumber: '',
        plate: '',
        infractionDate: '',
        infractionLocation: '',
        city: '',
        state: '',
        infractionCode: '',
        infractionDescription: '',
        fineAmount: 0,
        discountAmount: 0,
        originalAmount: 0,
        isDoubledFine: false,
        multiplierFactor: 1,
        isNicFine: false,
        ownerCnpjRazaoSocial: '',
        dueDate: '',
        status: 'PENDENTE',
        severity: 'MEDIA',
        points: 0,
        issuingAuthority: '',
        driverId: '',
        driverName: '',
        notes: '',
      });
    }
    setFormError('');
    setDuplicateFineFound(null);
  }, [editingFine, isOpen]);

  if (!isOpen) return null;

  // Recalculate fine amount when base amount or multiplier factor changes
  const applyMultiplier = (base: number, mult: number, doubled: boolean) => {
    const effectiveMult = mult > 1 ? mult : doubled ? 2 : 1;
    const finalAmount = Number((base * effectiveMult).toFixed(2));
    const discount = Number((finalAmount * 0.8).toFixed(2));

    setBaseAmount(base);
    setMultiplierFactor(effectiveMult);
    setIsDoubledFine(doubled || effectiveMult > 1);

    setFormData((prev) => ({
      ...prev,
      originalAmount: base,
      fineAmount: finalAmount,
      discountAmount: discount,
      multiplierFactor: effectiveMult,
      isDoubledFine: doubled || effectiveMult > 1,
      isNicFine: doubled || effectiveMult === 2,
      points: doubled || effectiveMult > 1 ? 0 : prev.points,
    }));
  };

  const handleToggleDoubledFine = (checked: boolean) => {
    const newMult = checked ? 2 : 1;
    applyMultiplier(baseAmount, newMult, checked);
  };

  const handleSelectMultiplier = (factor: number) => {
    applyMultiplier(baseAmount, factor, factor > 1);
  };

  const handleGenerateNewAit = () => {
    const newAit = generateRandomAit();
    setFormData((prev) => ({ ...prev, aitNumber: newAit }));
  };

  const handleSuggestLocation = () => {
    const randomLoc = SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)];
    setFormData((prev) => ({ ...prev, infractionLocation: randomLoc }));
  };

  const handleSelectCtbCode = (code: string) => {
    const found = COMMON_CTB_CODES.find((c) => c.code === code);
    if (found) {
      const base = found.value;
      const finalAmount = Number((base * multiplierFactor).toFixed(2));
      const discount = Number((finalAmount * 0.8).toFixed(2));
      setBaseAmount(base);
      setFormData((prev) => ({
        ...prev,
        infractionCode: found.code,
        infractionDescription: found.desc,
        severity: found.severity,
        points: isDoubledFine ? 0 : found.points,
        fineAmount: finalAmount,
        originalAmount: base,
        discountAmount: discount,
      }));
    }
  };

  const handleDriverChange = (driverId: string) => {
    const d = drivers.find((drv) => drv.id === driverId);
    setFormData((prev) => ({
      ...prev,
      driverId: driverId || undefined,
      driverName: d ? d.name : undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanAit = (formData.aitNumber || '').trim().toUpperCase();
    const cleanPlate = (formData.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleanAit) {
      setFormError('Informe a Identificação do Auto (AIT).');
      return;
    }

    if (!cleanPlate || cleanPlate.length < 6) {
      setFormError('Informe uma Placa de Veículo válida.');
      return;
    }

    if (!formData.infractionDate) {
      setFormError('Informe a Data e Hora da infração.');
      return;
    }

    if (!formData.infractionLocation) {
      setFormError('Informe o Local da infração.');
      return;
    }

    if (!formData.city || !formData.state) {
      setFormError('Informe o Município e a UF.');
      return;
    }

    if (!formData.infractionCode || !formData.infractionDescription) {
      setFormError('Informe o Código e a Descrição do enquadramento CTB.');
      return;
    }

    const dup = findDuplicateFine(formData, editingFine?.id);
    if (dup && (!editingFine || editingFine.id !== dup.id)) {
      setDuplicateFineFound(dup);
      return;
    }

    const finalAmount = Number(formData.fineAmount) || baseAmount || 130.16;
    const finalDiscount = formData.discountAmount
      ? Number(formData.discountAmount)
      : Number((finalAmount * 0.8).toFixed(2));

    const resolvedPdfFileName =
      formData.pdfFileName || `AIT_${cleanAit}_${cleanPlate}.pdf`;

    const candidateFine: Partial<TrafficFine> = {
      ...formData,
      aitNumber: cleanAit,
      plate: cleanPlate,
      fineAmount: finalAmount,
      discountAmount: finalDiscount,
      pdfFileName: resolvedPdfFileName,
    };

    const resolvedPdfDataUrl =
      formData.pdfDataUrl || generateImportedFinePdfDataUrl(candidateFine);

    const newFine: TrafficFine = {
      id: editingFine ? editingFine.id : `fine-${Date.now().toString().slice(-4)}`,
      aitNumber: cleanAit,
      plate: cleanPlate,
      infractionDate: formData.infractionDate || new Date().toISOString().slice(0, 16),
      infractionLocation: formData.infractionLocation || '',
      city: formData.city || 'São Paulo',
      state: (formData.state || 'SP').toUpperCase(),
      infractionCode: formData.infractionCode || '7455-0',
      infractionDescription: formData.infractionDescription || '',
      fineAmount: finalAmount,
      discountAmount: finalDiscount,
      originalAmount: baseAmount || finalAmount,
      isDoubledFine: isDoubledFine,
      multiplierFactor: multiplierFactor,
      isNicFine: isDoubledFine || formData.isNicFine,
      ownerCnpjRazaoSocial:
        formData.ownerCnpjRazaoSocial || 'Proprietário / Frota Registrada',
      driverId: formData.driverId,
      driverName: formData.driverName,
      dueDate: formData.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: (formData.status as FineStatus) || 'PENDENTE',
      severity: (formData.severity as FineSeverity) || 'MEDIA',
      points: isDoubledFine ? 0 : Number(formData.points) || 4,
      issuingAuthority: (formData.issuingAuthority as any) || 'DER',
      pdfFileName: resolvedPdfFileName,
      pdfDataUrl: resolvedPdfDataUrl,
      pdfMimeType: 'application/pdf',
      importedAt: formData.importedAt || new Date().toISOString(),
      notes: formData.notes,
      createdAt: editingFine ? editingFine.createdAt : new Date().toISOString().slice(0, 10),
    };

    onSaveFine(newFine);
    onClose();
  };

  return (
    <div
      id="fine-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="fine-modal-card"
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-6 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {editingFine ? 'Editar Auto de Infração (AIT)' : 'Novo Cadastro de Multa (AIT)'}
              </h3>
              <p className="text-xs text-slate-600">
                Preencha os dados do auto de infração, enquadramento CTB e prazos
              </p>
            </div>
          </div>
          <button
            id="btn-close-fine-modal"
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <div className="p-5 max-h-[80vh] overflow-y-auto bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {duplicateFineFound && (
              <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs text-red-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900 text-sm">
                      ⚠️ Alerta de Duplicidade de Multa (AIT)!
                    </p>
                    <p className="mt-0.5">
                      O Auto de Infração <strong>{duplicateFineFound.aitNumber}</strong> (Placa{' '}
                      <strong>{duplicateFineFound.plate}</strong> — Cód. {duplicateFineFound.infractionCode}) já está cadastrado no sistema.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(duplicateFineFound);
                      setDuplicateFineFound(null);
                      setFormError('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Editar Auto Existente ({duplicateFineFound.aitNumber})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateFineFound(null)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Alterar Número do AIT
                  </button>
                </div>
              </div>
            )}

            {/* Opção Multa Dobrada / NIC PJ Card */}
            <div className="p-4 bg-red-50/50 border border-red-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="chk-multa-dobrada"
                        className="text-xs font-bold text-slate-900 cursor-pointer hover:text-red-700 transition-colors"
                      >
                        Opção: Multa Dobrada (Fator 2x - Não Indicação de Condutor / NIC PJ)
                      </label>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-[10px] font-bold text-red-800 border border-red-200">
                        Art. 257 § 8º CTB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Em frotas de Pessoa Jurídica, quando o condutor não é indicado, a lei aplica a Multa NIC com valor dobrado (2x) sem pontuação na CNH.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    id="chk-multa-dobrada"
                    type="checkbox"
                    checked={isDoubledFine}
                    onChange={(e) => handleToggleDoubledFine(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {/* Multiplier Factor Buttons */}
              <div className="pt-2 border-t border-red-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                  <span>Fator Multiplicador:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { factor: 1, label: '1x (Normal)' },
                      { factor: 2, label: '2x (Multa Dobrada NIC)' },
                      { factor: 3, label: '3x (Agravada)' },
                      { factor: 5, label: '5x (Especial)' },
                      { factor: 10, label: '10x (Gravíssima)' },
                    ].map((item) => (
                      <button
                        key={item.factor}
                        type="button"
                        onClick={() => handleSelectMultiplier(item.factor)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          multiplierFactor === item.factor
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-600">Base: </span>
                  <span className="font-mono text-slate-800">{formatCurrency(baseAmount)}</span>
                  <span className="text-red-600 font-bold"> × {multiplierFactor}x = </span>
                  <span className="font-mono font-bold text-red-700">{formatCurrency(baseAmount * multiplierFactor)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* 1. Indentificação do Auto de Infração (AIT) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Identificação do Auto (AIT) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateNewAit}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                    title="Gerar código AIT automático"
                  >
                    <Zap className="w-2.5 h-2.5" />
                    <span>Gerar AIT</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.aitNumber || ''}
                  onChange={(e) => setFormData({ ...formData, aitNumber: e.target.value.toUpperCase() })}
                  placeholder="ex: R84920194-2"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-red-500 font-mono font-bold tracking-wide"
                  required
                />
              </div>

              {/* 2. Placa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Placa do Veículo <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={formData.plate || ''}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    placeholder="BRA2E19"
                    maxLength={8}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase placeholder-slate-400 focus:outline-none focus:border-red-500 font-mono tracking-wider font-bold text-blue-700"
                    required
                  />
                  {vehicles.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          const v = vehicles.find((item) => item.plate === e.target.value);
                          setFormData((prev) => ({
                            ...prev,
                            plate: e.target.value,
                            ownerCnpjRazaoSocial: v?.ownerName ? `${v.renavam || ''} - ${v.ownerName}` : prev.ownerCnpjRazaoSocial,
                          }));
                        }
                      }}
                      className="px-2 py-2 bg-white border border-slate-300 rounded-xl text-[11px] text-slate-600 focus:outline-none focus:border-red-500 cursor-pointer"
                      title="Selecionar veículo da frota"
                    >
                      <option value="">Frota...</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.plate}>
                          {v.plate}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* 3. Data Infração */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data e Hora da Infração <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.infractionDate || ''}
                  onChange={(e) => setFormData({ ...formData, infractionDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* 4. Local da Infração */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Local da Infração <span className="text-red-500">*</span> (Rodovia, Av, KM ou Número)
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestLocation}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-0.5 cursor-pointer"
                    title="Sugerir outro local"
                  >
                    <MapPin className="w-2.5 h-2.5" />
                    <span>Sugerir Local</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.infractionLocation || ''}
                  onChange={(e) => setFormData({ ...formData, infractionLocation: e.target.value })}
                  placeholder="ex: Rodovia dos Bandeirantes, KM 72 - Sentido Interior"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* 5. Município e UF */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Município / UF <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Município"
                    className="w-2/3 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500"
                    required
                  />
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    placeholder="UF"
                    maxLength={2}
                    className="w-1/3 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 uppercase text-center focus:outline-none focus:border-red-500 font-bold"
                    required
                  />
                </div>
              </div>

              {/* 6. Cód Infração */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cód Infração CTB <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={formData.infractionCode || ''}
                    onChange={(e) => setFormData({ ...formData, infractionCode: e.target.value })}
                    placeholder="ex: 7455-0"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 uppercase focus:outline-none focus:border-red-500 font-mono font-bold"
                    required
                  />
                  <select
                    onChange={(e) => e.target.value && handleSelectCtbCode(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-[10px] text-slate-700 cursor-pointer"
                  >
                    <option value="">Tabela CTB Comum...</option>
                    {COMMON_CTB_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.desc.slice(0, 32)}... ({formatCurrency(c.value)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 7. Descrição Infração */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição da Infração <span className="text-red-500">*</span> (Enquadramento CTB)
                </label>
                <input
                  type="text"
                  value={formData.infractionDescription || ''}
                  onChange={(e) => setFormData({ ...formData, infractionDescription: e.target.value })}
                  placeholder="ex: Transitar em velocidade superior à máxima permitida em até 20%"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* 8. Valor da Multa & Desconto */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Valor {multiplierFactor > 1 ? `(${multiplierFactor}x Multiplicado)` : 'Integral'} (R$) <span className="text-red-500">*</span>
                  </label>
                  {multiplierFactor > 1 && (
                    <span className="text-[10px] text-red-600 font-bold">Multa Dobrada</span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fineAmount ?? 130.16}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const base = multiplierFactor > 1 ? Number((val / multiplierFactor).toFixed(2)) : val;
                    setBaseAmount(base);
                    setFormData({
                      ...formData,
                      fineAmount: val,
                      originalAmount: base,
                      discountAmount: Number((val * 0.8).toFixed(2)),
                    });
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-red-500 font-mono font-bold text-red-700"
                  required
                />
                <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                  Com desconto SNE (20%): {formatCurrency(formData.discountAmount || 0)}
                </p>
              </div>

              {/* 9. Proprietário */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Proprietário (CNPJ - Razão Social)
                </label>
                <input
                  type="text"
                  value={formData.ownerCnpjRazaoSocial || ''}
                  onChange={(e) => setFormData({ ...formData, ownerCnpjRazaoSocial: e.target.value })}
                  placeholder="CNPJ/CPF - Nome do Proprietário ou Razão Social"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Motorista Responsável */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motorista Condutor Infrator
                </label>
                <select
                  value={formData.driverId || ''}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="">Não identificado / A indicar (Multa PJ)</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.currentPoints} pts)
                    </option>
                  ))}
                </select>
              </div>

              {/* Vencimento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status da Infração</label>
                <select
                  value={formData.status || 'PENDENTE'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as FineStatus })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="PENDENTE">Pendente (A vencer)</option>
                  <option value="VENCIDA">Vencida (Em atraso)</option>
                  <option value="EM_RECURSO">Em Recurso (JARI/CETRAN)</option>
                  <option value="PAGA">Paga / Quitado</option>
                </select>
              </div>

              {/* Órgão Autuador */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Órgão Autuador</label>
                <select
                  value={formData.issuingAuthority || 'DER'}
                  onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="DER">DER (Depto Estradas e Rodagem)</option>
                  <option value="DETRAN">DETRAN</option>
                  <option value="PRF">PRF (Polícia Rodoviária Federal)</option>
                  <option value="DNIT">DNIT</option>
                  <option value="PREFEITURA / CET">PREFEITURA / CET</option>
                  <option value="DSV">DSV</option>
                </select>
              </div>

              {/* Gravidade & Pontos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gravidade & Pontos {isDoubledFine && '(0 pts em NIC PJ)'}
                </label>
                <select
                  value={`${formData.severity}_${formData.points}`}
                  onChange={(e) => {
                    const [sev, pts] = e.target.value.split('_');
                    setFormData({
                      ...formData,
                      severity: sev as FineSeverity,
                      points: isDoubledFine ? 0 : Number(pts),
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="LEVE_3">Leve (3 pontos)</option>
                  <option value="MEDIA_4">Média (4 pontos)</option>
                  <option value="GRAVE_5">Grave (5 pontos)</option>
                  <option value="GRAVISSIMA_7">Gravíssima (7 pontos)</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingFine ? 'Atualizar Auto de Infração' : 'Salvar Multa no Sistema'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
