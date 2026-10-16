import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  CheckCircle2,
  AlertCircle,
  Hash,
  MapPin,
  Calendar,
  ShieldAlert,
  User,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { Vehicle, Driver, VehicleType } from '../types';

interface VehicleCRLVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVehicle: (vehicle: Vehicle) => void;
  editingVehicle?: Vehicle | null;
  drivers: Driver[];
  existingVehicles?: Vehicle[];
  initialScannedData?: Partial<Vehicle> | null;
}

export const VehicleCRLVModal: React.FC<VehicleCRLVModalProps> = ({
  isOpen,
  onClose,
  onSaveVehicle,
  editingVehicle,
  drivers,
  existingVehicles = [],
  initialScannedData = null,
}) => {
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    plate: '',
    renavam: '',
    chassis: '',
    brandModel: '',
    yearFabMod: '',
    vehicleType: 'Toco',
    fuel: '',
    color: '',
    ownerName: '',
    ownerCnpjCpf: '',
    cityUf: '',
    licensingStatus: 'EM_DIA',
    assignedDriverId: '',
  });

  const [formError, setFormError] = useState('');
  const [duplicateVehicleFound, setDuplicateVehicleFound] = useState<Vehicle | null>(null);
  const [isImportedFromScan, setIsImportedFromScan] = useState<boolean>(false);

  const findDuplicateVehicle = (candidate: Partial<Vehicle>, currentEditId?: string): Vehicle | null => {
    const cleanPlate = (candidate.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanRenavam = (candidate.renavam || '').replace(/\D/g, '');
    const cleanChassis = (candidate.chassis || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    return (
      existingVehicles.find((v) => {
        if (currentEditId && v.id === currentEditId) return false;
        const vPlate = v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const vRen = v.renavam.replace(/\D/g, '');
        const vChas = v.chassis.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return (
          (cleanPlate.length >= 6 && vPlate === cleanPlate) ||
          (cleanRenavam.length >= 9 && vRen === cleanRenavam) ||
          (cleanChassis.length >= 10 && vChas === cleanChassis)
        );
      }) || null
    );
  };

  // Reset to clean empty form or sync editing / scanned vehicle
  useEffect(() => {
    if (editingVehicle) {
      setFormData(editingVehicle);
      setIsImportedFromScan(false);
    } else if (initialScannedData) {
      setFormData({
        plate: initialScannedData.plate || '',
        renavam: initialScannedData.renavam || '',
        chassis: initialScannedData.chassis || '',
        brandModel: initialScannedData.brandModel || '',
        yearFabMod: initialScannedData.yearFabMod || '',
        vehicleType: initialScannedData.vehicleType || 'Toco',
        fuel: initialScannedData.fuel || '',
        color: initialScannedData.color || '',
        ownerName: initialScannedData.ownerName || '',
        ownerCnpjCpf: initialScannedData.ownerCnpjCpf || '',
        cityUf: initialScannedData.cityUf || '',
        licensingStatus: initialScannedData.licensingStatus || 'EM_DIA',
        assignedDriverId: initialScannedData.assignedDriverId || '',
      });
      setIsImportedFromScan(true);
    } else {
      setFormData({
        plate: '',
        renavam: '',
        chassis: '',
        brandModel: '',
        yearFabMod: '',
        vehicleType: 'Toco',
        fuel: '',
        color: '',
        ownerName: '',
        ownerCnpjCpf: '',
        cityUf: '',
        licensingStatus: 'EM_DIA',
        assignedDriverId: '',
      });
      setIsImportedFromScan(false);
    }
    setFormError('');
    setDuplicateVehicleFound(null);
  }, [editingVehicle, initialScannedData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanPlate = (formData.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanRenavam = (formData.renavam || '').replace(/\D/g, '');
    const cleanModel = (formData.brandModel || '').trim();

    if (!cleanPlate || cleanPlate.length < 7) {
      setFormError('Informe uma Placa válida (7 caracteres, padrão Mercosul ou antigo).');
      return;
    }

    if (!cleanRenavam || cleanRenavam.length < 9) {
      setFormError('Informe um RENAVAM válido (mínimo 9 dígitos numéricos).');
      return;
    }

    if (!cleanModel) {
      setFormError('Informe a Marca / Modelo do veículo.');
      return;
    }

    const dup = findDuplicateVehicle(formData, editingVehicle?.id);
    if (dup && (!editingVehicle || editingVehicle.id !== dup.id)) {
      setDuplicateVehicleFound(dup);
      return;
    }

    const savedVehicle: Vehicle = {
      id: editingVehicle ? editingVehicle.id : `veh-${Date.now().toString().slice(-4)}`,
      plate: cleanPlate,
      renavam: cleanRenavam,
      chassis: (formData.chassis || '').toUpperCase().trim(),
      brandModel: cleanModel,
      yearFabMod: formData.yearFabMod || '',
      vehicleType: (formData.vehicleType as VehicleType) || 'Toco',
      fuel: formData.fuel || '',
      color: formData.color || '',
      ownerName: formData.ownerName || '',
      ownerCnpjCpf: formData.ownerCnpjCpf || '',
      cityUf: formData.cityUf || '',
      assignedDriverId: formData.assignedDriverId || undefined,
      licensingStatus: formData.licensingStatus || 'EM_DIA',
      activeFinesCount: editingVehicle ? editingVehicle.activeFinesCount : 0,
      totalFinesValue: editingVehicle ? editingVehicle.totalFinesValue : 0,
      createdAt: editingVehicle ? editingVehicle.createdAt : new Date().toISOString().slice(0, 10),
    };

    onSaveVehicle(savedVehicle);
    onClose();
  };

  return (
    <div
      id="vehicle-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="vehicle-modal-card"
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 my-8 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingVehicle ? 'Editar Veículo da Frota' : 'Novo Cadastro de Veículo'}
              </h3>
              <p className="text-xs text-slate-500">
                Preencha os dados do veículo (CRLV), tipo de veículo e motorista titular
              </p>
            </div>
          </div>
          <button
            id="btn-close-vehicle-modal"
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

            {duplicateVehicleFound && (
              <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs text-red-800 space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900 text-sm">
                      ⚠️ Alerta de Duplicidade Detectada no Cadastro!
                    </p>
                    <p className="mt-0.5 text-red-700">
                      O veículo de Placa <strong>{duplicateVehicleFound.plate}</strong> (RENAVAM{' '}
                      <strong>{duplicateVehicleFound.renavam}</strong> — {duplicateVehicleFound.brandModel}) já está cadastrado no sistema!
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(duplicateVehicleFound);
                      setDuplicateVehicleFound(null);
                      setFormError('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Editar Veículo Existente ({duplicateVehicleFound.plate})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateVehicleFound(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Corrigir Placa / Renavam
                  </button>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Placa */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Placa do Veículo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.plate || ''}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    placeholder="BRA2E19"
                    maxLength={8}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono tracking-wider"
                    required
                  />
                </div>
              </div>

              {/* RENAVAM */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código RENAVAM <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.renavam || ''}
                    onChange={(e) => setFormData({ ...formData, renavam: e.target.value.replace(/\D/g, '') })}
                    placeholder="01234567890"
                    maxLength={11}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Marca / Modelo */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marca / Modelo / Versão <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.brandModel || ''}
                  onChange={(e) => setFormData({ ...formData, brandModel: e.target.value })}
                  placeholder="ex: SCANIA R 450 6X2 / M.BENZ ACTROS 2651"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>

              {/* Chassi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número do Chassi</label>
                <input
                  type="text"
                  value={formData.chassis || ''}
                  onChange={(e) => setFormData({ ...formData, chassis: e.target.value.toUpperCase() })}
                  placeholder="9BWCA05X1EP000000"
                  maxLength={17}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                />
              </div>

              {/* Ano Fab/Mod */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ano Fabricação / Modelo</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.yearFabMod || ''}
                    onChange={(e) => setFormData({ ...formData, yearFabMod: e.target.value })}
                    placeholder="2023/2024"
                    maxLength={9}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Tipo de Veículo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Veículo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vehicleType || 'Toco'}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as VehicleType })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                >
                  <option value="Toco">Toco (2 eixos - rígido)</option>
                  <option value="Truck">Truck (3 eixos - rígido)</option>
                  <option value="Bitruck">Bitruck (4 eixos - rígido)</option>
                  <option value="3/4">3/4 (Três Quartos / VUC)</option>
                  <option value="Van">Van / Furgão</option>
                  <option value="Utilitário">Utilitário / Pickup</option>
                  <option value="Cavalo Mecânico">Cavalo Mecânico (Trator)</option>
                  <option value="Caminhão">Caminhão (Geral)</option>
                  <option value="Carreta">Carreta / Semirreboque</option>
                  <option value="Automóvel">Automóvel</option>
                  <option value="Ônibus">Ônibus / Micro-ônibus</option>
                </select>
              </div>

              {/* Combustível */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Combustível</label>
                <input
                  type="text"
                  value={formData.fuel || ''}
                  onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
                  placeholder="Diesel S10 / Flex"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Cor Predominante */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cor Predominante</label>
                <input
                  type="text"
                  value={formData.color || ''}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="BRANCA"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              {/* Município / UF de Registro */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Município / UF de Registro</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.cityUf || ''}
                    onChange={(e) => setFormData({ ...formData, cityUf: e.target.value })}
                    placeholder="São Paulo / SP"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Motorista Titular da Frota */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motorista Titular Vinculado
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={formData.assignedDriverId || ''}
                    onChange={(e) => setFormData({ ...formData, assignedDriverId: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                  >
                    <option value="">Sem motorista titular fixo (rotativo)</option>
                    {drivers.map((drv) => (
                      <option key={drv.id} value={drv.id}>
                        {drv.name} (CNH: {drv.cnhNumber} - Cat. {drv.cnhCategory})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Razão Social / Proprietário */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proprietário / Razão Social</label>
                <input
                  type="text"
                  value={formData.ownerName || ''}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="Nome do proprietário no CRLV"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              {/* CNPJ / CPF Proprietário */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ / CPF do Proprietário</label>
                <input
                  type="text"
                  value={formData.ownerCnpjCpf || ''}
                  onChange={(e) => setFormData({ ...formData, ownerCnpjCpf: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Status do Licenciamento */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status do Licenciamento Anual (Detran)
                </label>
                <select
                  value={formData.licensingStatus || 'EM_DIA'}
                  onChange={(e) => setFormData({ ...formData, licensingStatus: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
                >
                  <option value="EM_DIA">✅ Licenciamento Em Dia / Quitado</option>
                  <option value="PENDENTE">⚠️ Pendente de Renovação</option>
                  <option value="VENCIDO">❌ Vencido / Restrição no Detran</option>
                </select>
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
                id="btn-save-vehicle-submit"
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingVehicle ? 'Atualizar Veículo' : 'Salvar Veículo'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
