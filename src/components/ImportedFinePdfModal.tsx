import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  Eye,
  CheckCircle2,
  MapPin,
  Building2,
  QrCode,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { TrafficFine } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../lib/formatters';
import {
  buildFineDetailPrintPayload,
  downloadImportedFinePdf,
  generateImportedFinePdfDataUrl,
  triggerNativeHtmlPrint,
} from '../lib/printService';

interface ImportedFinePdfViewerProps {
  fine: Partial<TrafficFine>;
  compact?: boolean;
}

export const ImportedFinePdfViewer: React.FC<ImportedFinePdfViewerProps> = ({
  fine,
  compact = false,
}) => {
  const [viewMode, setViewMode] = useState<'mirror' | 'native'>('mirror');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const isUploadedImage =
    Boolean(fine.pdfDataUrl && fine.pdfDataUrl.startsWith('data:image/')) ||
    Boolean(fine.pdfMimeType && fine.pdfMimeType.startsWith('image/'));

  const hasRawUploadedPdf =
    Boolean(fine.pdfDataUrl && fine.pdfDataUrl.startsWith('data:application/pdf')) ||
    Boolean(fine.pdfMimeType === 'application/pdf' && fine.pdfDataUrl);

  useEffect(() => {
    let createdUrl: string | null = null;
    try {
      const dataUri = fine.pdfDataUrl || generateImportedFinePdfDataUrl(fine);
      if (dataUri && dataUri.startsWith('data:')) {
        const parts = dataUri.split(',');
        if (parts.length === 2) {
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      }
    } catch {
      setBlobUrl(null);
    }

    return () => {
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [
    fine.pdfDataUrl,
    fine.aitNumber,
    fine.plate,
    fine.fineAmount,
    fine.infractionCode,
    fine.infractionDescription,
    fine.infractionLocation,
  ]);

  const isDoubled = Boolean(
    fine.isDoubledFine || (fine.multiplierFactor && fine.multiplierFactor > 1)
  );
  const multFactor = fine.multiplierFactor || (isDoubled ? 2 : 1);
  const amount = Number(fine.fineAmount) || 130.16;
  const discount = Number(fine.discountAmount) || Number((amount * 0.8).toFixed(2));
  const pdfName =
    fine.pdfFileName || `Notificacao_Autuacao_AIT_${fine.aitNumber || '000'}.pdf`;

  return (
    <div className="space-y-3">
      {/* Top Viewer Toolbar (Light Theme) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold text-slate-900 block truncate">
              {pdfName}
            </span>
            <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              PDF da Infração Importado e Disponível para Visualização
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('mirror')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
              viewMode === 'mirror'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Documento Formatado A4</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('native')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
              viewMode === 'native'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              {isUploadedImage
                ? 'Imagem Original Importada'
                : hasRawUploadedPdf
                ? 'PDF Original Anexado'
                : 'Leitor de PDF Embutido'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => downloadImportedFinePdf(fine)}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar PDF</span>
          </button>
        </div>
      </div>

      {/* Uploaded Image Preview (if user uploaded JPG/PNG/WEBP of the fine) */}
      {isUploadedImage && fine.pdfDataUrl && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-[11px] font-semibold text-slate-600 mb-2">
            Arquivo de Imagem da Infração Anexado ({pdfName}):
          </p>
          <img
            src={fine.pdfDataUrl}
            alt={pdfName}
            className="max-h-96 mx-auto rounded-lg border border-slate-300 object-contain bg-white"
          />
        </div>
      )}

      {/* Native PDF Embed Mode */}
      {viewMode === 'native' && !isUploadedImage && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              title={`PDF ${pdfName}`}
              className={`w-full ${compact ? 'h-[420px]' : 'h-[620px]'} bg-white border-0`}
            />
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              Carregando renderizador de PDF...
            </div>
          )}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Caso o bloqueador do navegador impeça o plug-in embutido, utilize a aba{' '}
              <strong className="text-slate-900">&quot;Documento Formatado A4&quot;</strong> ou clique em{' '}
              <strong className="text-emerald-700">&quot;Baixar PDF&quot;</strong>.
            </span>
            <button
              type="button"
              onClick={() => setViewMode('mirror')}
              className="text-blue-600 hover:underline font-bold cursor-pointer"
            >
              Ver Espelho A4
            </button>
          </div>
        </div>
      )}

      {/* High-Clarity Official A4 PDF Document Mirror (Light Theme) */}
      {viewMode === 'mirror' && (
        <div className="bg-slate-100 p-3 sm:p-5 rounded-xl border border-slate-200">
          <div className="bg-white text-slate-900 rounded-lg shadow-md border border-slate-300 max-w-3xl mx-auto overflow-hidden font-sans">
            {/* Official Top Banner (Light Theme) */}
            <div className="bg-slate-50 text-slate-900 px-5 py-4 border-b-4 border-red-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>República Federativa do Brasil • SENATRAN / RENAINF</span>
                </div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight mt-0.5 text-slate-900">
                  Notificação de Autuação de Infração de Trânsito — {fine.issuingAuthority || 'DETRAN / DER'}
                </h3>
                <p className="text-[11px] text-slate-600">
                  Documento PDF Importado:{' '}
                  <span className="font-mono text-slate-900 font-semibold">{pdfName}</span>
                </p>
              </div>

              <div className="bg-white text-slate-900 px-3.5 py-2 rounded-lg border-2 border-red-200 text-right shrink-0 shadow-xs">
                <span className="text-[9px] font-bold uppercase text-slate-500 block">
                  Nº do Auto de Infração (AIT)
                </span>
                <span className="font-mono font-black text-sm sm:text-base text-red-700">
                  {fine.aitNumber || 'N/A'}
                </span>
              </div>
            </div>

            {/* Body of the PDF Document */}
            <div className="p-5 space-y-4 text-xs">
              {/* Row 1: Placa, Data/Hora, Vencimento, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Placa do Veículo
                  </span>
                  <div className="mt-1 inline-block rounded border-2 border-blue-700 bg-white overflow-hidden">
                    <div className="bg-blue-700 text-white text-[7px] font-bold text-center px-2 py-0.2 tracking-widest">
                      BRASIL
                    </div>
                    <div className="font-mono font-black text-sm text-slate-900 px-2.5 py-0.5 tracking-wider">
                      {fine.plate || '---'}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Data e Hora da Infração
                  </span>
                  <span className="font-bold text-slate-900 text-xs mt-1 block">
                    {fine.infractionDate ? formatDateTime(fine.infractionDate) : '---'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Órgão: <strong>{fine.issuingAuthority || 'DER'}</strong>
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Vencimento da Notificação
                  </span>
                  <span className="font-bold text-red-700 text-xs mt-1 block">
                    {fine.dueDate ? formatDate(fine.dueDate) : '---'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600">
                    Status: <strong>{fine.status || 'PENDENTE'}</strong>
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Natureza / Pontuação CTB
                  </span>
                  <span className="font-black text-slate-900 text-xs mt-1 block">
                    {fine.severity || 'MÉDIA'}
                  </span>
                  <span className="text-[10px] font-bold text-blue-700">
                    {isDoubled ? '0 Pontos (Multa NIC 2x)' : `${fine.points ?? 4} Pontos na CNH`}
                  </span>
                </div>
              </div>

              {/* Row 2: Enquadramento CTB */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-700">
                    Tipificação e Enquadramento Legal (Código de Trânsito Brasileiro - CTB)
                  </span>
                  <span className="font-mono font-black text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    Cód. Infração: {fine.infractionCode || '7455-0'}
                  </span>
                </div>
                <div className="p-3.5 bg-white">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                    {fine.infractionDescription || 'Descrição da infração não informada'}
                  </p>
                </div>
              </div>

              {/* Row 3: Local da Infração & Proprietário / Condutor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                  <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    Local da Infração / Município - UF
                  </span>
                  <p className="font-bold text-slate-900 mt-1">
                    {fine.infractionLocation || '---'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Município: <strong>{fine.city || 'São Paulo'}/{fine.state || 'SP'}</strong>
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                  <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-blue-600" />
                    Proprietário e Condutor Identificado
                  </span>
                  <p className="font-bold text-slate-900 mt-1 truncate">
                    {fine.ownerCnpjRazaoSocial || 'Proprietário / Frota Registrada'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Condutor:{' '}
                    <strong className="text-slate-900">
                      {fine.driverName || (isDoubled ? 'Não Indicado (NIC PJ)' : 'Condutor a identificar')}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Row 4: Quadro Financeiro e Desconto SNE */}
              <div className="border-2 border-slate-300 rounded-lg p-3.5 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    {isDoubled
                      ? `Valor da Multa Multiplicada (${multFactor}x NIC PJ)`
                      : 'Valor Integral da Autuação (R$)'}
                  </span>
                  <span className="text-xl font-black text-red-700 font-mono">
                    {formatCurrency(amount)}
                  </span>
                  {isDoubled && (
                    <span className="block text-[10px] font-bold text-amber-800 mt-0.5">
                      ⚖️ Art. 257 § 8º CTB — Não Indicação de Condutor (Sem pontos na CNH)
                    </span>
                  )}
                </div>

                <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                    Valor p/ Pagamento c/ Desconto SNE (20%)
                  </span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {formatCurrency(discount)}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    Válido até o vencimento ({fine.dueDate ? formatDate(fine.dueDate) : '---'})
                  </span>
                </div>
              </div>

              {/* Simulated Barcode / Authentication Footer */}
              <div className="pt-3 border-t-2 border-dashed border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">
                    Linha Digitável / Autenticação RENAINF do PDF Importado
                  </span>
                  <p className="font-mono text-[11px] font-bold text-slate-800 tracking-wider bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                    85890.00001 30160.10928 49201.92849 1 000000{Math.round(amount * 100)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <QrCode className="w-8 h-8 text-slate-700 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-700">QR Code PIX / SNE</p>
                    <p>AIT {fine.aitNumber}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ImportedFinePdfModalProps {
  fine: TrafficFine | null;
  onClose: () => void;
}

export const ImportedFinePdfModal: React.FC<ImportedFinePdfModalProps> = ({ fine, onClose }) => {
  if (!fine) return null;

  const handlePrint = () => {
    const payload = buildFineDetailPrintPayload(fine);
    triggerNativeHtmlPrint(payload.htmlContent);
  };

  return (
    <div
      id="imported-fine-pdf-modal"
      className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
        {/* Modal Header (Light Theme) */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Visualização da Notificação (PDF Importado) — AIT {fine.aitNumber}
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                  PDF Disponível
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Arquivo:{' '}
                <strong className="text-slate-900">
                  {fine.pdfFileName || `Notificacao_AIT_${fine.aitNumber}.pdf`}
                </strong>{' '}
                • Placa: <strong className="text-blue-700 font-mono">{fine.plate}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={() => downloadImportedFinePdf(fine)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF Importado</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Fechar Visualização do PDF"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-50/60">
          <ImportedFinePdfViewer fine={fine} />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Auto de Infração <strong className="text-slate-900">{fine.aitNumber}</strong> • Placa{' '}
            <strong className="text-blue-700 font-mono">{fine.plate}</strong> • Valor{' '}
            <strong className="text-slate-900">{formatCurrency(fine.fineAmount)}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};
