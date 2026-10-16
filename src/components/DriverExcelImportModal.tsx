import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Users,
  AlertCircle,
  FileText,
  RotateCcw,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Driver, UserSession } from '../types';
import {
  parseDriverExcel,
  DriverImportResult,
  DriverImportRowPreview,
  convertPreviewToDriver,
  downloadDriverExcelTemplate,
} from '../lib/driverExcelImporter';

interface DriverExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedDrivers: Driver[], updateExisting: boolean) => void;
  existingDrivers: Driver[];
  currentUser?: UserSession;
}

export const DriverExcelImportModal: React.FC<DriverExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  existingDrivers,
  currentUser,
}) => {
  const isPlogSession = currentUser?.username?.toLowerCase() === 'plog';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [parseResult, setParseResult] = useState<DriverImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings
  const [updateExisting, setUpdateExisting] = useState(true);
  const [targetOperation, setTargetOperation] = useState<'AUTO' | 'PLOG' | 'FROTA_GERAL'>(
    isPlogSession ? 'PLOG' : 'AUTO'
  );

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setParseError(null);
    setIsLoading(true);
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseDriverExcel(buffer, existingDrivers);

      if (result.previewRows.length === 0) {
        setParseError('Nenhuma linha de motorista foi encontrada na planilha. Verifique se o arquivo possui dados.');
        setParseResult(null);
      } else {
        setParseResult(result);
      }
    } catch (err: any) {
      console.error('Erro ao ler planilha:', err);
      setParseError(err?.message || 'Falha ao processar arquivo. Verifique o formato do arquivo.');
      setParseResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult) return;

    setIsSubmitting(true);
    try {
      const rowsToImport = parseResult.previewRows.filter((row) => {
        if (!row.isValid) return false;
        if (row.isDuplicateExisting && !updateExisting) return false;
        return true;
      });

      if (rowsToImport.length === 0) {
        setParseError(
          'Nenhum motorista disponível para importar. Se todos já estão cadastrados, marque a opção "Atualizar motoristas já existentes" para atualizar seus dados.'
        );
        return;
      }

      const driversToSave: Driver[] = rowsToImport.map((row) => {
        const isPlog =
          targetOperation === 'PLOG' ? true : targetOperation === 'FROTA_GERAL' ? false : isPlogSession;
        return convertPreviewToDriver(row, {
          isPlogDriver: isPlog,
          operationType: isPlog ? 'PLOG' : 'FROTA_GERAL',
          companyName: currentUser?.companyName,
          companyCnpj: currentUser?.companyCnpj,
        });
      });

      onImportSuccess(driversToSave, updateExisting);
      handleResetAndClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setFileName('');
    setFileSize('');
    setParseResult(null);
    setParseError(null);
    setIsLoading(false);
    setIsSubmitting(false);
    onClose();
  };

  const countToImport = parseResult
    ? parseResult.previewRows.filter((r) => r.isValid && (updateExisting || !r.isDuplicateExisting)).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Importar Motoristas via Planilha Excel
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                  .XLSX / .CSV
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Importação em lote de condutores com validação de duplicidade por CPF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadDriverExcelTemplate}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              title="Baixar planilha modelo com as colunas corretas"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Baixar Modelo Excel</span>
            </button>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Expected Columns Visual Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-blue-950 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Colunas esperadas na planilha:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-blue-900 text-white font-black text-[11px] shadow-2xs">
                  MOTORISTA
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-900 text-white font-black text-[11px] shadow-2xs">
                  CPF
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-900 text-white font-black text-[11px] shadow-2xs">
                  RG
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-900 text-white font-black text-[11px] shadow-2xs">
                  CONTATO
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-900 text-white font-black text-[11px] shadow-2xs">
                  OBSERVAÇÃO
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadDriverExcelTemplate}
              className="sm:hidden self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Modelo (.xlsx)</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            className="hidden"
          />

          {!parseResult && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/60 bg-white'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                {isLoading ? (
                  <RotateCcw className="w-7 h-7 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-800">
                {isLoading ? 'Lendo e analisando linhas da planilha...' : 'Arraste sua planilha aqui ou clique para selecionar'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Suporta planilhas do Microsoft Excel (.xlsx, .xls) ou arquivos de valores separados por vírgula (.csv).
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Escolher Arquivo do Computador</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {parseError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <div className="flex-1">
                <strong className="block font-bold">Erro ao processar planilha:</strong>
                <span>{parseError}</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold shrink-0 cursor-pointer"
              >
                Tentar Outro Arquivo
              </button>
            </div>
          )}

          {/* Results & Interactive Preview */}
          {parseResult && (
            <div className="space-y-4">
              {/* File Info Bar + Reload Button */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900 truncate">{fileName}</span>
                  <span className="text-slate-400">({fileSize})</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  Substituir Planilha
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-black text-slate-500 block">Total Lido</span>
                  <strong className="text-lg font-black text-slate-900">{parseResult.totalParsed}</strong>
                  <span className="text-[10px] text-slate-500 block">linhas na planilha</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-black text-emerald-700 block">Prontos p/ Importar</span>
                  <strong className="text-lg font-black text-emerald-800">{countToImport}</strong>
                  <span className="text-[10px] text-emerald-600 block">cadastros válidos</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] uppercase font-black text-amber-700 block">CPF Já Cadastrado</span>
                  <strong className="text-lg font-black text-amber-800">{parseResult.duplicateExistingCount}</strong>
                  <span className="text-[10px] text-amber-600 block">no sistema</span>
                </div>

                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-[10px] uppercase font-black text-red-700 block">Inválidos</span>
                  <strong className="text-lg font-black text-red-800">{parseResult.invalidCount}</strong>
                  <span className="text-[10px] text-red-600 block">sem nome ou CPF</span>
                </div>
              </div>

              {/* Duplicate Handling Option & Operation Selector */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="font-bold text-slate-900 block mb-0.5">Tratamento de CPFs já cadastrados:</label>
                    <p className="text-[11px] text-slate-500">
                      Caso algum motorista da planilha já conste no sistema pelo número do CPF
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300">
                      <input
                        type="radio"
                        name="dupRule"
                        checked={!updateExisting}
                        onChange={() => setUpdateExisting(false)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-semibold text-slate-700">Ignorar duplicados</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300">
                      <input
                        type="radio"
                        name="dupRule"
                        checked={updateExisting}
                        onChange={() => setUpdateExisting(true)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-semibold text-slate-700">Atualizar dados</span>
                    </label>
                  </div>
                </div>

                {!isPlogSession && (
                  <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">Vincular Motoristas à Operação:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetOperation('AUTO')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          targetOperation === 'AUTO'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Padrão da Frota
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetOperation('PLOG')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          targetOperation === 'PLOG'
                            ? 'bg-amber-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        📦 P-LOG
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetOperation('FROTA_GERAL')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          targetOperation === 'FROTA_GERAL'
                            ? 'bg-slate-800 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Frota Geral
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Prévia das Linhas da Planilha ({parseResult.previewRows.length})</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    Mostrando dados formatados
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3">MOTORISTA</th>
                        <th className="py-2 px-3">CPF</th>
                        <th className="py-2 px-3">RG</th>
                        <th className="py-2 px-3">CONTATO</th>
                        <th className="py-2 px-3">OBSERVAÇÃO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {parseResult.previewRows.map((row, idx) => {
                        let statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-sans">
                            <Check className="w-3 h-3" /> Novo
                          </span>
                        );

                        if (!row.isValid) {
                          statusBadge = (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 font-sans"
                              title={row.validationError}
                            >
                              <AlertCircle className="w-3 h-3" /> Inválido
                            </span>
                          );
                        } else if (row.isDuplicateExisting) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-sans">
                              <AlertTriangle className="w-3 h-3" /> {updateExisting ? 'Atualizar' : 'Duplicado'}
                            </span>
                          );
                        }

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              !row.isValid
                                ? 'bg-red-50/30'
                                : row.isDuplicateExisting && !updateExisting
                                ? 'opacity-60 bg-amber-50/20'
                                : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center shrink-0">{statusBadge}</td>
                            <td className="py-2 px-3 font-sans font-bold text-slate-900">{row.name}</td>
                            <td className="py-2 px-3 text-slate-700">{row.cpf || '-'}</td>
                            <td className="py-2 px-3 text-slate-600">{row.rg || '-'}</td>
                            <td className="py-2 px-3 text-slate-600">{row.phone || '-'}</td>
                            <td className="py-2 px-3 font-sans text-slate-600 max-w-xs truncate">
                              {row.observations || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleResetAndClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          {parseResult && (
            <button
              type="button"
              disabled={isSubmitting || countToImport === 0}
              onClick={handleConfirmImport}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {isSubmitting
                  ? 'Importando e Sincronizando com Supabase...'
                  : `Confirmar e Importar ${countToImport} Motorista(s)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
