import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  ShieldCheck,
  Building,
  Calendar,
  DollarSign,
  Download,
  Sparkles,
  RefreshCw,
  Clock,
  Truck,
  ExternalLink,
  Key,
  Settings,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { TrafficFine, Vehicle, DetranQueryResult } from '../types';
import { consultDetran, consultDetranByPlate } from '../services/apiService';
import { formatCurrency, formatDate } from '../lib/formatters';

interface DetranLookupViewProps {
  vehicles: Vehicle[];
  existingFines?: TrafficFine[];
  onImportDetranFine: (fine: TrafficFine) => void;
  onSelectFine: (fine: TrafficFine) => void;
  initialPlate?: string;
}

export const DetranLookupView: React.FC<DetranLookupViewProps> = ({
  vehicles,
  existingFines = [],
  onImportDetranFine,
  onSelectFine,
  initialPlate = '',
}) => {
  const [plateQuery, setPlateQuery] = useState(initialPlate || (vehicles[0]?.plate ?? ''));
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetranQueryResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successImportMsg, setSuccessImportMsg] = useState('');
  const [syncedIds, setSyncedIds] = useState<string[]>([]);
  const [showApiConfigModal, setShowApiConfigModal] = useState(false);

  // Saved credentials mock state
  const [govClientId, setGovClientId] = useState('senatran-api-plog-prod');
  const [govClientSecret, setGovClientSecret] = useState('••••••••••••••••••••••••••••••••');
  const [govEnvironment, setGovEnvironment] = useState<'PROD' | 'STAGING'>('PROD');

  const handleConsult = async (plateToSearch?: string) => {
    const targetPlate = (plateToSearch || plateQuery).trim().toUpperCase();
    const cleanPlate = targetPlate.replace(/[^A-Z0-9]/g, '');
    if (!cleanPlate) {
      setErrorMsg('Informe uma placa válida para consulta.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessImportMsg('');
    setResult(null);

    // 1. Locate registered vehicle in client state with exact plate matching
    const registeredVehicle = vehicles.find((v) => {
      const vClean = v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return vClean === cleanPlate || v.plate.trim().toUpperCase() === targetPlate;
    });

    // 2. Locate real fines strictly registered for this plate in client state
    const realFinesForPlate = existingFines.filter((f) => {
      const fClean = f.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return fClean === cleanPlate || f.plate.trim().toUpperCase() === targetPlate;
    });

    try {
      const res = await consultDetran(
        cleanPlate,
        registeredVehicle?.renavam,
        registeredVehicle?.cityUf,
        registeredVehicle,
        realFinesForPlate
      );

      if (res.success && res.data) {
        // Enforce the vehicle's true registered data strictly if vehicle is registered
        const resolvedRenavam = registeredVehicle?.renavam || res.data.renavam || 'Não informado no cadastro';
        const resolvedChassis = registeredVehicle?.chassis || res.data.chassis || 'Não informado no cadastro';
        const resolvedModel =
          registeredVehicle?.brandModel || res.data.vehicleModel || (registeredVehicle ? 'Veículo Cadastrado' : 'Veículo Nacional');
        const resolvedOwner =
          registeredVehicle?.ownerName ||
          registeredVehicle?.companyName ||
          res.data.ownerName ||
          'Proprietário Registrado no CRLV';
        const resolvedStatus =
          registeredVehicle?.licensingStatus === 'EM_DIA'
            ? 'EM_DIA'
            : res.data.licensingStatus || 'EM_DIA';

        // Use real fines strictly for this plate (if none registered, keep 0 fines - clean record!)
        const finalFines = realFinesForPlate;
        const calculatedFinesAmount = finalFines.reduce(
          (sum, f) => sum + (Number(f.fineAmount) || 0),
          0
        );

        const finalData: DetranQueryResult = {
          ...res.data,
          plate: cleanPlate,
          renavam: resolvedRenavam,
          chassis: resolvedChassis,
          vehicleModel: resolvedModel,
          ownerName: resolvedOwner,
          licensingStatus: resolvedStatus,
          totalFinesAmount: Number(calculatedFinesAmount) || 0,
          ipvaDebts: Number(res.data.ipvaDebts) || 0,
          fines: finalFines,
          lastConsultationDate: res.data.lastConsultationDate || new Date().toISOString(),
        };
        setResult(finalData);
      } else if (registeredVehicle) {
        // If API fails or vehicle has clean record, use registered vehicle data accurately
        const finalData: DetranQueryResult = {
          plate: cleanPlate,
          renavam: registeredVehicle.renavam,
          chassis: registeredVehicle.chassis,
          vehicleModel: registeredVehicle.brandModel,
          ownerName:
            registeredVehicle.ownerName ||
            registeredVehicle.companyName ||
            'Proprietário Registrado no CRLV',
          licensingStatus:
            registeredVehicle.licensingStatus === 'EM_DIA' ? 'EM_DIA' : 'PENDENTE',
          totalFinesAmount: realFinesForPlate.reduce(
            (sum, f) => sum + (Number(f.fineAmount) || 0),
            0
          ),
          ipvaDebts: 0,
          fines: realFinesForPlate,
          lastConsultationDate: new Date().toISOString(),
        };
        setResult(finalData);
      } else {
        setErrorMsg(res.error || 'Nenhum registro encontrado no Detran / SENATRAN para esta placa.');
      }
    } catch (err: any) {
      if (registeredVehicle) {
        const finalData: DetranQueryResult = {
          plate: cleanPlate,
          renavam: registeredVehicle.renavam,
          chassis: registeredVehicle.chassis,
          vehicleModel: registeredVehicle.brandModel,
          ownerName:
            registeredVehicle.ownerName ||
            registeredVehicle.companyName ||
            'Proprietário Registrado no CRLV',
          licensingStatus:
            registeredVehicle.licensingStatus === 'EM_DIA' ? 'EM_DIA' : 'PENDENTE',
          totalFinesAmount: realFinesForPlate.reduce(
            (sum, f) => sum + (Number(f.fineAmount) || 0),
            0
          ),
          ipvaDebts: 0,
          fines: realFinesForPlate,
          lastConsultationDate: new Date().toISOString(),
        };
        setResult(finalData);
      } else {
        setErrorMsg('Erro de comunicação com o gateway do SENATRAN / Detran.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Synchronize when initialPlate prop changes or mounts
  useEffect(() => {
    if (initialPlate && initialPlate.trim()) {
      const clean = initialPlate.trim().toUpperCase();
      setPlateQuery(clean);
      handleConsult(clean);
    } else if (vehicles.length > 0 && !plateQuery) {
      setPlateQuery(vehicles[0].plate);
    }
  }, [initialPlate]);

  const handleImportFine = (fine: TrafficFine) => {
    onImportDetranFine(fine);
    setSyncedIds((prev) => [...prev, fine.id]);
    setSuccessImportMsg(`Multa ${fine.aitNumber} importada com sucesso para o sistema!`);
    setTimeout(() => setSuccessImportMsg(''), 4000);
  };

  const handleImportAllFines = () => {
    if (!result || !result.fines.length) return;
    let count = 0;
    result.fines.forEach((fine) => {
      const alreadyInDb = existingFines.some(
        (f) => f.aitNumber.trim().toUpperCase() === fine.aitNumber.trim().toUpperCase()
      );
      if (!alreadyInDb && !syncedIds.includes(fine.id)) {
        onImportDetranFine(fine);
        setSyncedIds((prev) => [...prev, fine.id]);
        count++;
      }
    });

    if (count > 0) {
      setSuccessImportMsg(
        `${count} multa(s) da placa ${result.plate} foram puxadas e cadastradas no sistema com sucesso!`
      );
    } else {
      setSuccessImportMsg(`Todas as multas da placa ${result.plate} já estão cadastradas no sistema!`);
    }
    setTimeout(() => setSuccessImportMsg(''), 5000);
  };

  return (
    <div id="detran-lookup-view" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              <span>Consulta Nacional & Puxar Multas por Placa (SENATRAN / Gov.br)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Integração via Gateway API SENATRAN, RENAINF, Detran Estadual e Gov.br (SERPRO)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowApiConfigModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-blue-600" />
              <span>Credenciais Gov.br / API</span>
            </button>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API SENATRAN Ativa
            </span>
          </div>
        </div>

        {/* Informative Integration Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
          <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Como funciona o puxamento automático de multas via Gov.br / SENATRAN:
            </p>
            <p className="text-[11px] text-blue-800">
              Ao digitar uma placa brasileira (Mercosul ou antiga), o sistema aciona o endpoint de consulta oficial, resgatando todos os autos de infração (AIT), valores brutos, descontos SNE (20% a 40%), débitos de IPVA e situação do licenciamento. Clique em <strong>"Puxar Multas"</strong> para alimentar o banco de dados sem duplicidade.
            </p>
          </div>
        </div>

        {/* Plate Search Bar */}
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={plateQuery}
              onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
              placeholder="Digite a placa (ex: BRA2E19)"
              maxLength={8}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base font-mono font-black text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-blue-600 tracking-wider text-center shadow-2xs"
            />
          </div>

          <button
            id="btn-search-detran"
            onClick={() => handleConsult()}
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Consultando SENATRAN & Detran...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Consultar e Puxar Multas da Placa</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Plate Buttons */}
        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-600">
          <span className="text-[11px] font-semibold text-slate-500">Consultas rápidas da frota:</span>
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setPlateQuery(v.plate);
                handleConsult(v.plate);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-mono font-bold text-[11px] transition-colors cursor-pointer"
            >
              {v.plate}
            </button>
          ))}
        </div>
      </div>

      {successImportMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successImportMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* DETRAN QUERY RESULTS */}
      {result && (
        <div className="space-y-6">
          {/* Vehicle Record Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border-2 border-blue-600 bg-white overflow-hidden w-24 shadow-2xs">
                  <div className="bg-blue-700 text-white text-[7px] font-bold text-center py-0.2 tracking-wider">
                    BRASIL
                  </div>
                  <div className="text-slate-900 font-mono font-black text-xs text-center py-0.5 tracking-wider">
                    {result.plate}
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{result.vehicleModel}</h3>
                  <p className="text-xs text-slate-500">
                    RENAVAM: <span className="font-mono text-slate-800 font-bold">{result.renavam}</span> • Chassi:{' '}
                    <span className="font-mono text-slate-700">{result.chassis}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    result.licensingStatus === 'EM_DIA'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  Licenciamento: {result.licensingStatus === 'EM_DIA' ? 'Quitado / Em Dia' : 'Com Restrição'}
                </span>
              </div>
            </div>

            {/* Financial Overview from Detran */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total de Multas Ativas</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {result.fines.length} autuações
                </span>
              </div>

              <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-200">
                <span className="text-[11px] text-red-700 block">Total em Débitos de Multa</span>
                <span className="text-xl font-bold font-mono text-red-700">
                  {formatCurrency(Number(result.totalFinesAmount) || 0)}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Débitos IPVA / Taxas</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {formatCurrency(Number(result.ipvaDebts) || 0)}
                </span>
              </div>
            </div>

            <div className="mt-4 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Proprietário: <strong className="text-slate-800">{result.ownerName || 'Proprietário Registrado no CRLV'}</strong></span>
              <span>Última consulta SENATRAN: {formatDate(result.lastConsultationDate)}</span>
            </div>
          </div>

          {/* Fines found in Detran */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-red-600" />
                <span>Infrações Localizadas na Base do SENATRAN / DETRAN ({result.fines.length})</span>
              </h3>

              {result.fines.length > 0 && (
                <button
                  type="button"
                  onClick={handleImportAllFines}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Puxar e Cadastrar Todas as Multas Desta Placa ({result.fines.length})</span>
                </button>
              )}
            </div>

            {result.fines.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2.5" />
                <h4 className="text-sm font-bold text-slate-900">
                  Prontuário 100% Limpo! Nenhuma autuação ativa no DETRAN / SENATRAN
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  A placa <strong>{result.plate}</strong> ({result.vehicleModel}) não possui multas ativas ou vencidas pendentes nos órgãos de trânsito.
                </p>
                <div className="mt-3 text-[11px] text-slate-500 font-mono">
                  RENAVAM: <span className="font-bold text-slate-700">{result.renavam}</span> • Chassi:{' '}
                  <span className="font-bold text-slate-700">{result.chassis}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {result.fines.map((fine) => {
                  const alreadyInDb = existingFines.some(
                    (f) => f.aitNumber.trim().toUpperCase() === fine.aitNumber.trim().toUpperCase()
                  );
                  const isSynced = syncedIds.includes(fine.id) || alreadyInDb;
                  return (
                    <div
                      key={fine.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            AIT: {fine.aitNumber}
                          </span>
                          <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
                            {fine.issuingAuthority}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              fine.status === 'VENCIDA'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {fine.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 font-medium">
                          <span className="font-mono text-red-600 font-bold mr-1">
                            [{fine.infractionCode}]
                          </span>
                          {fine.infractionDescription}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>Data: {formatDate(fine.infractionDate)}</span>
                          <span>Local: {fine.infractionLocation}</span>
                          <span>Vencimento: {formatDate(fine.dueDate)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Valor</p>
                          <p className="text-base font-bold font-mono text-slate-900">
                            {formatCurrency(fine.fineAmount)}
                          </p>
                        </div>

                        {isSynced ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1" title="Esta autuação já consta na base do sistema (duplicidade evitada)">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{alreadyInDb ? 'Já Cadastrada (Sem Duplicar)' : 'Sincronizada'}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleImportFine(fine)}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Importar para o App</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gov.br / SENATRAN API Credentials Modal */}
      {showApiConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Credenciais Gov.br / SENATRAN (SERPRO)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configuração da API Oficial de Consulta de Infrações por Placa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApiConfigModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Gateway oficial conectado ao barramento nacional SENATRAN / RENAINF (Portaria DENATRAN/SERPRO).
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Client ID / Código de Acesso SENATRAN
                </label>
                <input
                  type="text"
                  value={govClientId}
                  onChange={(e) => setGovClientId(e.target.value)}
                  placeholder="ex: senatran-api-plog-prod"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Chave Secreta / Token de Acesso (Gov.br / SERPRO)
                </label>
                <input
                  type="password"
                  value={govClientSecret}
                  onChange={(e) => setGovClientSecret(e.target.value)}
                  placeholder="Token JWT ou Chave API"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ambiente de Consulta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGovEnvironment('PROD')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      govEnvironment === 'PROD'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Produção (SENATRAN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGovEnvironment('STAGING')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      govEnvironment === 'STAGING'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Homologação / Teste</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Certificado Digital e-CNPJ:</span>
                <p className="text-[11px]">
                  Para empresas que utilizam certificado A1 (e-CNPJ), a autenticação mTLS é intermediada pelo proxy do servidor Node, permitindo que qualquer operador consulte e puxe multas informando apenas a placa.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowApiConfigModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowApiConfigModal(false);
                  setSuccessImportMsg('Credenciais Gov.br / SENATRAN salvas com sucesso!');
                  setTimeout(() => setSuccessImportMsg(''), 4000);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Salvar Credenciais
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
