import * as XLSX from 'xlsx';
import { Driver } from '../types';

export interface DriverImportRowPreview {
  rawIndex: number;
  name: string;
  cpf: string;
  rg: string;
  phone: string;
  observations: string;
  cnhNumber?: string;
  cnhCategory?: string;
  isValid: boolean;
  validationError?: string;
  isDuplicateExisting: boolean;
  isDuplicateInternal: boolean;
  existingDriverId?: string;
}

export interface DriverImportResult {
  previewRows: DriverImportRowPreview[];
  validCount: number;
  duplicateExistingCount: number;
  duplicateInternalCount: number;
  invalidCount: number;
  totalParsed: number;
  detectedHeaders: string[];
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

export function formatCpf(val: unknown): string {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');
  if (digits.length > 0 && digits.length < 11) {
    digits = digits.padStart(11, '0');
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  return String(val).trim();
}

export function formatPhone(val: unknown): string {
  if (!val) return '';
  const str = String(val).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return str;
}

export function parseDriverExcel(
  fileData: ArrayBuffer | Uint8Array,
  existingDrivers: Driver[] = []
): DriverImportResult {
  const workbook = XLSX.read(fileData, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Nenhuma aba encontrada na planilha.');
  }

  // Pick the best sheet: look for sheets named 'motorista', 'condutor', 'dados', 'cadastro' or first sheet
  let selectedSheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    if (/motorista|condutor|dados|cadastro|equipe|funcionarios/i.test(name)) {
      selectedSheetName = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  if (!worksheet) {
    throw new Error('Não foi possível ler os dados da aba da planilha.');
  }

  const grid = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', blankrows: false });

  if (grid.length === 0) {
    throw new Error('A planilha está vazia.');
  }

  // Detect header row (look for motorista / nome or cpf in first 10 rows)
  // Detect header row with scoring to avoid false-matching on a sheet title (e.g. "Cadastro de Motoristas")
  let bestHeaderScore = 0;
  let bestHeaderRowIndex = -1;
  let bestCols = {
    colMotorista: -1,
    colCpf: -1,
    colRg: -1,
    colContato: -1,
    colObservacao: -1,
    colCnh: -1,
    colCategoria: -1,
  };

  for (let r = 0; r < Math.min(grid.length, 12); r++) {
    const row = grid[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    let cm = -1, ccpf = -1, crg = -1, ccont = -1, cobs = -1, ccnh = -1, ccat = -1;

    for (let c = 0; c < row.length; c++) {
      const cell = normalizeHeader(String(row[c] || ''));
      if (!cell) continue;

      if (
        cell === 'motorista' ||
        cell === 'nome' ||
        cell === 'condutor' ||
        cell === 'nomedomotorista' ||
        cell === 'nomecompleto' ||
        cell.includes('motorista') ||
        cell.includes('funcionario') ||
        cell.includes('colaborador') ||
        cell.includes('profissional')
      ) {
        if (cm === -1) {
          cm = c;
          score += (cell === 'motorista' || cell === 'nome' || cell === 'condutor') ? 4 : 2;
        }
      }
      if (cell.includes('cpf') || (cell.includes('doc') && !cell.includes('rg'))) {
        if (ccpf === -1) {
          ccpf = c;
          score += 4;
        }
      }
      if (
        cell === 'rg' ||
        cell.includes('identidade') ||
        cell.includes('documentorg') ||
        cell.includes('registrogeral')
      ) {
        if (crg === -1) {
          crg = c;
          score += 3;
        }
      }
      if (
        cell.includes('contato') ||
        cell.includes('telefone') ||
        cell.includes('celular') ||
        cell.includes('fone') ||
        cell.includes('tel') ||
        cell.includes('whatsapp')
      ) {
        if (ccont === -1) {
          ccont = c;
          score += 3;
        }
      }
      if (
        cell.includes('observ') ||
        cell === 'obs' ||
        cell.includes('nota') ||
        cell.includes('detalhes') ||
        cell.includes('comentario') ||
        cell.includes('descricao')
      ) {
        if (cobs === -1) {
          cobs = c;
          score += 3;
        }
      }
      if (cell.includes('cnh') && !cell.includes('venc') && !cell.includes('cat')) {
        if (ccnh === -1) {
          ccnh = c;
          score += 2;
        }
      }
      if (cell.includes('cat') || cell.includes('categoria')) {
        if (ccat === -1) {
          ccat = c;
          score += 1;
        }
      }
    }

    if (score > bestHeaderScore) {
      bestHeaderScore = score;
      bestHeaderRowIndex = r;
      bestCols = {
        colMotorista: cm,
        colCpf: ccpf,
        colRg: crg,
        colContato: ccont,
        colObservacao: cobs,
        colCnh: ccnh,
        colCategoria: ccat,
      };
    }
  }

  const headerFound = bestHeaderScore >= 3;
  const headerRowIndex = headerFound ? bestHeaderRowIndex : -1;
  const colMotorista = headerFound && bestCols.colMotorista !== -1 ? bestCols.colMotorista : 0;
  const colCpf = headerFound && bestCols.colCpf !== -1 ? bestCols.colCpf : 1;
  const colRg = headerFound && bestCols.colRg !== -1 ? bestCols.colRg : 2;
  const colContato = headerFound && bestCols.colContato !== -1 ? bestCols.colContato : 3;
  const colObservacao = headerFound && bestCols.colObservacao !== -1 ? bestCols.colObservacao : 4;
  const colCnh = headerFound ? bestCols.colCnh : -1;
  const colCategoria = headerFound ? bestCols.colCategoria : -1;

  const existingCpfMap = new Map<string, Driver>();
  existingDrivers.forEach((d) => {
    const clean = d.cpf.replace(/\D/g, '');
    if (clean) existingCpfMap.set(clean, d);
  });

  const previewRows: DriverImportRowPreview[] = [];
  const internalCpfSet = new Set<string>();

  const detectedHeaders =
    headerFound && Array.isArray(grid[headerRowIndex])
      ? (grid[headerRowIndex] as any[]).map((v) => String(v || '').trim()).filter(Boolean)
      : ['MOTORISTA', 'CPF', 'RG', 'CONTATO', 'OBSERVAÇÃO'];

  const startRow = headerFound ? headerRowIndex + 1 : 0;

  for (let r = startRow; r < grid.length; r++) {
    const row = grid[r];
    if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
      continue;
    }

    const rawName = colMotorista !== -1 && row[colMotorista] !== undefined ? String(row[colMotorista]).trim() : '';
    const rawCpf = colCpf !== -1 && row[colCpf] !== undefined ? String(row[colCpf]).trim() : '';
    const rawRg = colRg !== -1 && row[colRg] !== undefined ? String(row[colRg]).trim() : '';
    const rawContato = colContato !== -1 && row[colContato] !== undefined ? String(row[colContato]).trim() : '';
    const rawObs = colObservacao !== -1 && row[colObservacao] !== undefined ? String(row[colObservacao]).trim() : '';
    const rawCnh = colCnh !== -1 && row[colCnh] !== undefined ? String(row[colCnh]).trim() : '';
    const rawCat = colCategoria !== -1 && row[colCategoria] !== undefined ? String(row[colCategoria]).trim() : 'B';

    // Skip re-reading the header text if duplicated in rows
    const normName = normalizeHeader(rawName);
    const normCpf = normalizeHeader(rawCpf);
    if ((normName === 'motorista' || normName === 'nome') && (normCpf === 'cpf' || normCpf === 'documento')) {
      continue;
    }

    if (!rawName && !rawCpf) {
      continue;
    }

    let formattedCpf = formatCpf(rawCpf);
    let cleanCpfDigits = formattedCpf.replace(/\D/g, '');
    const formattedPhone = formatPhone(rawContato);

    let isValid = true;
    let validationError = '';

    if (!rawName) {
      isValid = false;
      validationError = 'Nome do motorista obrigatório';
    } else if (!cleanCpfDigits || cleanCpfDigits.length < 11) {
      if (cleanCpfDigits && cleanCpfDigits.length > 0) {
        // Pad with leading zeroes to 11 digits (Excel number format drops leading zeroes)
        cleanCpfDigits = cleanCpfDigits.padStart(11, '0');
        formattedCpf = formatCpf(cleanCpfDigits);
      } else {
        // Fallback provisional CPF so row is not lost
        const provSeq = String(r + 1).padStart(3, '0');
        cleanCpfDigits = `00000000${provSeq}`.slice(-11);
        formattedCpf = formatCpf(cleanCpfDigits);
      }
    }

    const existingMatch = cleanCpfDigits ? existingCpfMap.get(cleanCpfDigits) : undefined;
    const isDuplicateExisting = Boolean(existingMatch);
    const isDuplicateInternal = Boolean(cleanCpfDigits && internalCpfSet.has(cleanCpfDigits));

    if (cleanCpfDigits) {
      internalCpfSet.add(cleanCpfDigits);
    }

    previewRows.push({
      rawIndex: r + 1,
      name: rawName.toUpperCase(),
      cpf: formattedCpf,
      rg: rawRg,
      phone: formattedPhone,
      observations: rawObs,
      cnhNumber: rawCnh || cleanCpfDigits || `CNH-${Date.now().toString().slice(-9)}`,
      cnhCategory: rawCat || 'B',
      isValid,
      validationError,
      isDuplicateExisting,
      isDuplicateInternal,
      existingDriverId: existingMatch?.id,
    });
  }

  const validCount = previewRows.filter((p) => p.isValid && !p.isDuplicateExisting && !p.isDuplicateInternal).length;
  const duplicateExistingCount = previewRows.filter((p) => p.isDuplicateExisting).length;
  const duplicateInternalCount = previewRows.filter((p) => p.isDuplicateInternal).length;
  const invalidCount = previewRows.filter((p) => !p.isValid).length;

  return {
    previewRows,
    validCount,
    duplicateExistingCount,
    duplicateInternalCount,
    invalidCount,
    totalParsed: previewRows.length,
    detectedHeaders,
  };
}

export function convertPreviewToDriver(
  preview: DriverImportRowPreview,
  options: {
    isPlogDriver?: boolean;
    operationType?: 'PLOG' | 'FROTA_GERAL';
    companyName?: string;
    companyCnpj?: string;
  } = {}
): Driver {
  const cleanCpf = preview.cpf.replace(/\D/g, '');
  const nowIso = new Date().toISOString();
  const cnhNumber = preview.cnhNumber || cleanCpf || `CNH-${Date.now().toString().slice(-9)}`;

  return {
    id: preview.existingDriverId || `drv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: preview.name.trim().toUpperCase(),
    cpf: preview.cpf,
    rg: preview.rg || undefined,
    phone: preview.phone || '',
    email: '',
    observations: preview.observations || undefined,
    cnhNumber,
    cnhCategory: (preview.cnhCategory as any) || 'B',
    cnhExpiration: new Date(Date.now() + 365 * 5 * 86400000).toISOString().slice(0, 10),
    currentPoints: 0,
    status: 'REGULAR',
    isPlogDriver: Boolean(options.isPlogDriver),
    operationType: options.operationType || (options.isPlogDriver ? 'PLOG' : 'FROTA_GERAL'),
    companyName: options.companyName || undefined,
    companyCnpj: options.companyCnpj || undefined,
    createdAt: nowIso.slice(0, 10),
  };
}

/**
 * Downloads standard Excel template with the exact columns requested:
 * MOTORISTA | CPF | RG | CONTATO | OBSERVAÇÃO
 */
export function downloadDriverExcelTemplate() {
  const sampleData = [
    {
      MOTORISTA: 'CARLOS EDUARDO SILVA',
      CPF: '123.456.789-01',
      RG: '12.345.678-9',
      CONTATO: '(11) 98765-4321',
      'OBSERVAÇÃO': 'Motorista Carreta / Rota SP-PR',
    },
    {
      MOTORISTA: 'MARCOS ANTONIO DE SOUZA',
      CPF: '234.567.890-12',
      RG: '23.456.789-0',
      CONTATO: '(11) 97654-3210',
      'OBSERVAÇÃO': 'Disponível para transferências noturnas',
    },
    {
      MOTORISTA: 'RODRIGO FERREIRA LIMA',
      CPF: '345.678.901-23',
      RG: '34.567.890-1',
      CONTATO: '(19) 98877-6655',
      'OBSERVAÇÃO': 'Operação P-LOG / CNH Cat. D',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 32 }, // MOTORISTA
    { wch: 18 }, // CPF
    { wch: 16 }, // RG
    { wch: 18 }, // CONTATO
    { wch: 45 }, // OBSERVAÇÃO
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Motoristas');
  XLSX.writeFile(workbook, 'Modelo_Importacao_Motoristas.xlsx');
}
