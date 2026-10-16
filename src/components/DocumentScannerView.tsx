import React, { useState } from 'react';
import {
  ScanLine,
  Camera,
  Upload,
  User,
  Truck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileText,
  ShieldCheck,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  AlertCircle,
  FileWarning,
} from 'lucide-react';
import { Driver, Vehicle } from '../types';
import { CNHScannerModal } from './CNHScannerModal';
import { CRLVScannerModal } from './CRLVScannerModal';

interface DocumentScannerViewProps {
  onRegisterDriverWithData: (data: Partial<Driver>) => void;
  onRegisterVehicleWithData: (data: Partial<Vehicle>) => void;
  onOpenAIFineImportModal?: (target?: 'general' | 'operacao-ca') => void;
}

export const DocumentScannerView: React.FC<DocumentScannerViewProps> = ({
  onRegisterDriverWithData,
  onRegisterVehicleWithData,
  onOpenAIFineImportModal,
}) => {
  const [selectedDocType, setSelectedDocType] = useState<'cnh' | 'crlv' | 'fine'>('cnh');
  const [isCnhScannerOpen, setIsCnhScannerOpen] = useState(false);
  const [isCrlvScannerOpen, setIsCrlvScannerOpen] = useState(false);

  const [lastScannedDriver, setLastScannedDriver] = useState<Partial<Driver> | null>(null);
  const [lastScannedVehicle, setLastScannedVehicle] = useState<Partial<Vehicle> | null>(null);

  const handleCnhScanComplete = (scannedData: Partial<Driver>) => {
    setLastScannedDriver(scannedData);
    setIsCnhScannerOpen(false);
  };

  const handleCrlvScanComplete = (scannedData: Partial<Vehicle>) => {
    setLastScannedVehicle(scannedData);
    setIsCrlvScannerOpen(false);
  };

  return (
    <div id="document-scanner-view" className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
              <ScanLine className="w-3.5 h-3.5" />
              <span>Central de Digitalização & OCR com Google AI</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Escanear Documentos (CNH, CRLV e Multas)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Ambiente dedicado para capturar fotos pela câmera ou upload e extrair dados automaticamente com IA para a frota.
            </p>
          </div>

          {/* Quick Tabs Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setSelectedDocType('cnh')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedDocType === 'cnh'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Escanear CNH</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDocType('crlv')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedDocType === 'crlv'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Escanear CRLV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDocType('fine');
                if (onOpenAIFineImportModal) {
                  onOpenAIFineImportModal('general');
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedDocType === 'fine'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileWarning className="w-3.5 h-3.5" />
              <span>Escanear Multa (AIT)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedDocType === 'cnh' ? (
        <div className="space-y-6">
          {/* CNH Hero Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Leitura Digital de Carteira Nacional de Habilitação</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
                Digitalizar CNH do Motorista
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Use a câmera do smartphone ou faça upload de uma foto/PDF da CNH. O sistema faz a leitura dos campos (Nome, CPF, Registro, Categoria, Filiação Pai e Mãe, RENACH e Validade) e transfere diretamente para o cadastro.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  id="btn-open-cnh-scanner"
                  onClick={() => setIsCnhScannerOpen(true)}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Abrir Câmera / Escanear CNH</span>
                </button>

                {lastScannedDriver && (
                  <button
                    type="button"
                    onClick={() => onRegisterDriverWithData(lastScannedDriver)}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Conferir no Cadastro de Motorista →</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Last Scanned Result Display */}
          {lastScannedDriver && (
            <div className="bg-white rounded-2xl border-2 border-emerald-300 p-5 sm:p-6 shadow-sm animate-fade-in space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Última CNH Escaneada com Sucesso
                    </h4>
                    <p className="text-xs text-slate-500">
                      Confira os dados extraídos abaixo antes de transferir para o cadastro
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCnhScannerOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Escanear Outra</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRegisterDriverWithData(lastScannedDriver)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Preencher Cadastro →</span>
                  </button>
                </div>
              </div>

              {/* Grid of Extracted Driver Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Nome do Condutor</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.name || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">CPF</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.cpf || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Registro CNH</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.cnhNumber || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Categoria CNH</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.cnhCategory || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Validade CNH</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.cnhExpiration || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Data Nascimento</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.birthDate || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Nome da Mãe</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.motherName || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Nome do Pai</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.fatherName || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Nº RENACH</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.renachNumber || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Cód. Segurança</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.cnhSecurityCode || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">1ª Habilitação</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.firstLicenseDate || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Data de Emissão</span>
                  <span className="font-bold text-slate-900">{lastScannedDriver.cnhIssueDate || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : selectedDocType === 'crlv' ? (
        <div className="space-y-6">
          {/* CRLV Hero Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Leitura Digital de CRLV do Veículo</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
                Digitalizar Documento do Veículo (CRLV)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Use a câmera do celular ou carregue o documento CRLV em foto ou PDF. O sistema extrai Placa, RENAVAM, Chassi, Marca/Modelo, Ano, Tipo de Veículo e Proprietário.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  id="btn-open-crlv-scanner"
                  onClick={() => setIsCrlvScannerOpen(true)}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Abrir Câmera / Escanear CRLV</span>
                </button>

                {lastScannedVehicle && (
                  <button
                    type="button"
                    onClick={() => onRegisterVehicleWithData(lastScannedVehicle)}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Conferir no Cadastro de Veículo →</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Last Scanned Result Display */}
          {lastScannedVehicle && (
            <div className="bg-white rounded-2xl border-2 border-emerald-300 p-5 sm:p-6 shadow-sm animate-fade-in space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Último CRLV Escaneado com Sucesso
                    </h4>
                    <p className="text-xs text-slate-500">
                      Confira os dados extraídos antes de transferir para o cadastro de veículos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCrlvScannerOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Escanear Outro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRegisterVehicleWithData(lastScannedVehicle)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Preencher Cadastro →</span>
                  </button>
                </div>
              </div>

              {/* Grid of Extracted Vehicle Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Placa</span>
                  <span className="font-bold text-slate-900">{lastScannedVehicle.plate || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">RENAVAM</span>
                  <span className="font-bold text-slate-900">{lastScannedVehicle.renavam || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Marca / Modelo</span>
                  <span className="font-bold text-slate-900">{lastScannedVehicle.brandModel || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Chassi</span>
                  <span className="font-bold text-slate-900">{lastScannedVehicle.chassis || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Ano Fab/Mod</span>
                  <span className="font-bold text-slate-900">{lastScannedVehicle.yearFabMod || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Tipo do Veículo</span>
                  <span className="font-bold text-slate-900">{lastScannedVehicle.vehicleType || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Proprietário</span>
                  <span className="font-bold text-slate-900">{lastScannedVehicle.ownerName || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Município / UF</span>
                  <span className="font-bold text-slate-900">{lastScannedVehicle.cityUf || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : selectedDocType === 'fine' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 text-amber-600 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Auditoria e Digitalização de Infrações com Google AI</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
                Digitalizar Auto de Infração (AIT / Notificação)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Use a câmera do dispositivo ou faça upload da Notificação de Autuação (PDF ou Imagem). O motor Google Gemini analisa o documento em tempo real, extrai o número do AIT, placa, enquadramento CTB, valores e datas sem risco de erros manuais.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  id="btn-open-fine-ai-scanner"
                  onClick={() => onOpenAIFineImportModal && onOpenAIFineImportModal('general')}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Importar para Multas de Trânsito</span>
                </button>

                <button
                  type="button"
                  id="btn-open-fine-ca-scanner"
                  onClick={() => onOpenAIFineImportModal && onOpenAIFineImportModal('operacao-ca')}
                  className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Importar para Operação C.A & Folha</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* CNH Scanner Modal */}
      <CNHScannerModal
        isOpen={isCnhScannerOpen}
        onClose={() => setIsCnhScannerOpen(false)}
        onScanComplete={handleCnhScanComplete}
      />

      {/* CRLV Scanner Modal */}
      <CRLVScannerModal
        isOpen={isCrlvScannerOpen}
        onClose={() => setIsCrlvScannerOpen(false)}
        onScanComplete={handleCrlvScanComplete}
      />
    </div>
  );
};
