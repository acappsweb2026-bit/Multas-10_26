import * as XLSX from 'xlsx';
import { OperacaoCAItem, Driver } from '../types';

export interface ImportResult {
  newItems: OperacaoCAItem[];
  duplicatesExisting: {
    scanned: OperacaoCAItem;
    existing: OperacaoCAItem;
  }[];
  duplicatesInternal: OperacaoCAItem[];
  totalRowsParsed: number;
}

function normalizeHeader(h: string): string {
  if (!h) return '';
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseCurrencyOrNumber(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : Number(val.toFixed(2));
  if (!val) return 0;
  const str = String(val)
    .replace(/R\$/gi, '')
    .trim();
  // Handle Brazilian formatting: 1.234,56 or 104,13
  let cleaned = str;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

function formatRawDate(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(val.getDate())}/${pad(val.getMonth() + 1)}/${val.getFullYear()}`;
  }
  // If Excel serial number date
  if (typeof val === 'number' && val > 20000 && val < 60000) {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(dateObj.d)}/${pad(dateObj.m)}/${dateObj.y}`;
      }
    } catch {
      // ignore
    }
  }
  return String(val).trim();
}

function formatAitValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    if (isNaN(val)) return '';
    // Prevent scientific notation for large numbers like 2167909384
    return Math.floor(val).toString();
  }
  const str = String(val).trim();
  return str.replace(/\.0+$/, '').toUpperCase();
}

function formatStringValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Precision detectors for Excel column headers
function isAitColumn(norm: string): boolean {
  if (norm.includes('ait')) return true;
  if (
    norm.includes('auto') &&
    !norm.includes('local') &&
    !norm.includes('data') &&
    !norm.includes('hora') &&
    !norm.includes('valor') &&
    !norm.includes('desc') &&
    !norm.includes('taxa') &&
    !norm.includes('status') &&
    !norm.includes('limite') &&
    !norm.includes('nome') &&
    !norm.includes('folha') &&
    !norm.includes('recurso')
  ) {
    return true;
  }
  return (
    norm === 'autoinfracao' ||
    norm === 'autodeinfracao' ||
    norm === 'numeroauto' ||
    norm === 'numerodoauto' ||
    norm === 'noauto' ||
    norm === 'numeroautodeinfracao' ||
    norm === 'numerodoautodeinfracao'
  );
}

function isDescColumn(norm: string): boolean {
  if (!norm) return false;
  // If header has 'desc' and isn't discount
  if (norm.includes('desc') && !norm.includes('desconto')) return true;
  // Direct matches for infraction description in Portuguese
  if (
    norm === 'infracao' ||
    norm === 'infracoes' ||
    norm === 'infracaocometida' ||
    norm === 'tipoinfracao' ||
    norm === 'tipodeinfracao' ||
    norm === 'motivoinfracao' ||
    norm === 'motivodainfracao' ||
    norm === 'detalheinfracao' ||
    norm === 'detalhedainfracao' ||
    norm === 'naturezainfracao' ||
    norm === 'naturezadainfracao' ||
    norm === 'enquadramento' ||
    norm === 'tipificacao' ||
    norm === 'motivo' ||
    norm === 'natureza' ||
    norm === 'artigo' ||
    norm === 'artigoinfracao' ||
    norm === 'infracaoartigo' ||
    norm === 'descinfracao' ||
    norm === 'codinfracao' ||
    norm === 'codigoinfracao' ||
    norm === 'codigodainfracao' ||
    norm === 'historico' ||
    norm === 'resumo' ||
    norm === 'descricaodainfracao' ||
    norm === 'descricaoinfracao'
  ) {
    return true;
  }
  // Any header that contains 'infracao' or 'infracoe' unless it is clearly an AIT number or date/location/value/fee/status/deadline/payroll/appeal
  if (norm.includes('infracao') || norm.includes('infracoe')) {
    // If it has 'numero' or 'no' or 'ait' or 'num', it's the AIT column
    if (
      (norm.includes('numero') || norm.includes('num') || norm.includes('no') || norm === 'autodeinfracao') &&
      (norm.includes('ait') || norm.includes('auto'))
    ) {
      return false;
    }
    if (
      !norm.includes('local') &&
      !norm.includes('data') &&
      !norm.includes('hora') &&
      !norm.includes('valor') &&
      !norm.includes('taxa') &&
      !norm.includes('status') &&
      !norm.includes('limite') &&
      !norm.includes('folha') &&
      !norm.includes('recurso') &&
      !norm.includes('ait')
    ) {
      return true;
    }
  }
  return false;
}

function isPlateColumn(norm: string): boolean {
  return norm.includes('placa') || norm === 'veiculo' || norm === 'prefixo' || norm === 'placadoveiculo';
}

function isDriverNameColumn(norm: string): boolean {
  return (
    (norm.includes('motorista') || norm.includes('condutor') || norm.includes('infrator')) &&
    !norm.includes('status') &&
    !norm.includes('competencia')
  );
}

function isLocationColumn(norm: string): boolean {
  return (
    norm.includes('local') ||
    norm.includes('rodovia') ||
    norm.includes('trecho') ||
    norm === 'km' ||
    norm.includes('endereco') ||
    norm.includes('municipio')
  );
}

function isOriginalValueColumn(norm: string): boolean {
  if (norm.includes('taxa') || norm.includes('total')) return false;
  return (
    norm.includes('valororig') ||
    norm.includes('valorcobr') ||
    norm === 'valor' ||
    norm === 'valordamulta' ||
    norm === 'valordainfracao' ||
    norm === 'valornotificacao'
  );
}

function isAdminFeeColumn(norm: string): boolean {
  return norm.includes('taxa') || norm.includes('taxaadm') || norm.includes('administrativa');
}

function isTotalValueColumn(norm: string): boolean {
  return norm.includes('valortotal') || norm === 'total' || norm === 'totalmulta';
}

function isNominatedNameColumn(norm: string): boolean {
  return norm.includes('nomeindicado') || norm.includes('indicado') || norm.includes('empresa');
}

function isNominationDeadlineColumn(norm: string): boolean {
  return (
    (norm.includes('indicacao') || norm.includes('apresentacao')) &&
    (norm.includes('data') || norm.includes('limite') || norm.includes('prazo'))
  );
}

function isDiscountDeadlineColumn(norm: string): boolean {
  return (
    (norm.includes('desconto') || norm.includes('boleto') || norm.includes('vencimento')) &&
    (norm.includes('data') || norm.includes('limite') || norm.includes('prazo') || norm.includes('pag'))
  );
}

function isEmailNoticeDateColumn(norm: string): boolean {
  return (
    (norm.includes('data') || norm.includes('envio') || norm.includes('notificacao') || norm.includes('emissao')) &&
    !norm.includes('indicacao') &&
    !norm.includes('desconto') &&
    !norm.includes('pagamento') &&
    !norm.includes('limite')
  );
}

function isNotificationStatusColumn(norm: string): boolean {
  return (
    norm.includes('statusnotificacao') ||
    (norm.includes('status') && !norm.includes('motorista') && !norm.includes('pagamento')) ||
    norm.includes('prazoexpirado')
  );
}

function isDriverStatusColumn(norm: string): boolean {
  return norm.includes('competencia') || (norm.includes('status') && norm.includes('motorista'));
}

function isPayrollColumn(norm: string): boolean {
  return norm.includes('folha') || norm.includes('flog') || norm.includes('descontoemfolha');
}

function isAppealColumn(norm: string): boolean {
  return norm.includes('recurso');
}

function isPaymentStatusColumn(norm: string): boolean {
  return (
    (norm.includes('pagamento') || norm.includes('paga') || norm.includes('statuspag')) &&
    !norm.includes('data') &&
    !norm.includes('limite') &&
    !norm.includes('quem') &&
    !norm.includes('nf')
  );
}

function isPaidAtColumn(norm: string): boolean {
  return norm.includes('datapag') || norm.includes('pagamentoem') || norm === 'datapagamento';
}

function isPaidByColumn(norm: string): boolean {
  return norm.includes('quempagou') || norm.includes('pagopor') || norm.includes('pagadopor');
}

function isInvoiceNumberColumn(norm: string): boolean {
  return norm.includes('notafiscal') || norm.includes('nf') || norm.includes('numeronf') || norm === 'nota';
}

export function parseExcelOperacaoCA(
  fileBuffer: ArrayBuffer,
  existingItems: OperacaoCAItem[],
  registeredDrivers: Driver[] = []
): ImportResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      newItems: [],
      duplicatesExisting: [],
      duplicatesInternal: [],
      totalRowsParsed: 0,
    };
  }

  // 1. Multi-Sheet Detection: Select the sheet with highest relevance of traffic fine headers
  let selectedSheetName = workbook.SheetNames[0];
  let bestSheetScore = -1;

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const grid = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', blankrows: false });
    if (grid.length === 0) continue;
    let sheetScore = 0;
    for (let r = 0; r < Math.min(grid.length, 12); r++) {
      const row = grid[r];
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        const norm = normalizeHeader(String(cell || ''));
        if (!norm) continue;
        if (isAitColumn(norm)) sheetScore += 10;
        if (isPlateColumn(norm)) sheetScore += 10;
        if (isDescColumn(norm)) sheetScore += 10;
        if (isOriginalValueColumn(norm)) sheetScore += 8;
        if (isDriverNameColumn(norm)) sheetScore += 6;
        if (isLocationColumn(norm)) sheetScore += 6;
      }
    }
    if (sheetScore > bestSheetScore) {
      bestSheetScore = sheetScore;
      selectedSheetName = sheetName;
    }
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  if (!worksheet) {
    return {
      newItems: [],
      duplicatesExisting: [],
      duplicatesInternal: [],
      totalRowsParsed: 0,
    };
  }

  // 2. Convert worksheet to raw 2D grid to locate the real table header row (skipping titles/banners)
  const rawGrid = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawGrid.length === 0) {
    return {
      newItems: [],
      duplicatesExisting: [],
      duplicatesInternal: [],
      totalRowsParsed: 0,
    };
  }

  let headerRowIndex = 0;
  let maxHeaderScore = -1;

  for (let r = 0; r < Math.min(rawGrid.length, 20); r++) {
    const row = rawGrid[r];
    if (!Array.isArray(row)) continue;
    let rowScore = 0;
    let nonBlankCells = 0;

    for (const cell of row) {
      const cellStr = String(cell || '').trim();
      if (!cellStr) continue;
      nonBlankCells++;
      const norm = normalizeHeader(cellStr);

      if (isAitColumn(norm)) rowScore += 12;
      if (isPlateColumn(norm)) rowScore += 12;
      if (isDescColumn(norm)) rowScore += 12;
      if (isOriginalValueColumn(norm)) rowScore += 10;
      if (isLocationColumn(norm)) rowScore += 6;
      if (isDriverNameColumn(norm)) rowScore += 6;
      if (isAdminFeeColumn(norm)) rowScore += 5;
      if (isTotalValueColumn(norm)) rowScore += 5;
      if (isNominationDeadlineColumn(norm)) rowScore += 4;
      if (isDiscountDeadlineColumn(norm)) rowScore += 4;
      if (isEmailNoticeDateColumn(norm)) rowScore += 4;
      if (isPayrollColumn(norm)) rowScore += 4;
    }

    // Require at least 2 non-blank cells for a valid tabular header row
    if (nonBlankCells >= 2 && rowScore > maxHeaderScore) {
      maxHeaderScore = rowScore;
      headerRowIndex = r;
    }
  }

  // Header column names array from the detected header row
  const rawHeaders = (rawGrid[headerRowIndex] || []).map((h) => String(h || '').trim());
  const normalizedHeaders = rawHeaders.map((h) => normalizeHeader(h));

  // 3. Object-level rows keyed directly by column header name
  const objectRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    range: headerRowIndex,
    defval: '',
    raw: false,
  });

  // Array-level data rows starting right after the detected header row
  const dataRows = rawGrid.slice(headerRowIndex + 1);

  // Pre-build duplicate check map for existing items
  const existingMap = new Map<string, OperacaoCAItem>();
  for (const item of existingItems) {
    const cleanAit = (item.ait || '').trim().toUpperCase();
    if (cleanAit) {
      existingMap.set(cleanAit, item);
    }
  }

  // Pre-build plate to driver map from registered drivers
  const plateToDriverMap = new Map<string, Driver>();
  for (const d of registeredDrivers) {
    if (d.assignedVehiclePlate) {
      plateToDriverMap.set(d.assignedVehiclePlate.trim().toUpperCase(), d);
    }
  }

  const seenInFileAits = new Set<string>();
  const newItems: OperacaoCAItem[] = [];
  const duplicatesExisting: { scanned: OperacaoCAItem; existing: OperacaoCAItem }[] = [];
  const duplicatesInternal: OperacaoCAItem[] = [];

  const totalRowCount = Math.max(objectRows.length, dataRows.length);

  for (let i = 0; i < totalRowCount; i++) {
    const rowObj = objectRows[i] || {};
    const rowArr = dataRows[i] || [];

    // Skip empty lines
    const isArrEmpty = !Array.isArray(rowArr) || rowArr.every((c) => c === '' || c === null || c === undefined);
    const isObjEmpty = Object.keys(rowObj).length === 0 || Object.values(rowObj).every((v) => v === '' || v === null || v === undefined);
    if (isArrEmpty && isObjEmpty) {
      continue;
    }

    let aitVal = '';
    let plateVal = '';
    let driverNameVal = '';
    let descVal = '';
    let infractionCodeVal = '';
    let originalVal = 0;
    let emailNoticeVal = '';
    let nominationDeadlineVal = '';
    let nominatedNameVal = '';
    let discountPaymentDeadlineVal = '';
    let notificationStatusVal = '';
    let locationVal = '';
    let adminFeeVal = 0;
    let driverStatusVal = '';
    let yearVal = new Date().getFullYear();
    let payrollVal = 'Sim-F.Log';
    let appealVal = 'Não';
    let totalVal = 0;
    let paymentStatusVal: 'PENDENTE' | 'PAGO' = 'PENDENTE';
    let paidAtVal = '';
    let paidByVal = '';
    let invoiceNumberVal = '';

    // Step A: Parse directly from rowObj (keyed by column header name)
    for (const [key, rawVal] of Object.entries(rowObj)) {
      if (rawVal === '' || rawVal === null || rawVal === undefined) continue;
      const norm = normalizeHeader(key);

      if (isAitColumn(norm) && !aitVal) {
        aitVal = formatAitValue(rawVal);
      } else if (isPlateColumn(norm) && !plateVal) {
        plateVal = formatStringValue(rawVal).toUpperCase().replace(/[^A-Z0-9]/g, '');
      } else if (isDriverNameColumn(norm) && !driverNameVal) {
        driverNameVal = formatStringValue(rawVal);
      } else if (isDescColumn(norm)) {
        const strVal = formatStringValue(rawVal);
        // If this is specifically a code header like 'codigo' or 'cod'
        if ((norm === 'codigo' || norm === 'cod' || norm.includes('codigodainfracao')) && /^[0-9A-Z\-\.]+$/.test(strVal) && strVal.length <= 8) {
          infractionCodeVal = strVal;
        } else if (!descVal) {
          descVal = strVal;
        }
      } else if (isOriginalValueColumn(norm) && originalVal === 0) {
        originalVal = parseCurrencyOrNumber(rawVal);
      } else if (isAdminFeeColumn(norm) && adminFeeVal === 0) {
        adminFeeVal = parseCurrencyOrNumber(rawVal);
      } else if (isTotalValueColumn(norm) && totalVal === 0) {
        totalVal = parseCurrencyOrNumber(rawVal);
      } else if (isLocationColumn(norm) && !locationVal) {
        locationVal = formatStringValue(rawVal);
      } else if (isNominationDeadlineColumn(norm) && !nominationDeadlineVal) {
        nominationDeadlineVal = formatRawDate(rawVal);
      } else if (isDiscountDeadlineColumn(norm) && !discountPaymentDeadlineVal) {
        discountPaymentDeadlineVal = formatRawDate(rawVal);
      } else if (isEmailNoticeDateColumn(norm) && !emailNoticeVal) {
        emailNoticeVal = formatRawDate(rawVal);
      } else if (isNominatedNameColumn(norm) && !nominatedNameVal) {
        nominatedNameVal = formatStringValue(rawVal);
      } else if (isNotificationStatusColumn(norm) && !notificationStatusVal) {
        notificationStatusVal = formatStringValue(rawVal);
      } else if (isDriverStatusColumn(norm) && !driverStatusVal) {
        driverStatusVal = formatStringValue(rawVal);
      } else if (norm === 'ano' || norm.includes('exercicio')) {
        const parsedYear = parseInt(String(rawVal), 10);
        if (!isNaN(parsedYear) && parsedYear > 2000 && parsedYear < 2100) {
          yearVal = parsedYear;
        }
      } else if (isPayrollColumn(norm)) {
        payrollVal = formatStringValue(rawVal);
      } else if (isAppealColumn(norm)) {
        appealVal = formatStringValue(rawVal);
      } else if (isPaymentStatusColumn(norm)) {
        const str = String(rawVal).toLowerCase();
        if (str.includes('pago') || str.includes('sim') || str.includes('liquidado')) {
          paymentStatusVal = 'PAGO';
        }
      } else if (isPaidAtColumn(norm) && !paidAtVal) {
        paidAtVal = formatRawDate(rawVal);
      } else if (isPaidByColumn(norm) && !paidByVal) {
        paidByVal = formatStringValue(rawVal);
      } else if (isInvoiceNumberColumn(norm) && !invoiceNumberVal) {
        invoiceNumberVal = formatStringValue(rawVal);
      }
    }

    // Step B: Array-level check to fill any missing fields using normalizedHeaders
    const maxCols = Math.max(rowArr.length, normalizedHeaders.length);
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      const cellVal = rowArr[colIdx];
      const norm = normalizedHeaders[colIdx] || '';
      if (cellVal === '' || cellVal === null || cellVal === undefined) continue;

      if (isAitColumn(norm) && !aitVal) {
        aitVal = formatAitValue(cellVal);
      } else if (isPlateColumn(norm) && !plateVal) {
        plateVal = formatStringValue(cellVal).toUpperCase().replace(/[^A-Z0-9]/g, '');
      } else if (isDriverNameColumn(norm) && !driverNameVal) {
        driverNameVal = formatStringValue(cellVal);
      } else if (isDescColumn(norm) && !descVal) {
        descVal = formatStringValue(cellVal);
      } else if (isOriginalValueColumn(norm) && originalVal === 0) {
        originalVal = parseCurrencyOrNumber(cellVal);
      } else if (isAdminFeeColumn(norm) && adminFeeVal === 0) {
        adminFeeVal = parseCurrencyOrNumber(cellVal);
      } else if (isTotalValueColumn(norm) && totalVal === 0) {
        totalVal = parseCurrencyOrNumber(cellVal);
      } else if (isLocationColumn(norm) && !locationVal) {
        locationVal = formatStringValue(cellVal);
      } else if (isNominationDeadlineColumn(norm) && !nominationDeadlineVal) {
        nominationDeadlineVal = formatRawDate(cellVal);
      } else if (isDiscountDeadlineColumn(norm) && !discountPaymentDeadlineVal) {
        discountPaymentDeadlineVal = formatRawDate(cellVal);
      } else if (isEmailNoticeDateColumn(norm) && !emailNoticeVal) {
        emailNoticeVal = formatRawDate(cellVal);
      } else if (isNominatedNameColumn(norm) && !nominatedNameVal) {
        nominatedNameVal = formatStringValue(cellVal);
      } else if (isNotificationStatusColumn(norm) && !notificationStatusVal) {
        notificationStatusVal = formatStringValue(cellVal);
      } else if (isDriverStatusColumn(norm) && !driverStatusVal) {
        driverStatusVal = formatStringValue(cellVal);
      } else if (isPayrollColumn(norm) && !payrollVal) {
        payrollVal = formatStringValue(cellVal);
      } else if (isAppealColumn(norm) && !appealVal) {
        appealVal = formatStringValue(cellVal);
      } else if (isPaidAtColumn(norm) && !paidAtVal) {
        paidAtVal = formatRawDate(cellVal);
      } else if (isPaidByColumn(norm) && !paidByVal) {
        paidByVal = formatStringValue(cellVal);
      } else if (isInvoiceNumberColumn(norm) && !invoiceNumberVal) {
        invoiceNumberVal = formatStringValue(cellVal);
      }
    }

    // Step C: Fallback search specifically for the Infração / Descrição da Infração column
    if (!descVal) {
      // 1. Check any key in rowObj that contains 'infrac' or 'desc' or 'motivo' or 'artigo'
      for (const [k, v] of Object.entries(rowObj)) {
        const normK = normalizeHeader(k);
        if (normK.includes('infrac') || normK.includes('desc') || normK.includes('motivo') || normK.includes('artigo')) {
          const s = formatStringValue(v);
          if (s && s !== locationVal && s !== nominatedNameVal && !s.includes('R$')) {
            descVal = s;
            break;
          }
        }
      }
    }

    if (!descVal) {
      // 2. Scan remaining text cells in rowArr that have text length >= 4 and are not numbers, dates, plate, AIT
      for (let colIdx = 0; colIdx < rowArr.length; colIdx++) {
        const s = formatStringValue(rowArr[colIdx]);
        if (
          s &&
          s.length >= 4 &&
          s !== plateVal &&
          s !== aitVal &&
          s !== locationVal &&
          s !== nominatedNameVal &&
          s !== driverNameVal &&
          !s.includes('/') && // not date
          !s.startsWith('R$') && // not currency
          isNaN(Number(s.replace(',', '.')))
        ) {
          descVal = s;
          break;
        }
      }
    }

    // Combine code and description if both were found
    if (infractionCodeVal && descVal && !descVal.includes(infractionCodeVal)) {
      descVal = `${infractionCodeVal} — ${descVal}`;
    } else if (infractionCodeVal && !descVal) {
      descVal = infractionCodeVal;
    }

    // Fallback for AIT if not caught by column name
    if (!aitVal) {
      for (const v of Object.values(rowObj)) {
        const s = formatStringValue(v);
        if (s && s.length >= 6 && s.length <= 15 && /^[A-Z0-9]+$/i.test(s) && s !== plateVal && !s.includes('/') && !s.includes(':')) {
          aitVal = formatAitValue(s);
          break;
        }
      }
    }
    if (!aitVal && rowArr.length > 0) {
      for (let colIdx = 0; colIdx < rowArr.length; colIdx++) {
        const s = formatStringValue(rowArr[colIdx]);
        if (s && s.length >= 6 && s.length <= 15 && /^[A-Z0-9]+$/i.test(s) && s !== plateVal && !s.includes('/') && !s.includes(':')) {
          aitVal = formatAitValue(s);
          break;
        }
      }
    }

    // Skip lines with no AIT and no plate
    if (!aitVal && !plateVal) {
      continue;
    }

    // If driver was not specified in row, check if registered driver is linked to plate
    if (!driverNameVal && plateVal && plateToDriverMap.has(plateVal)) {
      driverNameVal = plateToDriverMap.get(plateVal)!.name;
    }

    // Standard auto-calculations for fees
    if (adminFeeVal === 0 && originalVal > 0) {
      adminFeeVal = Number((originalVal * 0.1).toFixed(2));
    }
    if (totalVal === 0 && originalVal > 0) {
      totalVal = Number((originalVal + adminFeeVal).toFixed(2));
    }

    const item: OperacaoCAItem = {
      id: `ca-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${i}`,
      ait: aitVal || `S/AIT-${i + 1}`,
      plate: plateVal,
      driverName: driverNameVal || undefined,
      infractionDescription: descVal || 'INFRAÇÃO DE TRÂNSITO',
      originalValue: originalVal,
      emailNoticeDate: emailNoticeVal,
      nominationDeadline: nominationDeadlineVal,
      nominatedName: nominatedNameVal || 'P-LOG TRANSPORTES',
      discountPaymentDeadline: discountPaymentDeadlineVal,
      notificationStatus: notificationStatusVal || 'Sem Indicação',
      infractionLocation: locationVal,
      adminFee: adminFeeVal,
      driverStatusCompetence: driverStatusVal || 'Indisponível Motorista',
      year: yearVal,
      payrollDeduction: payrollVal || 'Sim-F.Log',
      appealStatus: appealVal || 'Não',
      totalValue: totalVal,
      paymentStatus: paymentStatusVal,
      paidAt: paidAtVal || undefined,
      paidBy: paidByVal || undefined,
      invoiceNumber: invoiceNumberVal || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    // Duplicate Check against existing database
    const cleanAit = item.ait.trim().toUpperCase();
    if (existingMap.has(cleanAit)) {
      duplicatesExisting.push({
        scanned: item,
        existing: existingMap.get(cleanAit)!,
      });
      continue;
    }

    // Duplicate Check within the same imported file
    if (seenInFileAits.has(cleanAit)) {
      duplicatesInternal.push(item);
      continue;
    }

    seenInFileAits.add(cleanAit);
    newItems.push(item);
  }

  return {
    newItems,
    duplicatesExisting,
    duplicatesInternal,
    totalRowsParsed: totalRowCount,
  };
}

export function exportOperacaoCAToExcel(items: OperacaoCAItem[], fileName = 'Operacao_CA_Multas.xlsx') {
  const exportRows = items.map((it) => ({
    AIT: it.ait,
    Placa: it.plate,
    'Nome do Motorista': it.driverName || '',
    'DESCRIÇÃO DA INFRAÇÃO': it.infractionDescription,
    Infração: it.infractionDescription,
    'Valor Cobrado': it.originalValue,
    'Data do Envio (Email/Multa)': it.emailNoticeDate || '',
    'Data Limite para Indicação': it.nominationDeadline || '',
    'Nome do Indicado': it.nominatedName || '',
    'Data Limite Pagamento com Desconto': it.discountPaymentDeadline || '',
    'Status da Notificação': it.notificationStatus || '',
    'Local da Infração': it.infractionLocation || '',
    'Taxa Administrativa': it.adminFee,
    'Status Motorista / Competência': it.driverStatusCompetence || '',
    Ano: it.year,
    'Desconto em Folha': it.payrollDeduction || 'Sim-F.Log',
    Recurso: it.appealStatus || 'Não',
    'Valor Total': it.totalValue,
    'Status do Pagamento': it.paymentStatus === 'PAGO' ? 'PAGO' : 'PENDENTE',
    'Data do Pagamento': it.paidAt || '',
    'Pago Por (Quem Pagou)': it.paidBy || '',
    'Número da Nota Fiscal (NF)': it.invoiceNumber || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Operação C.A');
  XLSX.writeFile(workbook, fileName);
}

export function downloadSampleOperacaoCATemplate() {
  const sampleRows = [
    {
      AIT: '2167909384',
      Placa: 'TDX1E88',
      'Nome do Motorista': 'CARLOS EDUARDO SILVA',
      'DESCRIÇÃO DA INFRAÇÃO': 'DEIXAR DE CONSERVAR O VEICULO NA FAIXA A ELE DESTINADA PELA SINALIZACAO DEREGULAMENTACAO',
      Infração: 'DEIXAR DE CONSERVAR O VEICULO NA FAIXA A ELE DESTINADA PELA SINALIZACAO DEREGULAMENTACAO',
      'Valor Cobrado': 104.13,
      'Data do Envio (Email/Multa)': '20/03/2026 19:06',
      'Data Limite para Indicação': '19/04/2026',
      'Nome do Indicado': 'P-LOG TRANSPORTES',
      'Data Limite Pagamento com Desconto': '09/03/2026 18:25',
      'Status da Notificação': '20/03/2026 Prazo Expirado',
      'Local da Infração': 'SP 330 - KM 084 METROS 000',
      'Taxa Administrativa': 10.413,
      'Status Motorista / Competência': 'Indisponível Motorista Março',
      Ano: 2026,
      'Desconto em Folha': 'Sim-F.Log',
      Recurso: 'Não',
      'Valor Total': 114.54,
      'Status do Pagamento': 'PAGO',
      'Data do Pagamento': '25/03/2026',
      'Pago Por (Quem Pagou)': 'P-LOG TRANSPORTES',
      'Número da Nota Fiscal (NF)': 'NF-98421',
    },
    {
      AIT: '150788647',
      Placa: 'RTW7A59',
      'Nome do Motorista': 'MARCOS ANTONIO DE SOUZA',
      'DESCRIÇÃO DA INFRAÇÃO': 'TRANSITAR EM VELOCIDADE SUPERIOR A MAXIMA PERMITIDA EM ATE 20',
      Infração: 'TRANSITAR EM VELOCIDADE SUPERIOR A MAXIMA PERMITIDA EM ATE 20',
      'Valor Cobrado': 104.13,
      'Data do Envio (Email/Multa)': '20/03/2026 19:06',
      'Data Limite para Indicação': '19/04/2026',
      'Nome do Indicado': 'P-LOG TRANSPORTES',
      'Data Limite Pagamento com Desconto': '17/03/2026 21:04',
      'Status da Notificação': '17/03/2026 Prazo Expirado',
      'Local da Infração': 'MG - BR 381 - KM 870,2 - DECRESCENTE',
      'Taxa Administrativa': 10.413,
      'Status Motorista / Competência': 'Indisponível Motorista Março',
      Ano: 2026,
      'Desconto em Folha': 'Sim-F.Log',
      Recurso: 'Não',
      'Valor Total': 114.54,
      'Status do Pagamento': 'PENDENTE',
      'Data do Pagamento': '',
      'Pago Por (Quem Pagou)': '',
      'Número da Nota Fiscal (NF)': '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo Operação C.A');
  XLSX.writeFile(workbook, 'Modelo_Planilha_Operacao_CA.xlsx');
}
