import React, { useEffect, useRef, useState } from 'react';
import { Printer, Download, FileDown, X, CheckCircle2, FileText } from 'lucide-react';
import {
  PrintableDocumentPayload,
  downloadPrintableHtmlFile,
  triggerNativeHtmlPrint,
} from '../lib/printService';

interface PrintPreviewModalProps {
  payload: PrintableDocumentPayload | null;
  onClose: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ payload, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string>('');

  useEffect(() => {
    if (!payload) return;
    setActionFeedback('');
    // Attempt native print automatically once the preview iframe loads
    const timer = setTimeout(() => {
      try {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.focus();
          iframeRef.current.contentWindow.print();
        }
      } catch {
        // Ignore if sandboxed iframe blocks automatic print dialog
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [payload]);

  if (!payload) return null;

  const handleDirectPrint = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        triggerNativeHtmlPrint(payload.htmlContent);
      }
      setActionFeedback(
        'Comando de impressão enviado! Caso o navegador bloqueie janelas de impressão nesta aba, clique em "Baixar PDF para Imprimir" ao lado.'
      );
    } catch {
      payload.onDownloadPdf();
      setActionFeedback('PDF gerado e baixado automaticamente para impressão!');
    }
  };

  const handleDownloadPdf = () => {
    payload.onDownloadPdf();
    setActionFeedback('Arquivo PDF A4 baixado com sucesso! Abra o arquivo baixado para imprimir.');
  };

  const handleDownloadAutoPrintHtml = () => {
    downloadPrintableHtmlFile(payload.htmlContent, payload.fileName);
    setActionFeedback('Folha de impressão baixada! Ao abrir o arquivo, a janela da impressora abrirá automaticamente.');
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Action Bar */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">{payload.title}</h3>
              {payload.subtitle && <p className="text-xs text-slate-600">{payload.subtitle}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDirectPrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Agora</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar PDF para Imprimir (.PDF)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAutoPrintHtml}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Abrir Folha de Impressão</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
              title="Fechar Visualização de Impressão"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {actionFeedback && (
          <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-200 text-blue-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Document Preview Container */}
        <div className="flex-1 bg-slate-200/80 p-4 sm:p-6 overflow-y-auto flex justify-center">
          <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl border border-slate-300 overflow-hidden min-h-[700px]">
            <iframe
              ref={iframeRef}
              title={payload.title}
              srcDoc={payload.htmlContent}
              className="w-full h-full min-h-[700px] border-0"
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Dica: Se a caixa de diálogo da impressora não abrir automaticamente na pré-visualização, clique em{' '}
              <strong>"Baixar PDF para Imprimir (.PDF)"</strong>.
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
