import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  Truck,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Users,
} from 'lucide-react';
import { Driver, CnhCategory, DriverStatus, Vehicle, UserSession } from '../types';
import { formatCPF } from '../lib/formatters';
import { normalizeScannedDriverData } from '../lib/documentParser';

interface DriverCNHModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDriver: (driver: Driver) => void;
  editingDriver?: Driver | null;
  vehicles: Vehicle[];
  existingDrivers?: Driver[];
  initialScannedData?: Partial<Driver> | null;
  currentUser?: UserSession;
}

export const DriverCNHModal: React.FC<DriverCNHModalProps> = ({
  isOpen,
  onClose,
  onSaveDriver,
  editingDriver,
  vehicles,
  existingDrivers = [],
  initialScannedData,
  currentUser,
}) => {
  const isPlogSession = currentUser?.username?.toLowerCase() === 'plog';

  const [formData, setFormData] = useState<Partial<Driver>>({
    name: '',
    cpf: '',
    cnhNumber: '',
    cnhCategory: 'B',
    cnhExpiration: '',
    birthDate: '',
    fatherName: '',
    motherName: '',
    cnhSecurityCode: '',
    renachNumber: '',
    cnhIssueDate: '',
    firstLicenseDate: '',
    currentPoints: 0,
    status: 'REGULAR',
    phone: '',
    email: '',
    rg: '',
    observations: '',
    assignedVehiclePlate: '',
    companyName: '',
    companyCnpj: '',
    isPlogDriver: isPlogSession,
    operationType: isPlogSession ? 'PLOG' : 'FROTA_GERAL',
  });

  const [formError, setFormError] = useState('');
  const [duplicateDriverFound, setDuplicateDriverFound] = useState<Driver | null>(null);
  const [isImportedFromScan, setIsImportedFromScan] = useState(false);

  const prevIsOpenRef = useRef(isOpen);
  const prevScannedDataRef = useRef<Partial<Driver> | null>(null);

  // Helper: Match plate candidate with fleet vehicles
  const matchFleetVehicle = (plateCandidate?: string) => {
    if (!plateCandidate) return '';
    const cleanCand = plateCandidate.replace(/[- ]/g, '').toUpperCase();
    const found = vehicles.find(
      (v) => v.plate.replace(/[- ]/g, '').toUpperCase() === cleanCand
    );
    return found ? found.plate : plateCandidate;
  };

  const findDuplicateDriver = (candidate: Partial<Driver>, currentEditId?: string): Driver | null => {
    const cleanCpf = (candidate.cpf || '').replace(/\D/g, '');
    const cleanCnh = (candidate.cnhNumber || '').replace(/\D/g, '');
    const cleanName = (candidate.name || '').trim().toUpperCase();

    return (
      existingDrivers.find((d) => {
        if (currentEditId && d.id === currentEditId) return false;
        const dCpf = d.cpf.replace(/\D/g, '');
        const dCnh = d.cnhNumber.replace(/\D/g, '');
        const dName = d.name.trim().toUpperCase();
        return (
          (cleanCpf.length >= 11 && dCpf === cleanCpf) ||
          (cleanCnh.length >= 8 && dCnh === cleanCnh) ||
          (cleanName.length >= 6 && dName === cleanName)
        );
      }) || null
    );
  };

  // Sync editing driver, initial scanned data, or reset to empty clean form
  useEffect(() => {
    const isFreshOpen = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (!isOpen) {
      setFormError('');
      setDuplicateDriverFound(null);
      return;
    }

    if (isFreshOpen) {
      if (editingDriver) {
        setFormData(editingDriver);
        setIsImportedFromScan(false);
      } else if (initialScannedData && Object.keys(initialScannedData).length > 0) {
        prevScannedDataRef.current = initialScannedData;
        const norm = normalizeScannedDriverData(initialScannedData);
        setFormData({
          name: norm.name || '',
          cpf: norm.cpf || '',
          cnhNumber: norm.cnhNumber || '',
          cnhCategory: norm.cnhCategory || 'B',
          cnhExpiration: norm.cnhExpiration || '',
          birthDate: norm.birthDate || '',
          fatherName: norm.fatherName || '',
          motherName: norm.motherName || '',
          cnhSecurityCode: norm.cnhSecurityCode || '',
          renachNumber: norm.renachNumber || '',
          cnhIssueDate: norm.cnhIssueDate || '',
          firstLicenseDate: norm.firstLicenseDate || '',
          currentPoints: norm.currentPoints || 0,
          status: norm.status || 'REGULAR',
          phone: norm.phone || '',
          email: norm.email || '',
          rg: norm.rg || '',
          observations: norm.observations || '',
          assignedVehiclePlate: matchFleetVehicle(norm.assignedVehiclePlate),
          companyName: norm.companyName || '',
          companyCnpj: norm.companyCnpj || '',
        });
        setIsImportedFromScan(true);
      } else {
        setFormData({
          name: '',
          cpf: '',
          rg: '',
          observations: '',
          cnhNumber: '',
          cnhCategory: 'B',
          cnhExpiration: '',
          birthDate: '',
          fatherName: '',
          motherName: '',
          cnhSecurityCode: '',
          renachNumber: '',
          cnhIssueDate: '',
          firstLicenseDate: '',
          currentPoints: 0,
          status: 'REGULAR',
          phone: '',
          email: '',
          assignedVehiclePlate: '',
          companyName: '',
          companyCnpj: '',
          isPlogDriver: isPlogSession,
          operationType: isPlogSession ? 'PLOG' : 'FROTA_GERAL',
        });
        setIsImportedFromScan(false);
      }
      setFormError('');
      setDuplicateDriverFound(null);
    } else if (
      initialScannedData &&
      initialScannedData !== prevScannedDataRef.current &&
      Object.keys(initialScannedData).length > 0
    ) {
      prevScannedDataRef.current = initialScannedData;
      const norm = normalizeScannedDriverData(initialScannedData);
      setFormData((prev) => ({
        ...prev,
        ...norm,
        assignedVehiclePlate:
          matchFleetVehicle(norm.assignedVehiclePlate) || prev.assignedVehiclePlate || '',
      }));
      setIsImportedFromScan(true);
    }
  }, [editingDriver, initialScannedData, isOpen, isPlogSession]);

  if (!isOpen) return null;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCPF(raw);
    setFormData((prev) => ({ ...prev, cpf: formatted }));
  };

  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pts = Math.max(0, Number(e.target.value) || 0);
    const calculatedStatus: DriverStatus =
      pts >= 40 ? 'SUSPENSA' : pts >= 20 ? 'ALERTA' : 'REGULAR';
    setFormData((prev) => ({
      ...prev,
      currentPoints: pts,
      status: calculatedStatus,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = (formData.name || '').trim();
    const cleanCpfDigits = (formData.cpf || '').replace(/\D/g, '');
    const cleanCnhDigits = (formData.cnhNumber || '').replace(/\D/g, '');

    if (!cleanName) {
      setFormError('Informe o Nome Completo do motorista.');
      return;
    }

    if (cleanCpfDigits.length !== 11) {
      setFormError('Informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!cleanCnhDigits || cleanCnhDigits.length < 8) {
      setFormError('Informe um Número de Registro CNH válido (mínimo 8 dígitos).');
      return;
    }

    const dup = findDuplicateDriver(formData, editingDriver?.id);
    if (dup && (!editingDriver || editingDriver.id !== dup.id)) {
      setDuplicateDriverFound(dup);
      return;
    }

    const isPlog = formData.operationType === 'PLOG' || Boolean(formData.isPlogDriver);

    const savedDriver: Driver = {
      id: editingDriver ? editingDriver.id : `drv-${Date.now().toString().slice(-4)}`,
      name: cleanName.toUpperCase(),
      cpf: formatCPF(formData.cpf || ''),
      cnhNumber: cleanCnhDigits,
      cnhCategory: (formData.cnhCategory as CnhCategory) || 'B',
      cnhExpiration: formData.cnhExpiration || '',
      birthDate: formData.birthDate || '',
      fatherName: (formData.fatherName || '').trim().toUpperCase(),
      motherName: (formData.motherName || '').trim().toUpperCase(),
      cnhSecurityCode: (formData.cnhSecurityCode || '').trim(),
      renachNumber: (formData.renachNumber || '').trim().toUpperCase(),
      cnhIssueDate: formData.cnhIssueDate || '',
      firstLicenseDate: formData.firstLicenseDate || '',
      currentPoints: Number(formData.currentPoints) || 0,
      status:
        (formData.status as DriverStatus) ||
        (Number(formData.currentPoints) >= 40
          ? 'SUSPENSA'
          : Number(formData.currentPoints) >= 20
          ? 'ALERTA'
          : 'REGULAR'),
      phone: formData.phone || '',
      email: formData.email || '',
      rg: (formData.rg || '').trim().toUpperCase() || undefined,
      observations: (formData.observations || '').trim() || undefined,
      assignedVehiclePlate: formData.assignedVehiclePlate || undefined,
      companyName: formData.companyName || '',
      companyCnpj: formData.companyCnpj || '',
      isPlogDriver: isPlog,
      operationType: isPlog ? 'PLOG' : 'FROTA_GERAL',
      createdAt: editingDriver ? editingDriver.createdAt : new Date().toISOString().slice(0, 10),
    };

    onSaveDriver(savedDriver);
    onClose();
  };

  return (
    <div
      id="driver-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="driver-modal-card"
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-8 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingDriver ? 'Editar Motorista' : 'Novo Cadastro de Motorista'}
              </h3>
              <p className="text-xs text-slate-500">
                Dados pessoais, filiação (Pai e Mãe), CNH, RENACH e prontuário
              </p>
            </div>
          </div>
          <button
            id="btn-close-driver-modal"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {duplicateDriverFound && (
              <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs text-red-800 space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900 text-sm">
                      ⚠️ Alerta de Duplicidade no Cadastro!
                    </p>
                    <p className="mt-0.5 text-red-700">
                      Já existe um motorista cadastrado com este CPF (<strong>{duplicateDriverFound.cpf}</strong>) ou CNH (<strong>{duplicateDriverFound.cnhNumber}</strong>):{' '}
                      <strong>{duplicateDriverFound.name}</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(duplicateDriverFound);
                      setDuplicateDriverFound(null);
                      setFormError('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Editar Cadastro Existente ({duplicateDriverFound.name})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateDriverFound(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Corrigir Dados Manualmente
                  </button>
                </div>
              </div>
            )}

            {/* Seletor Diferencial: Motorista P-LOG vs Frota Geral */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Tipo de Vínculo / Operação do Motorista <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      isPlogDriver: false,
                      operationType: 'FROTA_GERAL',
                    })
                  }
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    formData.operationType !== 'PLOG' && !formData.isPlogDriver
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Truck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold">🚚 Frota Geral</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Condutor da frota geral da empresa
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      isPlogDriver: true,
                      operationType: 'PLOG',
                    })
                  }
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                    formData.operationType === 'PLOG' || formData.isPlogDriver
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold text-amber-900">📦 Motorista P-LOG</span>
                    <span className="block text-[11px] text-amber-800/80 mt-0.5">
                      Exclusivo Operação C.A & Logística P-LOG
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Dados do Formulário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome Completo */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo do Condutor <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: MARCOS VINÍCIUS DE OLIVEIRA"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 uppercase"
                    required
                  />
                </div>
              </div>

              {/* Filiação: Nome da Mãe */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Mãe (Filiação)
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.motherName || ''}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    placeholder="Nome completo da mãe"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              {/* Filiação: Nome do Pai */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Pai (Filiação)
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.fatherName || ''}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    placeholder="Nome completo do pai"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              {/* CPF */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.cpf || ''}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              {/* RG (Registro Geral) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RG (Documento de Identidade)
                </label>
                <input
                  type="text"
                  value={formData.rg || ''}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value.toUpperCase() })}
                  placeholder="ex: 12.345.678-9"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* CNH Número */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Registro CNH <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.cnhNumber || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, cnhNumber: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="04928192841"
                    maxLength={11}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Código de Segurança da CNH */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código de Segurança CNH
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.cnhSecurityCode || ''}
                    onChange={(e) => setFormData({ ...formData, cnhSecurityCode: e.target.value.replace(/\D/g, '') })}
                    placeholder="ex: 12345678901 (11 dígitos)"
                    maxLength={11}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Número do RENACH */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número do RENACH
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.renachNumber || ''}
                    onChange={(e) => setFormData({ ...formData, renachNumber: e.target.value.toUpperCase() })}
                    placeholder="ex: SP123456789"
                    maxLength={14}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Categoria CNH */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria da Habilitação
                </label>
                <select
                  value={formData.cnhCategory || 'B'}
                  onChange={(e) =>
                    setFormData({ ...formData, cnhCategory: e.target.value as CnhCategory })
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                >
                  <option value="A">A — Motos</option>
                  <option value="B">B — Automóveis</option>
                  <option value="C">C — Caminhões Simples</option>
                  <option value="D">D — Ônibus / Vans</option>
                  <option value="E">E — Carretas / Articulados</option>
                  <option value="AB">AB — Moto e Carro</option>
                  <option value="AC">AC — Moto e Caminhão</option>
                  <option value="AD">AD — Moto e Ônibus</option>
                  <option value="AE">AE — Moto e Carreta</option>
                </select>
              </div>

              {/* Validade CNH */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Validade da CNH
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={formData.cnhExpiration || ''}
                    onChange={(e) => setFormData({ ...formData, cnhExpiration: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Data da Emissão CNH */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data da Emissão da CNH
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={formData.cnhIssueDate || ''}
                    onChange={(e) => setFormData({ ...formData, cnhIssueDate: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Primeira Habilitação */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primeira Habilitação (Data)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={formData.firstLicenseDate || ''}
                    onChange={(e) => setFormData({ ...formData, firstLicenseDate: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Data de Nascimento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Nascimento
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={formData.birthDate || ''}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Pontos Atuais */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Pontos na CNH
                  </label>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (formData.currentPoints || 0) >= 40
                        ? 'bg-red-100 text-red-700'
                        : (formData.currentPoints || 0) >= 20
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {(formData.currentPoints || 0) >= 40
                      ? 'Suspensão'
                      : (formData.currentPoints || 0) >= 20
                      ? 'Alerta'
                      : 'Regular'}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.currentPoints ?? 0}
                  onChange={handlePointsChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Status Prontuário */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status do Prontuário
                </label>
                <select
                  value={formData.status || 'REGULAR'}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as DriverStatus })
                  }
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                >
                  <option value="REGULAR">Regular (0 a 19 pts)</option>
                  <option value="ALERTA">Em Alerta (20 a 39 pts)</option>
                  <option value="SUSPENSA">Processo de Suspensão (40+ pts)</option>
                  <option value="CASSADA">Cassada</option>
                </select>
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="motorista@empresa.com.br"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Veículo Vinculado */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Veículo Titular da Frota (Vinculação)
                </label>
                <div className="relative">
                  <Truck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={formData.assignedVehiclePlate || ''}
                    onChange={(e) => setFormData({ ...formData, assignedVehiclePlate: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                  >
                    <option value="">Sem veículo fixo atribuído</option>
                    {vehicles.map((veh) => (
                      <option key={veh.id} value={veh.plate}>
                        Placa: {veh.plate} — {veh.brandModel} ({veh.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Observação / Notas */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observação / Anotações
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    value={formData.observations || ''}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Informações adicionais, rotas habituais, observações internas ou dados de RH"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-save-driver-submit"
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingDriver ? 'Atualizar Motorista' : 'Salvar Motorista'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
