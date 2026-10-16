import { jsPDF } from 'jspdf';
import { DriverReceiptTerm, TrafficFine, Driver, Vehicle } from '../types';
import { formatCurrency, formatDate, formatDateTime } from './formatters';

export type PrintTermMode = 'AMBOS' | 'APENAS_TERMO' | 'APENAS_RECIBO';

export interface PrintableDocumentPayload {
  title: string;
  subtitle?: string;
  fileName: string;
  htmlContent: string;
  onDownloadPdf: () => void;
}

function cleanCompanyText(val?: string): string {
  if (!val) return '';
  if (/transbra[s]?il|translogistica|14\.285\.932/i.test(val)) {
    return '';
  }
  return val;
}

/**
 * Triggers native browser/iframe printing for a given HTML string.
 */
export function triggerNativeHtmlPrint(htmlDocument: string): boolean {
  try {
    const existingIframe = document.getElementById('ciit-print-iframe') as HTMLIFrameElement | null;
    if (existingIframe) {
      existingIframe.remove();
    }
    const iframe = document.createElement('iframe');
    iframe.id = 'ciit-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc && iframe.contentWindow) {
      doc.open();
      doc.write(htmlDocument);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 150);
      return true;
    }
    window.print();
    return true;
  } catch {
    try {
      window.print();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Downloads a standalone A4 HTML file that automatically opens the print dialog when opened.
 */
export function downloadPrintableHtmlFile(htmlDocument: string, baseFileName: string) {
  const autoPrintHtml = htmlDocument.replace(
    '</body>',
    `<script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script></body>`
  );
  const blob = new Blob([autoPrintHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseFileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Builds HTML and PDF generator for a Driver Receipt Term (Termo / Recibo de Multa).
 */
export function buildTermPrintPayload(
  term: DriverReceiptTerm,
  mode: PrintTermMode = 'AMBOS'
): PrintableDocumentPayload {
  const showTermo = mode === 'AMBOS' || mode === 'APENAS_TERMO';
  const showRecibo = mode === 'AMBOS' || mode === 'APENAS_RECIBO';
  const cleanCompany = cleanCompanyText(term.companyName) || 'Setor de Gestão de Frota / RH';
  const cleanCnpj = cleanCompanyText(term.companyCnpj);

  const modeTitle =
    mode === 'APENAS_TERMO'
      ? 'Termo de Ciência e Desconto em Folha'
      : mode === 'APENAS_RECIBO'
      ? 'Recibo de Multa (Via do Motorista)'
      : 'Termo de Ciência + Recibo do Motorista (2 Vias A4)';

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${modeTitle} - ${term.protocolNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 20px 26px;
      font-size: 12px;
      line-height: 1.45;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .tag {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      color: #1d4ed8;
      letter-spacing: 0.06em;
    }
    h1 {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      margin: 2px 0;
    }
    .protocol-box {
      border: 1px solid #94a3b8;
      background: #f8fafc;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-weight: bold;
      font-size: 11px;
    }
    .box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #ffffff;
    }
    .box-header {
      background: #f1f5f9;
      padding: 6px 10px;
      border-bottom: 1px solid #cbd5e1;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 8px;
    }
    .label {
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      color: #64748b;
      display: block;
    }
    .val {
      font-size: 12px;
      font-weight: bold;
      color: #0f172a;
    }
    .legal {
      font-size: 11px;
      text-align: justify;
      border: 1px solid #e2e8f0;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 18px;
    }
    .legal p + p { margin-top: 6px; }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-top: 28px;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      padding-top: 6px;
    }
    .cut-line {
      margin: 18px 0;
      border-top: 2px dashed #94a3b8;
      text-align: center;
      position: relative;
    }
    .cut-line span {
      background: #fff;
      padding: 0 10px;
      font-size: 9px;
      text-transform: uppercase;
      color: #64748b;
      position: relative;
      top: -8px;
      font-weight: bold;
    }
    .recibo-box {
      border: 1.5px solid #334155;
      border-radius: 8px;
      padding: 12px 14px;
      background: #f8fafc;
    }
  </style>
</head>
<body>
  ${
    showTermo
      ? `
  <div>
    <div class="header">
      <div>
        <div class="tag">Controle Interno de Infrações de Trânsito • RH & Frota</div>
        <h1>Termo de Ciência de Multa e Autorização de Desconto em Folha</h1>
        <div style="font-size:11px;color:#475569;">
          ${cleanCompany}${cleanCnpj ? ` — CNPJ: ${cleanCnpj}` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div class="protocol-box">Protocolo: ${term.protocolNumber}</div>
        <div style="font-size:9px;color:#64748b;margin-top:3px;">1ª Via: Arquivo RH / Frota</div>
      </div>
    </div>

    <div class="box grid-3" style="background:#f8fafc;">
      <div style="grid-column: span 2;">
        <span class="label">Motorista / Condutor Responsável:</span>
        <span class="val">${term.driverName}</span>
      </div>
      <div>
        <span class="label">CPF / CNH:</span>
        <span class="val">${term.driverCpf} • ${term.driverCnh}</span>
      </div>
    </div>

    <div class="box" style="padding:0;overflow:hidden;">
      <div class="box-header">
        <span>Dados do Auto de Infração de Trânsito (AIT)</span>
        <span style="color:#b91c1c;">AIT Nº ${term.aitNumber}</span>
      </div>
      <div style="padding:10px 12px;" class="grid-3">
        <div>
          <span class="label">Placa / Veículo:</span>
          <span class="val">${term.plate} (${term.vehicleModel})</span>
        </div>
        <div>
          <span class="label">Data da Infração:</span>
          <span class="val">${formatDate(term.infractionDate)}</span>
        </div>
        <div>
          <span class="label">Órgão / Pontuação:</span>
          <span class="val">${term.issuingAuthority} • ${
            term.isDoubledFine
              ? '<span style="color:#047857;">0 pts (Multa Dobrada 2x — Sem Pontos CNH)</span>'
              : `${term.points} pts`
          }</span>
        </div>
        <div style="grid-column: span 3;">
          <span class="label">Local da Infração:</span>
          <span class="val">${term.infractionLocation} (${term.cityState})</span>
        </div>
        <div style="grid-column: span 3;">
          <span class="label">Enquadramento CTB (Cód. ${term.infractionCode}):</span>
          <span>${term.infractionDescription}</span>
        </div>
      </div>
    </div>

    <div class="box grid-3" style="background:#f8fafc;">
      <div>
        <span class="label">Valor Original da Multa (1x):</span>
        <span class="val">${formatCurrency(term.originalFineAmount)}</span>
        ${
          term.isDoubledFine
            ? `<span style="display:block;font-size:9px;color:#b45309;font-weight:bold;">Dobrada (2x s/ Pontos CNH): ${formatCurrency(term.originalFineAmount * 2)}</span>`
            : ''
        }
      </div>
      <div>
        <span class="label">Valor Autorizado p/ Desconto:</span>
        <span class="val" style="color:#b91c1c;font-size:14px;">${formatCurrency(term.finalDeductedAmount)}</span>
        ${term.isDoubledFine ? '<span style="display:block;font-size:9px;color:#b45309;font-weight:bold;">Multa Dobrada (2x) • 0 Pontos CNH</span>' : ''}
        ${term.useSneDiscount ? '<span style="display:block;font-size:9px;color:#047857;">Com 20% Desconto SNE</span>' : ''}
      </div>
      <div>
        <span class="label">Parcelamento em Folha:</span>
        <span class="val" style="color:#1e40af;">${term.installments}x de ${formatCurrency(term.installmentValue)}</span>
        <span style="display:block;font-size:9px;color:#475569;">Início: Folha ${term.payrollMonth}</span>
      </div>
    </div>

    <div class="legal">
      <p><strong>DECLARAÇÃO DE CIÊNCIA E AUTORIZAÇÃO (ART. 462, § 1º DA CLT):</strong> Pelo presente instrumento, eu, <strong>${term.driverName}</strong>, inscrito(a) no CPF sob o nº <strong>${term.driverCpf}</strong> e portador(a) da CNH nº <strong>${term.driverCnh}</strong>, declaro ter plena ciência da autuação de trânsito acima descrita (AIT <strong>${term.aitNumber}</strong>), ocorrida enquanto o veículo de placa <strong>${term.plate}</strong> encontrava-se sob minha condução e responsabilidade profissional.</p>
      ${
        term.isDoubledFine
          ? `<p>Reconheço a responsabilidade pela infração e, por <strong>OPÇÃO DE PAGAMENTO DA MULTA DOBRADA (2x — Não Indicação de Condutor / NIC, Art. 257, § 8º do CTB)</strong> para que <strong>não haja lançamento de pontuação em minha CNH nem na CNH de terceiros (0 pontos na CNH)</strong>, <strong>AUTORIZO EXPRESSAMENTE</strong> o desconto em minha folha de pagamento do montante total dobrado de <strong>${formatCurrency(term.finalDeductedAmount)}</strong>, dividido em <strong>${term.installments} parcela(s) mensal(is) de ${formatCurrency(term.installmentValue)}</strong>, iniciando na competência <strong>${term.payrollMonth}</strong>.</p>`
          : `<p>Reconheço a responsabilidade pela infração e <strong>AUTORIZO EXPRESSAMENTE</strong> o desconto em minha folha de pagamento do montante total de <strong>${formatCurrency(term.finalDeductedAmount)}</strong>, dividido em <strong>${term.installments} parcela(s) mensal(is) de ${formatCurrency(term.installmentValue)}</strong>, iniciando na competência <strong>${term.payrollMonth}</strong>, bem como a indicação de real condutor perante o órgão autuador (${term.issuingAuthority}).</p>`
      }
    </div>

    <div class="sig-grid">
      <div class="sig-line">
        <div style="font-weight:bold;">${term.driverName}</div>
        <div style="font-size:10px;color:#475569;">Assinatura do Motorista (Ciência e Autorização de Desconto)</div>
      </div>
      <div class="sig-line">
        <div style="font-weight:bold;">${cleanCompany}</div>
        <div style="font-size:10px;color:#475569;">Gestão de Frota / Recursos Humanos (Carimbo e Visto)</div>
      </div>
    </div>
  </div>
  `
      : ''
  }

  ${
    showTermo && showRecibo
      ? `<div class="cut-line"><span>✂ Destacar Recibo do Motorista</span></div>`
      : ''
  }

  ${
    showRecibo
      ? `
  <div class="recibo-box">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #cbd5e1;padding-bottom:8px;margin-bottom:10px;">
      <div>
        <div style="font-weight:900;text-transform:uppercase;font-size:12px;">
          Recibo de Ciência de Multa e Desconto em Folha — Comprovante do Motorista
        </div>
        <div style="font-size:10px;color:#475569;">
          ${cleanCompany} • Protocolo: ${term.protocolNumber}
        </div>
      </div>
      <div style="font-family:monospace;font-weight:bold;font-size:11px;">
        Data: ${formatDate(term.createdAt)}
      </div>
    </div>

    <div class="grid-4" style="margin-bottom:10px;">
      <div>
        <span class="label">Motorista:</span>
        <span class="val">${term.driverName}</span>
      </div>
      <div>
        <span class="label">Auto (AIT) / Placa:</span>
        <span class="val">${term.aitNumber} (${term.plate})</span>
      </div>
      <div>
        <span class="label">Valor Total Desconto:</span>
        <span class="val" style="color:#b91c1c;">${formatCurrency(term.finalDeductedAmount)}</span>
      </div>
      <div>
        <span class="label">Parcelamento Folha:</span>
        <span class="val" style="color:#1e40af;">${term.installments}x de ${formatCurrency(term.installmentValue)}</span>
      </div>
    </div>

    <div style="font-size:10px;color:#334155;margin-bottom:14px;">
      <strong>Infração:</strong> Cód. ${term.infractionCode} — ${term.infractionDescription} • Local: ${term.infractionLocation} (${term.cityState})
    </div>

    <div class="sig-grid" style="margin-top:20px;">
      <div class="sig-line">
        <div style="font-weight:bold;">${term.driverName}</div>
        <div style="font-size:10px;color:#475569;">Assinatura do Motorista</div>
      </div>
      <div class="sig-line">
        <div style="font-weight:bold;">Visto RH / Recebimento</div>
        <div style="font-size:10px;color:#475569;">${cleanCompany}</div>
      </div>
    </div>
  </div>
  `
      : ''
  }
</body>
</html>`;

  const onDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 15;

    if (showTermo) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(29, 78, 216);
      doc.text('CONTROLE INTERNO DE INFRACOES DE TRANSITO - RH & FROTA', 14, y);
      y += 5;

      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('TERMO DE CIENCIA DE MULTA E DESCONTO EM FOLHA', 14, y);
      doc.setFontSize(9);
      doc.text(`Protocolo: ${term.protocolNumber}`, 196, y, { align: 'right' });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`${cleanCompany}${cleanCnpj ? ` - CNPJ: ${cleanCnpj}` : ''}`, 14, y);
      y += 4;

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.line(14, y, 196, y);
      y += 6;

      // Driver Info
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, y, 182, 16, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('MOTORISTA / CONDUTOR RESPONSAVEL:', 18, y + 5);
      doc.text('CPF / CNH:', 130, y + 5);

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(term.driverName.substring(0, 50), 18, y + 12);
      doc.setFontSize(9);
      doc.text(`${term.driverCpf} | ${term.driverCnh}`, 130, y + 12);
      y += 21;

      // AIT Details
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('DADOS DO AUTO DE INFRACAO DE TRANSITO (AIT)', 18, y + 5);
      doc.setTextColor(185, 28, 28);
      doc.text(`AIT N. ${term.aitNumber}`, 192, y + 5, { align: 'right' });
      y += 7;

      doc.setDrawColor(203, 213, 225);
      doc.rect(14, y, 182, 28);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('PLACA / VEICULO:', 18, y + 5);
      doc.text('DATA DA INFRACAO:', 85, y + 5);
      doc.text('ORGAO / PONTOS:', 145, y + 5);

      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${term.plate} (${term.vehicleModel.substring(0, 22)})`, 18, y + 10);
      doc.text(formatDate(term.infractionDate), 85, y + 10);
      doc.text(
        term.isDoubledFine ? `${term.issuingAuthority} - 0 pts (Dobrada 2x)` : `${term.issuingAuthority} - ${term.points} pts`,
        145,
        y + 10
      );

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('LOCAL DA INFRACAO:', 18, y + 16);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${term.infractionLocation} (${term.cityState})`.substring(0, 85), 18, y + 20);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`ENQUADRAMENTO CTB (${term.infractionCode}):`, 18, y + 25);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(term.infractionDescription.substring(0, 75), 68, y + 25);
      y += 33;

      // Financial box
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 16, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('VALOR ORIGINAL:', 18, y + 5);
      doc.text('TOTAL AUTORIZADO P/ DESCONTO:', 75, y + 5);
      doc.text('PARCELAMENTO NA FOLHA:', 140, y + 5);

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(term.originalFineAmount), 18, y + 12);
      doc.setTextColor(185, 28, 28);
      doc.text(formatCurrency(term.finalDeductedAmount), 75, y + 12);
      doc.setTextColor(30, 64, 175);
      doc.text(`${term.installments}x de ${formatCurrency(term.installmentValue)} (${term.payrollMonth})`, 140, y + 12);
      y += 21;

      // Legal paragraph
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const declText = term.isDoubledFine
        ? `DECLARACAO DE CIENCIA E AUTORIZACAO (ART. 462, PARAGRAFO 1 DA CLT): Pelo presente instrumento, eu, ${term.driverName}, inscrito no CPF sob o n. ${term.driverCpf} e portador da CNH n. ${term.driverCnh}, declaro ter plena ciencia da autuacao de transito acima descrita (AIT ${term.aitNumber}), ocorrida enquanto o veiculo de placa ${term.plate} encontrava-se sob minha conducao. Por OPCAO DE PAGAMENTO DA MULTA DOBRADA (2x - Nao Indicacao de Condutor / NIC) para que os pontos NAO sejam lancados em minha CNH nem de terceiros (0 pontos na CNH), AUTORIZO EXPRESSAMENTE o desconto em minha folha de pagamento do montante dobrado de ${formatCurrency(term.finalDeductedAmount)}, dividido em ${term.installments} parcela(s) de ${formatCurrency(term.installmentValue)}, iniciando na competencia ${term.payrollMonth}.`
        : `DECLARACAO DE CIENCIA E AUTORIZACAO (ART. 462, PARAGRAFO 1 DA CLT): Pelo presente instrumento, eu, ${term.driverName}, inscrito no CPF sob o n. ${term.driverCpf} e portador da CNH n. ${term.driverCnh}, declaro ter plena ciencia da autuacao de transito acima descrita (AIT ${term.aitNumber}), ocorrida enquanto o veiculo de placa ${term.plate} encontrava-se sob minha conducao. Reconheco a responsabilidade pela infracao e AUTORIZO EXPRESSAMENTE o desconto em minha folha de pagamento do montante total de ${formatCurrency(term.finalDeductedAmount)}, dividido em ${term.installments} parcela(s) de ${formatCurrency(term.installmentValue)}, iniciando na competencia ${term.payrollMonth}.`;
      const splitDecl = doc.splitTextToSize(declText, 176);
      doc.rect(14, y, 182, splitDecl.length * 4.2 + 6);
      doc.text(splitDecl, 17, y + 5);
      y += splitDecl.length * 4.2 + 18;

      // Signatures
      doc.setDrawColor(15, 23, 42);
      doc.line(20, y, 95, y);
      doc.line(115, y, 190, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(term.driverName.substring(0, 40), 57.5, y + 4, { align: 'center' });
      doc.text(cleanCompany.substring(0, 40), 152.5, y + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Assinatura do Motorista (Ciencia e Autorizacao)', 57.5, y + 8, { align: 'center' });
      doc.text('Gestao de Frota / Recursos Humanos', 152.5, y + 8, { align: 'center' });
      y += 16;
    }

    if (showTermo && showRecibo) {
      doc.setDrawColor(148, 163, 184);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(14, y, 196, y);
      doc.setLineDashPattern([], 0);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('DESTACAR RECIBO DO MOTORISTA (2a VIA)', 105, y - 1.5, { align: 'center' });
      y += 7;
    }

    if (showRecibo) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(51, 65, 85);
      doc.rect(14, y, 182, 52, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('RECIBO DE CIENCIA DE MULTA E DESCONTO EM FOLHA - VIA DO MOTORISTA', 18, y + 6);
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${cleanCompany} | Protocolo: ${term.protocolNumber} | Data: ${formatDate(term.createdAt)}`, 18, y + 11);

      doc.setDrawColor(203, 213, 225);
      doc.line(18, y + 14, 192, y + 14);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('MOTORISTA:', 18, y + 20);
      doc.text('AIT / PLACA:', 80, y + 20);
      doc.text('TOTAL DESCONTO:', 125, y + 20);
      doc.text('PARCELAMENTO:', 162, y + 20);

      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(term.driverName.substring(0, 32), 18, y + 25);
      doc.text(`${term.aitNumber} (${term.plate})`, 80, y + 25);
      doc.setTextColor(185, 28, 28);
      doc.text(formatCurrency(term.finalDeductedAmount), 125, y + 25);
      doc.setTextColor(30, 64, 175);
      doc.text(`${term.installments}x ${formatCurrency(term.installmentValue)}`, 162, y + 25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Infracao: Cod. ${term.infractionCode} - ${term.infractionDescription.substring(0, 65)} | Local: ${term.infractionLocation.substring(0, 35)}`,
        18,
        y + 32
      );

      doc.setDrawColor(15, 23, 42);
      doc.line(22, y + 43, 92, y + 43);
      doc.line(118, y + 43, 188, y + 43);
      doc.setFontSize(7.5);
      doc.text('Assinatura do Motorista', 57, y + 47, { align: 'center' });
      doc.text('Visto RH / Recebimento da 1a Via', 153, y + 47, { align: 'center' });
    }

    doc.save(`Termo_Recibo_${term.aitNumber}_${term.protocolNumber}.pdf`);
  };

  return {
    title: modeTitle,
    subtitle: `Protocolo ${term.protocolNumber} • AIT ${term.aitNumber} • Placa ${term.plate}`,
    fileName: `Termo_Recibo_${term.aitNumber}_${term.protocolNumber}`,
    htmlContent,
    onDownloadPdf,
  };
}

/**
 * Builds HTML and PDF generator for a single TrafficFine (Imprimir AIT).
 */
export function buildFineDetailPrintPayload(fine: TrafficFine): PrintableDocumentPayload {
  const isDoubled = !!fine.isDoubledFine || (fine.multiplierFactor && fine.multiplierFactor > 1);
  const factor = fine.multiplierFactor || (isDoubled ? 2 : 1);
  const ownerClean = cleanCompanyText(fine.ownerCnpjRazaoSocial) || 'Proprietário / Frota Registrada';

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Auto de Infração ${fine.aitNumber} - Placa ${fine.plate}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; padding: 24px; font-size: 12px; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; display: block; }
    .val { font-size: 13px; font-weight: bold; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:10px;font-weight:bold;color:#1d4ed8;text-transform:uppercase;">Controle Interno de Infrações de Trânsito</div>
      <h1>Ficha de Auto de Infração de Trânsito — AIT Nº ${fine.aitNumber}</h1>
      <div style="font-size:11px;color:#475569;">Órgão Autuador: <strong>${fine.issuingAuthority}</strong> • Status: <strong>${fine.status}</strong></div>
    </div>
    <div style="text-align:right;font-family:monospace;font-weight:bold;font-size:14px;border:1px solid #94a3b8;padding:6px 12px;border-radius:6px;background:#f8fafc;">
      PLACA: ${fine.plate}
    </div>
  </div>

  <div class="box">
    <span class="label">Enquadramento CTB (Código ${fine.infractionCode} • ${fine.severity} • ${fine.points} pontos)</span>
    <div class="val" style="font-size:14px;margin-top:4px;">${fine.infractionDescription}</div>
  </div>

  <div class="box grid-2">
    <div>
      <span class="label">Data e Hora da Infração</span>
      <span class="val">${formatDateTime(fine.infractionDate)}</span>
    </div>
    <div>
      <span class="label">Data de Vencimento</span>
      <span class="val" style="color:#b91c1c;">${formatDate(fine.dueDate)}</span>
    </div>
    <div style="grid-column: span 2;">
      <span class="label">Local da Infração e Município</span>
      <span class="val">${fine.infractionLocation} — ${fine.city}/${fine.state}</span>
    </div>
    <div>
      <span class="label">Condutor Identificado</span>
      <span class="val">${fine.driverName || 'Condutor não identificado'}</span>
    </div>
    <div>
      <span class="label">Proprietário / Frota</span>
      <span class="val">${ownerClean}</span>
    </div>
  </div>

  <div class="box grid-3" style="background:#f8fafc;">
    <div>
      <span class="label">Tipo de Autuação</span>
      <span class="val">${isDoubled ? `Multa Dobrada NIC (${factor}x)` : 'Multa Normal (1x)'}</span>
    </div>
    <div>
      <span class="label">Valor Integral do Auto</span>
      <span class="val" style="color:#b91c1c;font-size:15px;">${formatCurrency(fine.fineAmount)}</span>
    </div>
    <div>
      <span class="label">Valor com Desconto SNE (20%)</span>
      <span class="val" style="color:#047857;font-size:15px;">${formatCurrency(fine.discountAmount || fine.fineAmount * 0.8)}</span>
    </div>
  </div>

  ${fine.notes ? `<div class="box"><span class="label">Observações</span><div>${fine.notes}</div></div>` : ''}
</body>
</html>`;

  const onDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(29, 78, 216);
    doc.text('CONTROLE INTERNO DE INFRACOES DE TRANSITO', 14, 16);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`FICHA DO AUTO DE INFRACAO: ${fine.aitNumber}`, 14, 23);

    doc.setFontSize(10);
    doc.text(`Placa: ${fine.plate} | Orgao: ${fine.issuingAuthority} | Status: ${fine.status}`, 14, 30);
    doc.line(14, 33, 196, 33);

    doc.setFontSize(9);
    doc.text(`Codigo CTB: ${fine.infractionCode} (${fine.severity} - ${fine.points} pontos)`, 14, 41);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(`Infracao: ${fine.infractionDescription}`, 180);
    doc.text(descLines, 14, 47);

    let y = 47 + descLines.length * 5 + 4;
    doc.setFont('helvetica', 'bold');
    doc.text(`Data/Hora da Infracao: ${formatDateTime(fine.infractionDate)}`, 14, y);
    doc.text(`Vencimento: ${formatDate(fine.dueDate)}`, 120, y);
    y += 7;
    doc.text(`Local: ${fine.infractionLocation} - ${fine.city}/${fine.state}`, 14, y);
    y += 7;
    doc.text(`Condutor: ${fine.driverName || 'Nao identificado'}`, 14, y);
    y += 7;
    doc.text(`Valor Integral: ${formatCurrency(fine.fineAmount)}`, 14, y);
    doc.text(`Com Desconto SNE (20%): ${formatCurrency(fine.discountAmount || fine.fineAmount * 0.8)}`, 95, y);

    doc.save(`AIT_${fine.aitNumber}_${fine.plate}.pdf`);
  };

  return {
    title: `Ficha de Auto de Infração — AIT ${fine.aitNumber}`,
    subtitle: `Placa ${fine.plate} • ${fine.issuingAuthority} • ${formatCurrency(fine.fineAmount)}`,
    fileName: `AIT_${fine.aitNumber}_${fine.plate}`,
    htmlContent,
    onDownloadPdf,
  };
}

/**
 * Builds HTML and PDF generator for a Custom Fines Report (Gerar Relatório de Multas).
 */
export function buildFinesReportPrintPayload(
  finesList: TrafficFine[],
  reportTitle: string = 'Relatório Consolidado de Multas de Trânsito',
  filterSummary: string = 'Todas as multas filtradas'
): PrintableDocumentPayload {
  const totalAmount = finesList.reduce((acc, f) => acc + f.fineAmount, 0);
  const totalSneAmount = finesList.reduce((acc, f) => acc + (f.discountAmount || f.fineAmount * 0.8), 0);
  const totalPoints = finesList.reduce((acc, f) => acc + f.points, 0);
  const paidCount = finesList.filter((f) => f.status === 'PAGA').length;
  const overdueCount = finesList.filter((f) => f.status === 'VENCIDA').length;
  const pendingCount = finesList.filter((f) => f.status === 'PENDENTE').length;

  const rowsHtml = finesList
    .map(
      (f, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-family:monospace;font-weight:bold;">${f.aitNumber}</td>
        <td style="font-family:monospace;font-weight:bold;">${f.plate}</td>
        <td>${formatDate(f.infractionDate)}</td>
        <td>${f.issuingAuthority}</td>
        <td>${f.infractionCode} - ${f.infractionDescription.substring(0, 48)}</td>
        <td>${f.infractionLocation.substring(0, 35)} (${f.city}/${f.state})</td>
        <td>${f.driverName || 'Não ident.'}</td>
        <td>${formatDate(f.dueDate)}</td>
        <td><strong>${f.status}</strong></td>
        <td style="text-align:right;font-family:monospace;font-weight:bold;">${formatCurrency(f.fineAmount)}</td>
      </tr>`
    )
    .join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${reportTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; padding: 18px 22px; font-size: 11px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; }
    .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
    .metric-card { border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 10px; border-radius: 6px; }
    .metric-label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; display: block; }
    .metric-val { font-size: 13px; font-weight: 900; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 9px; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:9px;font-weight:bold;color:#1d4ed8;text-transform:uppercase;">Controle Interno de Infrações de Trânsito</div>
      <h1>${reportTitle}</h1>
      <div style="font-size:10px;color:#475569;">Filtros aplicados: ${filterSummary}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#475569;">
      Emitido em: <strong>${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
    </div>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <span class="metric-label">Total de Multas</span>
      <span class="metric-val">${finesList.length} autuações</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">Valor Total Bruto</span>
      <span class="metric-val" style="color:#b91c1c;">${formatCurrency(totalAmount)}</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">Com Desconto SNE (20%)</span>
      <span class="metric-val" style="color:#047857;">${formatCurrency(totalSneAmount)}</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">Status (Venc. / Pend. / Pagas)</span>
      <span class="metric-val">${overdueCount} / ${pendingCount} / ${paidCount}</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">Total de Pontos</span>
      <span class="metric-val">${totalPoints} pts</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nº AIT</th>
        <th>Placa</th>
        <th>Data</th>
        <th>Órgão</th>
        <th>Infração CTB</th>
        <th>Local / Cidade</th>
        <th>Motorista</th>
        <th>Vencimento</th>
        <th>Status</th>
        <th style="text-align:right;">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="11" style="text-align:center;padding:16px;">Nenhuma multa encontrada para os filtros selecionados.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

  const onDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(29, 78, 216);
    doc.text('CONTROLE INTERNO DE INFRACOES DE TRANSITO', 14, 14);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(reportTitle.toUpperCase(), 14, 21);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Filtros: ${filterSummary} | Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 26);

    // Summary Bar
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, 29, 269, 12, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total de Multas: ${finesList.length}`, 18, 36.5);
    doc.text(`Valor Total: ${formatCurrency(totalAmount)}`, 70, 36.5);
    doc.text(`Total c/ SNE (20%): ${formatCurrency(totalSneAmount)}`, 135, 36.5);
    doc.text(`Vencidas: ${overdueCount} | Pendentes: ${pendingCount} | Pagas: ${paidCount}`, 205, 36.5);

    let y = 47;
    // Table Header
    doc.setFillColor(226, 232, 240);
    doc.rect(14, y - 4, 269, 7, 'F');
    doc.setFontSize(8);
    doc.text('AIT', 16, y);
    doc.text('PLACA', 44, y);
    doc.text('DATA', 66, y);
    doc.text('ORGAO', 88, y);
    doc.text('COD / INFRACAO', 108, y);
    doc.text('MOTORISTA', 182, y);
    doc.text('VENCIMENTO', 225, y);
    doc.text('STATUS', 248, y);
    doc.text('VALOR', 281, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    finesList.forEach((f) => {
      if (y > 192) {
        doc.addPage();
        y = 18;
      }
      doc.text(f.aitNumber.substring(0, 14), 16, y);
      doc.text(f.plate, 44, y);
      doc.text(formatDate(f.infractionDate), 66, y);
      doc.text(f.issuingAuthority.substring(0, 10), 88, y);
      doc.text(`${f.infractionCode} - ${f.infractionDescription}`.substring(0, 42), 108, y);
      doc.text((f.driverName || 'Nao ident.').substring(0, 22), 182, y);
      doc.text(formatDate(f.dueDate), 225, y);
      doc.text(f.status, 248, y);
      doc.text(formatCurrency(f.fineAmount), 281, y, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 2, 283, y + 2);
      y += 6;
    });

    doc.save(`Relatorio_Multas_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return {
    title: reportTitle,
    subtitle: `${finesList.length} multa(s) • Total ${formatCurrency(totalAmount)}`,
    fileName: `Relatorio_Multas_${new Date().toISOString().slice(0, 10)}`,
    htmlContent,
    onDownloadPdf,
  };
}

/**
 * Exports a list of TrafficFine records to CSV (UTF-8 with BOM for Excel).
 */
export function exportFinesToCsv(finesList: TrafficFine[], fileNamePrefix = 'Relatorio_Multas') {
  const headers = [
    'Nº AIT',
    'Placa',
    'Data da Infração',
    'Órgão Autuador',
    'Código CTB',
    'Descrição da Infração',
    'Gravidade',
    'Pontos',
    'Local da Infração',
    'Cidade/UF',
    'Motorista',
    'Vencimento',
    'Status',
    'Multa Dobrada (NIC)',
    'Valor Original (R$)',
    'Valor com Desconto SNE (R$)',
  ];

  const escapeCsv = (val: string | number | undefined) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = finesList.map((f) => [
    escapeCsv(f.aitNumber),
    escapeCsv(f.plate),
    escapeCsv(formatDate(f.infractionDate)),
    escapeCsv(f.issuingAuthority),
    escapeCsv(f.infractionCode),
    escapeCsv(f.infractionDescription),
    escapeCsv(f.severity),
    escapeCsv(f.points),
    escapeCsv(f.infractionLocation),
    escapeCsv(`${f.city}/${f.state}`),
    escapeCsv(f.driverName || 'Não identificado'),
    escapeCsv(formatDate(f.dueDate)),
    escapeCsv(f.status),
    escapeCsv(f.isDoubledFine ? 'SIM (2x)' : 'NÃO (1x)'),
    escapeCsv(f.fineAmount.toFixed(2).replace('.', ',')),
    escapeCsv((f.discountAmount || f.fineAmount * 0.8).toFixed(2).replace('.', ',')),
  ]);

  const csvString = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Generates an official A4 PDF data URL (data:application/pdf;base64,...) for an imported TrafficFine
 * when a synthesized/sample PDF is used or when exporting the imported notification.
 */
export function generateImportedFinePdfDataUrl(fine: Partial<TrafficFine>): string {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ait = fine.aitNumber || 'AIT-000000';
  const plate = fine.plate || 'BRA2E19';
  const authority = fine.issuingAuthority || 'DER / DETRAN';
  const code = fine.infractionCode || '7455-0';
  const desc = fine.infractionDescription || 'Infracao de transito conforme Codigo de Transito Brasileiro (CTB)';
  const loc = fine.infractionLocation || 'Via Publica / Rodovia';
  const cityUf = `${fine.city || 'Sao Paulo'}/${fine.state || 'SP'}`;
  const infDate = fine.infractionDate ? formatDateTime(fine.infractionDate) : formatDate(new Date().toISOString());
  const dueDate = fine.dueDate ? formatDate(fine.dueDate) : formatDate(new Date().toISOString());
  const amount = Number(fine.fineAmount) || 130.16;
  const discount = Number(fine.discountAmount) || Number((amount * 0.8).toFixed(2));
  const isDoubled = Boolean(fine.isDoubledFine || (fine.multiplierFactor && fine.multiplierFactor > 1));
  const owner = cleanCompanyText(fine.ownerCnpjRazaoSocial) || 'Proprietario / Frota Registrada';

  // Top Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(12, 12, 186, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(248, 250, 252);
  doc.text('REPUBLICA FEDERATIVA DO BRASIL - SISTEMA NACIONAL DE TRANSITO (SNT)', 16, 19);
  doc.setFontSize(13);
  doc.text(`NOTIFICACAO DE AUTUACAO DE INFRACAO - ${authority}`, 16, 26);
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Arquivo PDF Importado: ${fine.pdfFileName || `Notificacao_${ait}.pdf`}`, 16, 31.5);

  // AIT & Plate Highlight Box
  let y = 38;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.rect(12, y, 186, 18, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('IDENTIFICACAO DO AUTO DE INFRACAO (AIT)', 16, y + 5.5);
  doc.text('PLACA DO VEICULO', 95, y + 5.5);
  doc.text('STATUS / GRAVIDADE', 145, y + 5.5);

  doc.setFontSize(13);
  doc.setTextColor(185, 28, 28);
  doc.text(ait, 16, y + 13.5);

  doc.setFontSize(13);
  doc.setTextColor(29, 78, 216);
  doc.text(plate, 95, y + 13.5);

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${fine.status || 'PENDENTE'} | ${fine.severity || 'MEDIA'} (${isDoubled ? '0' : fine.points ?? 4} pts)`, 145, y + 13);

  // Vehicle & Owner section
  y += 23;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(12, y, 186, 22);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PROPRIETARIO / ARRENDATARIO:', 16, y + 6);
  doc.text('CONDUTOR IDENTIFICADO:', 120, y + 6);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(owner.substring(0, 52), 16, y + 12);
  doc.text((fine.driverName || 'Nao identificado (Multa PJ)').substring(0, 38), 120, y + 12);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Orgao Emissor: ${authority} | Municipio de Emplacamento/Infracao: ${cityUf}`, 16, y + 19);

  // Infraction Detail Section
  y += 27;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(252, 165, 165);
  doc.rect(12, y, 186, 36, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text(`CODIGO DA INFRACAO CTB: ${code}`, 16, y + 6);
  doc.text(`DATA E HORA: ${infDate}`, 95, y + 6);
  doc.text(`VENCIMENTO: ${dueDate}`, 152, y + 6);

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const splitDesc = doc.splitTextToSize(`tipificacao: ${desc}`, 176);
  doc.text(splitDesc, 16, y + 13);

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`LOCAL DA INFRACAO: ${loc} - ${cityUf}`.substring(0, 95), 16, y + 29);

  // Financial / Payment Box
  y += 42;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184);
  doc.rect(12, y, 186, 26, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('VALOR INTEGRAL DA MULTA', 16, y + 7);
  doc.text('VALOR COM DESCONTO (20% SNE)', 82, y + 7);
  doc.text('MODALIDADE DE AUTUACAO', 145, y + 7);

  doc.setFontSize(13);
  doc.setTextColor(185, 28, 28);
  doc.text(formatCurrency(amount), 16, y + 16);

  doc.setFontSize(13);
  doc.setTextColor(4, 120, 87);
  doc.text(formatCurrency(discount), 82, y + 16);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(isDoubled ? 'MULTA DOBRADA (2x NIC PJ)' : 'AUTUACAO REGULAR (1x)', 145, y + 15.5);

  // Simulated Barcode Strip at bottom
  y += 34;
  doc.setDrawColor(15, 23, 42);
  doc.rect(12, y, 186, 24);
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('AUTENTICACAO DIGITAL SERPRO / RENAINF - DOCUMENTO IMPORTADO NO SISTEMA DE GESTAO DE FROTA', 16, y + 6);
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`85890.00001 30160.10928 49201.92849 1 000000${Math.round(amount * 100)}`, 16, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`AIT: ${ait}  |  PLACA: ${plate}  |  DATA: ${infDate}  |  VENCIMENTO: ${dueDate}`, 16, y + 20);

  return doc.output('datauristring');
}

export function downloadImportedFinePdf(fine: Partial<TrafficFine>) {
  const fileName =
    fine.pdfFileName && fine.pdfFileName.toLowerCase().endsWith('.pdf')
      ? fine.pdfFileName
      : `${(fine.pdfFileName || `Notificacao_AIT_${fine.aitNumber || 'Multa'}`).replace(/\.[^/.]+$/, '')}.pdf`;

  if (fine.pdfDataUrl) {
    const a = document.createElement('a');
    a.href = fine.pdfDataUrl;
    a.download = fine.pdfFileName || fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const generatedDataUrl = generateImportedFinePdfDataUrl(fine);
  const a = document.createElement('a');
  a.href = generatedDataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

