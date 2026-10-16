// @ts-ignore - Vite asset URL import for bundled PDF.js worker
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export interface PositionedPdfCell {
  text: string;
  x: number;
  y: number;
  endX: number;
}

/**
 * Builds structured text + spatial [LABEL -> VALUE BELOW] and [LABEL -> VALUE RIGHT]
 * pairs from positioned PDF items.
 * Supports Brazilian CNH, CRLV-e, and Traffic Fines (AIT/Notificações DETRAN, PRF, DER, CET, DNIT).
 */
export function buildStructuredTextFromPdfItems(rawItems: any[]): string {
  const items = (rawItems || [])
    .filter((item: any) => typeof item.str === 'string' && item.str.trim().length > 0)
    .map((item: any) => {
      const str = item.str.trim();
      const x = item.transform ? Number(item.transform[4]) || 0 : 0;
      const y = item.transform ? Number(item.transform[5]) || 0 : 0;
      const w = Number(item.width) || str.length * 4.8;
      return {
        str,
        x,
        y,
        endX: x + w,
      };
    });

  if (items.length === 0) return '';

  // 1. Natural stream sequence as individual lines
  const streamLines: string[] = [];
  let curStreamPhrase = '';
  let prevItem: { x: number; y: number; endX: number } | null = null;

  for (const it of items) {
    if (
      prevItem &&
      Math.abs(it.y - prevItem.y) <= 2.5 &&
      it.x >= prevItem.x - 2 &&
      it.x - prevItem.endX <= 10
    ) {
      const gap = it.x - prevItem.endX;
      curStreamPhrase += (gap > 1.2 ? ' ' : '') + it.str;
      prevItem.endX = Math.max(prevItem.endX, it.endX);
    } else {
      if (curStreamPhrase) streamLines.push(curStreamPhrase);
      curStreamPhrase = it.str;
      prevItem = { x: it.x, y: it.y, endX: it.endX };
    }
  }
  if (curStreamPhrase) streamLines.push(curStreamPhrase);

  // 2. Spatially sorted cells (top-to-bottom, left-to-right)
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) > 2.5) return b.y - a.y;
    return a.x - b.x;
  });

  const cells: PositionedPdfCell[] = [];
  for (const it of sorted) {
    const last = cells[cells.length - 1];
    if (
      last &&
      Math.abs(it.y - last.y) <= 2.5 &&
      it.x >= last.x - 2 &&
      it.x - last.endX <= 10
    ) {
      const gap = it.x - last.endX;
      last.text += (gap > 1.2 ? ' ' : '') + it.str;
      last.endX = Math.max(last.endX, it.endX);
    } else {
      cells.push({
        text: it.str,
        x: it.x,
        y: it.y,
        endX: it.endX,
      });
    }
  }

  // 3. Comprehensive label patterns covering CRLV, CNH, and Traffic Fines
  const spatialPairs: string[] = [];
  const labelRegex =
    /^(?:NOME|NOME\s*DO\s*PROPRIET[ÁA]RIO(?:\s*\/?\s*RAZ[ÃA]O\s*SOCIAL)?|PROPRIET[ÁA]RIO(?:\s*\/?\s*(?:RAZ[ÃA]O\s*SOCIAL|CONDUTOR|ARRENDAT[ÁA]RIO))?|NOME\s*\/?\s*RAZ[ÃA]O\s*SOCIAL|RAZ[ÃA]O\s*SOCIAL|NOME\s*E\s*SOBRENOME|2\s*e\s*1\s*NOME|1\.?\s*NOME|1\.?\s*SOBRENOME(?:\s*[\/,]\s*|\s*E\s*)?NOME|1\.?\s*SOBRENOME|2\.?\s*NOME|SOBRENOME\s*[\/,]\s*NOME|NOME\s*CIVIL|NOME\s*SOCIAL|NOME\s*DO\s*CONDUTOR|NOME\s*COMPLETO|CONDUTOR|LOCAL|MUNIC[ÍI]PIO(?:\s*\/?\s*UF)?|CIDADE(?:\s*\/?\s*UF)?|(?:[23]\.?\s*)?CPF(?:\s*\/?\s*(?:CNPJ|RG|DOC(?:\.?\s*IDENTIDADE)?))?|CPF|CNPJ|DOC(?:\.?\s*DE)?\s*IDENTIDADE\s*\/?\s*CPF|PLACA(?:\s*\/?\s*UF)?|PLACA\s*DO\s*VE[ÍI]CULO|C[ÓO]DIGO\s*RENAVAM|RENAVAM|CHASSI|MARCA\s*\/?\s*MODELO(?:\s*\/?\s*VERS[ÃA]O)?|ESP[ÉE]CIE\s*\/?\s*TIPO|ANO\s*FABRICA[ÇC][ÃA]O|ANO\s*MODELO|COR\s*PREDOMINANTE|COMBUST[ÍI]VEL|(?:4d\.?\s*)?N[º°]?\s*(?:DE\s*)?REGISTRO|4d|5\.\s*N[º°]?\s*CNH|N[º°]?\s*CNH|(?:9\.?\s*)?CAT\.?\s*HAB\.?|CAT\.?\s*HAB\.?|CATEGORIA|(?:4b\.?\s*)?VALIDADE(?:\s*\/?\s*EXPIRATION)?|4b\.?\s*DATA\s*DE\s*VALIDADE|4b|VALIDADE|(?:[23]\.?\s*)?DATA\s*(?:DE\s*)?NASC(?:IMENTO)?|DATA\s*NASC\.?|DATA\s*(?:DE\s*)?NASCIMENTO|FILIA[ÇC][ÃA]O|AUTO\s*DE\s*INFRA[ÇC][ÃA]O(?:\s*DE\s*TR[ÂA]NSITO)?(?:\s*\(?AIT\)?)?(?:\s*N[º°o.]?)?|N[º°o.]?\s*(?:DO\s*)?(?:AUTO|AIT)(?:\s*DE\s*INFRA[ÇC][ÃA]O)?|NÚMERO\s*DO\s*AUTO(?:\s*DE\s*INFRA[ÇC][ÃA]O)?|IDENTIFICA[ÇC][ÃA]O\s*DO\s*AUTO(?:\s*DE\s*INFRA[ÇC][ÃA]O)?|NOTIFICA[ÇC][ÃA]O\s*(?:DE\s*AUTUA[ÇC][ÃA]O|DA\s*PENALIDADE|N[º°o.]?)|N[º°o.]?\s*DA\s*NOTIFICA[ÇC][ÃA]O|AIT\s*N[º°o.]?|N[º°o.]?\s*DO\s*AIT|AIT|C[ÓO]DIGO\s*(?:DA\s*)?INFRA[ÇC][ÃA]O(?:\s*\/?\s*DESDOBRAMENTO)?|C[ÓO]D\.?\s*INFRA[ÇC][ÃA]O|ENQUADRAMENTO|C[ÓO]DIGO\s*CTB|DESCRI[ÇC][ÃA]O(?:\s*DA\s*INFRA[ÇC][ÃA]O)?|TIPIFICA[ÇC][ÃA]O(?:\s*RESUMIDA)?|INFRA[ÇC][ÃA]O|DATA\s*(?:E\s*HORA\s*)?(?:DA\s*INFRA[ÇC][ÃA]O|DO\s*COMETIMENTO)?|DATA\s*INFRA[ÇC][ÃA]O|DATA\s*\/?\s*HORA|DATA|HORA\s*(?:DA\s*INFRA[ÇC][ÃA]O|DO\s*COMETIMENTO)?|HORA\s*INFRA[ÇC][ÃA]O|HORA|LOCAL\s*(?:DA\s*INFRA[ÇC][ÃA]O|DO\s*COMETIMENTO)?|ENDERE[ÇC]O(?:\s*DA\s*INFRA[ÇC][ÃA]O)?|VALOR\s*(?:DA\s*MULTA|INTEGRAL|ORIGINAL|DO\s*AUTO|A\s*PAGAR|TOTAL)|VALOR\s*\(R\$\)|VALOR\s*COM\s*DESCONTO|VALOR\s*SNE|DATA\s*LIMITE(?:\s*PARA\s*DEFESA)?|VENCIMENTO|PAGAMENTO\s*AT[ÉE]|DATA\s*DE\s*VENCIMENTO|[ÓO]RG[ÃA]O\s*AUTUADOR|AUTORIDADE\s*DE\s*TR[ÂA]NSITO|AUTUADO(?:\s*\/?\s*PROPRIET[ÁA]RIO)?|DESTINAT[ÁA]RIO(?:\s*DA\s*NOTIFICA[ÇC][ÃA]O)?|INFRATOR|PONTUA[ÇC][ÃA]O|PONTOS|GRAVIDADE)$/i;

  const isNameLabel = (lbl: string) => /NOME|SOBRENOME|CONDUTOR/i.test(lbl);
  const isJunkCertificateText = (txt: string) =>
    /DOCUMENTO\s*ASSINADO|CERTIFICADO\s*DIGITAL|ASSINADO\s*DIGITALMENTE|ICP-BRASIL|SERPRO|AUTENTICIDADE|MEDIDA\s*PROVIS[ÓO]RIA|PORTARIA|RESOLU[ÇC][ÃA]O/i.test(
      txt
    );

  for (const labelCell of cells) {
    const rawLabel = labelCell.text.trim();
    const cleanLabel = rawLabel.replace(/[:\-#.]+$/, '').trim();
    if (!labelRegex.test(cleanLabel) && !labelRegex.test(rawLabel)) continue;

    // A. Candidate directly BELOW the label (same horizontal column in a table or form box)
    const candidatesBelow = cells.filter((c) => {
      if (c === labelCell) return false;
      const dy = labelCell.y - c.y;
      if (dy < 3 || dy > 45) return false;
      const dx = c.x - labelCell.x;
      return dx >= -20 && dx <= Math.max(labelCell.endX - labelCell.x + 35, 110);
    });

    candidatesBelow.sort((a, b) => {
      const dyA = labelCell.y - a.y;
      const dyB = labelCell.y - b.y;
      if (Math.abs(dyA - dyB) > 3) return dyA - dyB;
      return Math.abs(a.x - labelCell.x) - Math.abs(b.x - labelCell.x);
    });

    const bestBelow = candidatesBelow.find((c) => {
      const txt = c.text.trim();
      if (labelRegex.test(txt)) return false;
      if (isNameLabel(cleanLabel) && isJunkCertificateText(txt)) return false;
      return true;
    });
    if (bestBelow) {
      spatialPairs.push(
        `CAMPO_ABAIXO[${cleanLabel.toUpperCase()}]: ${bestBelow.text.trim()}`
      );
      spatialPairs.push(
        `CAMPO_BOX[${cleanLabel.toUpperCase()}]: ${bestBelow.text.trim()}`
      );
    }

    // B. Candidate directly to the RIGHT of the label (inline on the same row)
    const candidatesRight = cells.filter((c) => {
      if (c === labelCell) return false;
      if (Math.abs(c.y - labelCell.y) > 3.5) return false;
      const dx = c.x - labelCell.endX;
      return dx >= 0 && dx <= 180;
    });

    candidatesRight.sort((a, b) => a.x - b.x);
    const bestRight = candidatesRight.find((c) => {
      const txt = c.text.trim();
      if (labelRegex.test(txt)) return false;
      if (isNameLabel(cleanLabel) && isJunkCertificateText(txt)) return false;
      return true;
    });
    if (bestRight) {
      spatialPairs.push(
        `CAMPO_DIREITA[${cleanLabel.toUpperCase()}]: ${bestRight.text.trim()}`
      );
    }
  }

  return [
    streamLines.join('\n'),
    cells.map((c) => c.text).join('\n'),
    spatialPairs.join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Extracts real text AND renders page 1 to JPEG from a PDF file in the browser using pdfjs-dist.
 */
export async function extractPdfContentClient(fileOrBase64: File | string): Promise<{
  text: string;
  pageImageBase64?: string;
  pageCount: number;
}> {
  let uint8Array: Uint8Array = new Uint8Array(0);
  try {
    if (typeof fileOrBase64 === 'string') {
      const cleanBase64 = fileOrBase64.replace(/^data:[^;]+;base64,/, '');
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      uint8Array = bytes;
    } else {
      const arrayBuffer = await fileOrBase64.arrayBuffer();
      uint8Array = new Uint8Array(arrayBuffer);
    }

    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array.slice(0),
      useSystemFonts: true,
      disableFontFace: false,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages || 1;
    const allPageTexts: string[] = [];
    let pageImageBase64: string | undefined;

    for (let pageNum = 1; pageNum <= Math.min(numPages, 5); pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = buildStructuredTextFromPdfItems(textContent.items || []);
      if (pageText) {
        allPageTexts.push(pageText);
      }

      if (pageNum === 1 && typeof document !== 'undefined') {
        try {
          const viewport = page.getViewport({ scale: 1.75 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            pageImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {
          // Ignore canvas render errors
        }
      }
    }

    return {
      text: allPageTexts.join('\n\n').trim(),
      pageImageBase64,
      pageCount: numPages,
    };
  } catch (err) {
    console.warn('PDF.js client extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}
