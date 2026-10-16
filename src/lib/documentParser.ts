import { Driver, Vehicle, TrafficFine, CnhCategory, FineSeverity } from '../types';
import { COMMON_CTB_CODES } from '../data/mockData';

/**
 * Validates a Brazilian CPF using the official 2-digit checksum algorithm.
 */
export function isValidBrazilianCpf(cpfRaw: string): boolean {
  const digits = (cpfRaw || '').replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev1 = 11 - (sum1 % 11);
  if (rev1 >= 10) rev1 = 0;
  if (rev1 !== parseInt(digits.charAt(9), 10)) return false;

  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  let rev2 = 11 - (sum2 % 11);
  if (rev2 >= 10) rev2 = 0;
  return rev2 === parseInt(digits.charAt(10), 10);
}

export function formatCpfString(cleanDigits: string): string {
  const d = cleanDigits.replace(/\D/g, '');
  if (d.length !== 11) return cleanDigits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function formatCnpjString(cleanDigits: string): string {
  const d = cleanDigits.replace(/\D/g, '');
  if (d.length !== 14) return cleanDigits;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

function brDateToIso(brDate: string): string {
  return normalizeDateToIso(brDate);
}

/**
 * Normalizes any date string (DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, YYYY-MM-DD)
 * strictly into HTML5 date format YYYY-MM-DD.
 */
export function normalizeDateToIso(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // 1. Direct ISO format YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[.\/-](\d{2})[.\/-](\d{2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${isoMatch[1]}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. Brazilian format DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const brMatch = trimmed.match(/^(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{4})/);
  if (brMatch) {
    const d = parseInt(brMatch[1], 10);
    const m = parseInt(brMatch[2], 10);
    const y = parseInt(brMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 3. Fallback date search anywhere in string
  const anyBr = trimmed.match(/\b(\d{2})[.\/-](\d{2})[.\/-](\d{4})\b/);
  if (anyBr) {
    const d = parseInt(anyBr[1], 10);
    const m = parseInt(anyBr[2], 10);
    const y = parseInt(anyBr[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return '';
}

/**
 * Normalizes any date/time string from documents or AI into the strict
 * HTML5 <input type="datetime-local"> format: YYYY-MM-DDTHH:mm (16 chars).
 */
export function normalizeInfractionDateTime(rawDate?: string | null): string {
  if (!rawDate || typeof rawDate !== 'string') return '';
  const trimmed = rawDate.trim();
  if (!trimmed) return '';

  // 1. Matches DD/MM/YYYY or DD-MM-YYYY with optional HH:mm or HH:mm:ss or HH'h'mm
  const brMatch = trimmed.match(
    /^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})(?:[\sT]+(?:[ÀA]S\s+)?(\d{2})[:hH](\d{2})(?::\d{2})?)?/i
  );
  if (brMatch) {
    const [, dd, mm, yyyy, hh = '12', min = '00'] = brMatch;
    return `${yyyy}-${mm}-${dd}T${hh.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  // 2. Matches YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm (with optional seconds/Z)
  const isoMatch = trimmed.match(
    /^(\d{4})[\/\-.](\d{2})[\/\-.](\d{2})[T\s](\d{2})[:hH](\d{2})/i
  );
  if (isoMatch) {
    const [, yyyy, mm, dd, hh, min] = isoMatch;
    return `${yyyy}-${mm}-${dd}T${hh.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  // 3. Matches YYYY-MM-DD only
  const isoDateOnly = trimmed.match(/^(\d{4})[\/\-.](\d{2})[\/\-.](\d{2})$/);
  if (isoDateOnly) {
    const [, yyyy, mm, dd] = isoDateOnly;
    return `${yyyy}-${mm}-${dd}T12:00`;
  }

  // 4. Try JS Date parsing as fallback
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    try {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      const hh = String(parsed.getHours()).padStart(2, '0');
      const min = String(parsed.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch {
      // ignore
    }
  }

  return '';
}

export const CNH_INVALID_NAME_PATTERNS = [
  'DOCUMENTO ASSINADO',
  'ASSINADO COM CERTIFICADO',
  'CERTIFICADO DIGITAL',
  'ASSINADO DIGITALMENTE',
  'ASSINADO ELETRONICAMENTE',
  'ASSINATURA DIGITAL',
  'ASSINATURA ELETRONICA',
  'ICP-BRASIL',
  'ICP BRASIL',
  'MEDIDA PROVISORIA',
  'MEDIDA PROVISÓRIA',
  'MP 2.200',
  'MP 2200',
  'MP Nº',
  'MP N°',
  'AUTENTICIDADE',
  'AUTENTICACAO',
  'AUTENTICAÇÃO',
  'CHAVE DE ACESSO',
  'CHAVE DE SEGURANÇA',
  'CODIGO DE SEGURANCA',
  'CÓDIGO DE SEGURANÇA',
  'CARTEIRA DIGITAL',
  'CARTEIRA NACIONAL',
  'HABILITACAO',
  'HABILITAÇÃO',
  'REPUBLICA FEDERATIVA',
  'REPÚBLICA FEDERATIVA',
  'MINISTERIO',
  'MINISTÉRIO',
  'SECRETARIA NACIONAL',
  'SECRETARIA DE ESTADO',
  'DEPARTAMENTO NACIONAL',
  'DEPARTAMENTO ESTADUAL',
  'SENATRAN',
  'DETRAN',
  'CONTRAN',
  'DENATRAN',
  'SERPRO',
  'PROIBIDO PLASTIFICAR',
  'VALIDA EM TODO',
  'VÁLIDA EM TODO',
  'TERRITORIO NACIONAL',
  'TERRITÓRIO NACIONAL',
  'OBSERVACOES',
  'OBSERVAÇÕES',
  'EXERCE ATIVIDADE REMUNERADA',
  'ATIVIDADE REMUNERADA',
  'EAR',
  'ASSINATURA DO EMISSOR',
  'ASSINATURA DO PORTADOR',
  'ASSINATURA',
  'LOCAL DATA',
  'LOCAL E DATA',
  'DATA EMISSAO',
  'DATA EMISSÃO',
  'PRIMEIRA HABILITACAO',
  '1A HABILITACAO',
  '1ª HABILITAÇÃO',
  'PERMISSAO',
  'PERMISSÃO',
  'CONFORMIDADE',
  'VALIDADOR',
  'VERIFICADOR',
  'PORTARIA',
  'RESOLUCAO',
  'RESOLUÇÃO',
  'QR CODE',
  'QRCODE',
  'VIO',
  'DOC IDENTIDADE',
  'ORG EMISSOR',
  'ÓRGÃO EMISSOR',
  'ORGAO EMISSOR',
  'FILIACAO',
  'FILIAÇÃO',
  'VIA DIGITAL',
  'VIA CONDUTOR',
  'VALOR LEGAL',
  'HABILITADO',
  'CAMPO_BOX',
  'CAMPO_ABAIXO',
  'CAMPO_DIREITA',
];

const CNH_HEADER_STOPWORDS = CNH_INVALID_NAME_PATTERNS;

/**
 * Validates whether a string is a genuine Brazilian person full name.
 */
export function isValidDriverName(nameRaw: string): boolean {
  if (!nameRaw || typeof nameRaw !== 'string') return false;
  const clean = nameRaw.trim().toUpperCase();
  if (clean.length < 5 || clean.length > 70) return false;
  if (/\d/.test(clean)) return false;
  // Must only contain letters, spaces, apostrophes, hyphens, and dots
  if (!/^[A-ZÀ-Ÿ\s'.-]+$/.test(clean)) return false;

  for (const pat of CNH_INVALID_NAME_PATTERNS) {
    if (clean.includes(pat)) return false;
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 8) return false;
  const realWords = words.filter(
    (w) => w.length >= 2 && !['DE', 'DA', 'DO', 'DOS', 'DAS', 'E'].includes(w)
  );
  if (realWords.length < 2) return false;

  return true;
}

export function cleanPersonNamePrefixes(raw: string): string {
  return raw
    .replace(/^CAMPO_(?:ABAIXO|DIREITA|BOX)\[[^\]]+\]:\s*/i, '')
    .replace(
      /^(?:1\.?\s*SOBRENOME(?:\s*[\/,]\s*|\s*E\s*)?NOME|1\.?\s*SOBRENOME|2\s*e\s*1\s*NOME|2\.?\s*NOME|1\.\s*NOME|NOME\s*E\s*SOBRENOME|NOME\s*CIVIL|NOME\s*DO\s*CONDUTOR|NOME|CONDUTOR)\s*[:\-]?\s*/i,
      ''
    )
    .replace(/^\d+[\.\-]?\s*/, '')
    .trim();
}

/**
 * Sanitizes and normalizes a driver name extracted from document text or AI.
 * Handles "1. SOBRENOME, NOME" inversion (e.g. "SANTOS, HELIO" -> "HELIO SANTOS").
 */
export function sanitizeDriverName(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let clean = cleanPersonNamePrefixes(raw);

  // If in format "SOBRENOME, NOME" or "SOBRENOME / NOME" (e.g. "SANTOS, HELIO" or "SANTOS / HELIO")
  const parts = clean.split(/[,/]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 2 && parts[0].length >= 2 && parts[1].length >= 2) {
    clean = `${parts[1]} ${parts[0]}`;
  }

  // Handle common OCR stuck words like HELIOSANTOS -> HELIO SANTOS
  clean = clean.replace(/\bHELIOSANTOS\b/gi, 'HELIO SANTOS');

  clean = clean.replace(/\s+/g, ' ').trim().toUpperCase();

  if (!isValidDriverName(clean)) {
    return '';
  }
  return clean;
}

/**
 * Extracts driver name and expiration date directly from filename.
 * Example: "CNH HelioSantos - 13.10.2031.pdf" -> { name: "HELIO SANTOS", expirationDate: "2031-10-13" }
 */
export function extractDriverDataFromFileName(fileName?: string): {
  name?: string;
  expirationDate?: string;
} {
  if (!fileName || typeof fileName !== 'string') return {};
  const cleanBase = fileName
    .replace(/\.[a-zA-Z0-9]+$/, '') // remove extension (.pdf, .png, etc.)
    .replace(/^(?:CNH(?:[-_\s]*DIGITAL|[-_\s]*E)?|CARTEIRA|MOTORISTA|CONDUTOR|DOC(?:UMENTO)?)[-_\s]*/i, '')
    .trim();

  let expirationDate = '';
  // Check for date pattern in filename like 13.10.2031, 13-10-2031, 13_10_2031, 2031-10-13
  const dateMatch = cleanBase.match(/(?:^|[-_\s])(\d{2})[.\/_-](\d{2})[.\/_-](\d{4})(?:$|[-_\s])/);
  if (dateMatch) {
    const d = parseInt(dateMatch[1], 10);
    const m = parseInt(dateMatch[2], 10);
    const y = parseInt(dateMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2020 && y <= 2045) {
      expirationDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Remove the date and extra delimiters from name candidate
  let nameCandidate = cleanBase
    .replace(/(?:^|[-_\s])\d{2}[.\/_-]\d{2}[.\/_-]\d{4}(?:$|[-_\s])/, ' ')
    .replace(/[-_]+/g, ' ')
    .trim();

  // Split CamelCase if words are stuck together like HelioSantos -> Helio Santos
  nameCandidate = nameCandidate.replace(/([a-zà-ÿ])([A-ZÀ-Ÿ])/g, '$1 $2');
  nameCandidate = nameCandidate.replace(/\s+/g, ' ').trim().toUpperCase();

  const name = sanitizeDriverName(nameCandidate);

  return {
    name: name || undefined,
    expirationDate: expirationDate || undefined,
  };
}

function isValidCandidatePersonName(line: string): boolean {
  const sanitized = sanitizeDriverName(line);
  return Boolean(sanitized);
}

const CRLV_NON_OWNER_STOPWORDS = [
  'REPUBLICA FEDERATIVA',
  'REPÚBLICA FEDERATIVA',
  'MINISTERIO',
  'MINISTÉRIO',
  'SECRETARIA NACIONAL',
  'DEPARTAMENTO',
  'SENATRAN',
  'DENATRAN',
  'DETRAN',
  'CONTRAN',
  'CERTIFICADO DE REGISTRO',
  'LICENCIAMENTO DE VEICULO',
  'LICENCIAMENTO DE VEÍCULO',
  'CODIGO RENAVAM',
  'CÓDIGO RENAVAM',
  'PLACA ANTERIOR',
  'ANO FABRICACAO',
  'ANO FABRICAÇÃO',
  'ANO MODELO',
  'MARCA / MODELO',
  'MARCA/MODELO',
  'ESPECIE / TIPO',
  'ESPÉCIE / TIPO',
  'COR PREDOMINANTE',
  'COMBUSTIVEL',
  'COMBUSTÍVEL',
  'OBSERVACOES DO VEICULO',
  'OBSERVAÇÕES DO VEÍCULO',
  'INFORMACOES DO SEGURO',
  'INFORMAÇÕES DO SEGURO',
  'DADOS DO SEGURO',
  'ASSINADO DIGITALMENTE',
  'DOCUMENTO EMITIDO',
  'QR CODE',
  'SERPRO',
  'SEM OBSERVACOES',
  'SEM OBSERVAÇÕES',
  'NAO HA RESTRICOES',
  'NÃO HÁ RESTRIÇÕES',
  'ALIENACAO FIDUCIARIA',
  'ALIENAÇÃO FIDUCIÁRIA',
  'ARRENDAMENTO',
  'RESERVA DE DOMINIO',
  'POTENCIA',
  'POTÊNCIA',
  'CILINDRADA',
  'PESO BRUTO',
  'CAPACIDADE',
  'LOTACAO',
  'LOTAÇÃO',
  'CARROCERIA',
  'CATEGORIA',
  'ALUGUEL',
  'PARTICULAR',
  'OFICIAL',
];

export function isValidCrlvOwnerName(candidate: string): boolean {
  const clean = (candidate || '').trim().toUpperCase();
  if (clean.length < 4 || clean.length > 100) return false;
  if (
    /^(?:NOME|CPF|CNPJ|LOCAL|DATA|PLACA|CHASSI|RENAVAM|MOTOR|CMT|EIXOS|CAT|EXERCICIO|EXERCÍCIO|DIESEL|GASOLINA|ALCOOL|ÁLCOOL|ETANOL|FLEX|BRANCA|BRANCO|PRATA|PRETA|PRETO|CINZA|AZUL|VERMELHA|VERMELHO|AMARELA|AMARELO|VERDE)\b/i.test(
      clean
    )
  ) {
    return false;
  }
  if (/^\d+$/.test(clean.replace(/[.\-\/\s]/g, ''))) return false;
  if (/\b\d{2}\/\d{2}\/\d{4}\b/.test(clean)) return false;
  if (
    /^(?:VOLVO|SCANIA|VW|VOLKSWAGEN|M\.?BENZ|MERCEDES|FORD|FIAT|GM|CHEVROLET|TOYOTA|HONDA|HYUNDAI|RENAULT|IVECO|DAF|MAN|RANDON|FACCHINI|LIBRELATO|GUERRA)\b/i.test(
      clean
    )
  ) {
    return false;
  }
  for (const stop of CRLV_NON_OWNER_STOPWORDS) {
    if (clean.includes(stop)) return false;
  }
  const letters = clean.replace(/[^A-ZÀ-Ÿ]/g, '');
  if (letters.length < 4) return false;
  return true;
}

const INVALID_CITY_WORDS = [
  'SENATRAN',
  'DETRAN',
  'DENATRAN',
  'CONTRAN',
  'CETRAN',
  'SERPRO',
  'SECRETARIA',
  'MINISTERIO',
  'MINISTÉRIO',
  'DEPARTAMENTO',
  'REPUBLICA',
  'REPÚBLICA',
  'FEDERATIVA',
  'BRASIL',
  'CERTIFICADO',
  'REGISTRO',
  'LICENCIAMENTO',
  'VEICULO',
  'VEÍCULO',
  'PLACA',
  'ANTERIOR',
  'MARCA',
  'MODELO',
  'VERSAO',
  'VERSÃO',
  'ESPECIE',
  'ESPÉCIE',
  'COMBUSTIVEL',
  'COMBUSTÍVEL',
  'OBSERVACOES',
  'OBSERVAÇÕES',
  'ASSINADO',
  'DIGITALMENTE',
  'PROPRIETARIO',
  'PROPRIETÁRIO',
  'VOLVO',
  'SCANIA',
  'MERCEDES',
  'BENZ',
  'VOLKSWAGEN',
  'CAMINHAO',
  'CAMINHÃO',
  'TRATOR',
  'CARGA',
  'DIESEL',
  'GASOLINA',
  'ALCOOL',
];

export function sanitizeCrlvCityUf(rawCityUf?: string): string {
  if (!rawCityUf) return '';
  const cleaned = rawCityUf
    .replace(/^CAMPO_(?:ABAIXO|DIREITA|BOX)\[[^\]]+\]:\s*/i, '')
    .replace(/^(?:LOCAL|MUNIC[ÍI]PIO|CIDADE)(?:\s*DE\s*REGISTRO)?\s*[:\-]?\s*/i, '')
    .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, '')
    .trim()
    .toUpperCase();

  const m = cleaned.match(
    /^([A-ZÀ-Ÿ][A-ZÀ-Ÿ\s'.-]{1,40}?)(?:\s*[\/\-]\s*|\s+)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/
  );
  if (!m) return '';

  const cityPart = m[1].trim();
  const ufPart = m[2].toUpperCase();

  if (cityPart.length < 3) return '';
  for (const bad of INVALID_CITY_WORDS) {
    if (cityPart.includes(bad)) return '';
  }

  return `${cityPart}/${ufPart}`;
}

export function sanitizeCrlvBrandModel(rawBrand?: string): string {
  if (!rawBrand) return '';
  return rawBrand
    .replace(/^CAMPO_(?:ABAIXO|DIREITA|BOX)\[[^\]]+\]:\s*/i, '')
    .replace(
      /(?:\s+|(?<=[0-9A-Z]))(?:ESP\s*\/?\s*CAMINH[ÃA]O|CARGA\s*\/?\s*CAMINH[ÃA]O|ESP[ÉE]CIE(?:\s*\/?\s*TIPO)?|ESP)$/i,
      ''
    )
    .trim();
}

/**
 * Deterministic parser for Brazilian CNH (Carteira Nacional de Habilitação - Digital or Printed)
 */
export function parseCnhFromText(rawText: string, fileName?: string): Partial<Driver> {
  if (!rawText || !rawText.trim()) {
    if (fileName) {
      const fileData = extractDriverDataFromFileName(fileName);
      return {
        name: fileData.name,
        cnhExpiration: fileData.expirationDate,
        currentPoints: 0,
        status: 'REGULAR',
      };
    }
    return {};
  }

  const text = rawText.replace(/\r/g, '\n');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const result: Partial<Driver> = {
    currentPoints: 0,
    status: 'REGULAR',
  };

  // 0. Extract from 3-line MRZ zone if present in Brazilian CNH Digital
  // Line 1: IDBRA<REGISTRO><<<<<...
  // Line 2: <YYMMDD><SEX><YYMMDD>BRA<CPF_DIGITS><<<<...
  // Line 3: <SURNAME><<GIVEN<NAMES<<<<...
  const mrzLine3 = text.match(/\b([A-Z]{2,})<<([A-Z<]{2,})<{2,}/);
  if (mrzLine3) {
    const surname = mrzLine3[1].replace(/<+/g, ' ').trim();
    const given = mrzLine3[2].replace(/<+/g, ' ').trim();
    const candName = sanitizeDriverName(`${given} ${surname}`);
    if (candName) {
      result.name = candName;
    }
  }

  const mrzLine2 = text.match(
    /\b(\d{2})(\d{2})(\d{2})[A-Z<](\d{2})(\d{2})(\d{2})[A-Z0-9<]*?(\d{11})\b/
  );
  if (mrzLine2) {
    // Birth date: YY MM DD
    const bYY = parseInt(mrzLine2[1], 10);
    const bMM = mrzLine2[2];
    const bDD = mrzLine2[3];
    const fullBYY = bYY >= 25 ? 1900 + bYY : 2000 + bYY;
    result.birthDate = `${fullBYY}-${bMM}-${bDD}`;

    // Expiration date: YY MM DD
    const eYY = 2000 + parseInt(mrzLine2[4], 10);
    const eMM = mrzLine2[5];
    const eDD = mrzLine2[6];
    result.cnhExpiration = `${eYY}-${eMM}-${eDD}`;

    // CPF from MRZ
    const mrzCpf = mrzLine2[7];
    if (isValidBrazilianCpf(mrzCpf)) {
      result.cpf = formatCpfString(mrzCpf);
    }
  }

  const mrzLine1 = text.match(/\bI[D<R]BRA(\d{9,11})\b/i);
  if (mrzLine1) {
    result.cnhNumber = mrzLine1[1];
  }

  // 1. Extract CNH Registration Number (Campo 4d Nº REGISTRO ou 5. Nº CNH)
  if (!result.cnhNumber) {
    const boxRegMatches = Array.from(
      text.matchAll(
        /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:(?:4d\.?\s*)?N[º°o.]?\s*(?:DE\s*)?REGISTRO|4d|5\.\s*N[º°o.]?\s*CNH|N[º°o.]?\s*CNH|REGISTRO)\]:\s*(\d{9,11})/gi
      )
    );
    if (boxRegMatches.length > 0) {
      result.cnhNumber = boxRegMatches[0][1];
    }
  }

  if (!result.cnhNumber) {
    const regLabelMatch = text.match(
      /(?:4d\.?\s*)?(?:N[º°o.]?\s*(?:DE\s*)?REGISTRO|REGISTRO\s*CNH|5\.\s*N[º°o.]?\s*CNH|REGISTRO)\s*[:\-]?\s*(\d{9,11})\b/i
    );
    if (regLabelMatch) {
      result.cnhNumber = regLabelMatch[1];
    } else {
      const allLongNumbers = text.match(/\b\d{9,11}\b/g) || [];
      const elevenNonCpf = allLongNumbers.find(
        (n) => n.length === 11 && !isValidBrazilianCpf(n)
      );
      const anyNonCpf = allLongNumbers.find(
        (n) => !isValidBrazilianCpf(n)
      );
      if (elevenNonCpf || anyNonCpf) {
        result.cnhNumber = elevenNonCpf || anyNonCpf;
      }
    }
  }

  // 2. Extract CPF (checksum validated or formatted)
  if (!result.cpf) {
    // Spatial box match
    const boxCpf = text.match(
      /CAMPO_(?:ABAIXO|DIREITA|BOX)\[[^\]]*CPF[^\]]*\]:\s*([0-9.\-\s]{11,18})/i
    );
    if (boxCpf) {
      const cleaned = boxCpf[1].replace(/\D/g, '');
      if (cleaned.length === 11) {
        result.cpf = formatCpfString(cleaned);
      }
    }
  }

  if (!result.cpf) {
    const inlineCpf = text.match(
      /(?:(?:2|3)\.?\s*)?CPF(?:\s*\/?\s*(?:CNPJ|RG|DOC))?\s*[:\-]?\s*([0-9.\-\s]{11,18})/i
    );
    if (inlineCpf) {
      const cleaned = inlineCpf[1].replace(/\D/g, '');
      if (cleaned.length === 11) {
        result.cpf = formatCpfString(cleaned);
      }
    }
  }

  if (!result.cpf) {
    // Formatted CPF in text (with or without spaces around punctuation)
    const formattedCpfMatches =
      text.match(/\b\d{3}\s*[.]\s*\d{3}\s*[.]\s*\d{3}\s*[-]\s*\d{2}\b/g) || [];
    for (const m of formattedCpfMatches) {
      const digits = m.replace(/\D/g, '');
      if (digits.length === 11) {
        result.cpf = formatCpfString(digits);
        break;
      }
    }
  }

  if (!result.cpf) {
    // Check all 11-digit numbers in the document
    const elevenDigitMatches = text.match(/\b\d{11}\b/g) || [];
    const validCpf = elevenDigitMatches.find(
      (num) => num !== result.cnhNumber && isValidBrazilianCpf(num)
    );
    if (validCpf) {
      result.cpf = formatCpfString(validCpf);
    } else {
      const anyEleven = elevenDigitMatches.find(
        (num) => num !== result.cnhNumber && num !== result.cnhSecurityCode
      );
      if (anyEleven) {
        result.cpf = formatCpfString(anyEleven);
      }
    }
  }

  // 3. Extract Driver Name
  if (!result.name) {
    // Strategy 0: Spatial box matches
    const boxNameMatches = Array.from(
      text.matchAll(
        /CAMPO_(?:ABAIXO|DIREITA|BOX)\[[^\]]*(?:SOBRENOME|NOME|CONDUTOR)[^\]]*\]:\s*([^\n\r]+)/gi
      )
    );
    for (const m of boxNameMatches) {
      const sanitized = sanitizeDriverName(m[1]);
      if (sanitized) {
        result.name = sanitized;
        break;
      }
    }
  }

  // Strategy A: Inline label (supports "1. SOBRENOME, NOME: SILVA, MARCOS")
  if (!result.name) {
    const inlineNameMatch = text.match(
      /(?:1\.?\s*SOBRENOME(?:\s*[\/,]\s*|\s*E\s*)?NOME|1\.?\s*SOBRENOME|2\s*e\s*1\s*NOME|2\.?\s*NOME|1\.\s*NOME|NOME\s*E\s*SOBRENOME|NOME\s*CIVIL|NOME\s*DO\s*CONDUTOR|CONDUTOR|NOME)[^\S\r\n]*[:\-]?[^\S\r\n]*([A-ZÀ-Ÿ,/'.-]+(?:[^\S\r\n]+[A-ZÀ-Ÿ,/'.-]+)*)/i
    );
    if (inlineNameMatch) {
      const sanitized = sanitizeDriverName(inlineNameMatch[1]);
      if (sanitized) {
        result.name = sanitized;
      }
    }
  }

  // Strategy B: Line following "NOME" / "1. SOBRENOME, NOME" label
  if (!result.name) {
    for (let i = 0; i < lines.length; i++) {
      if (
        /(?:1\.?\s*SOBRENOME|1\.\s*NOME|2\s*e\s*1\s*NOME|2\.\s*NOME|NOME\s*CIVIL|NOME\s*E\s*SOBRENOME|^NOME$)/i.test(
          lines[i]
        )
      ) {
        const cleanedSameLine = sanitizeDriverName(lines[i]);
        if (cleanedSameLine) {
          result.name = cleanedSameLine;
          break;
        }
        for (let j = i + 1; j <= Math.min(i + 4, lines.length - 1); j++) {
          const cand = sanitizeDriverName(lines[j]);
          if (cand) {
            result.name = cand;
            break;
          }
        }
        if (result.name) break;
      }
    }
  }

  // Strategy C: Fallback from filename (e.g. "CNH HelioSantos - 13.10.2031.pdf")
  if (!result.name && fileName) {
    const fileData = extractDriverDataFromFileName(fileName);
    if (fileData.name) {
      result.name = fileData.name;
    }
  }

  // Strategy D: Fallback scanning lines for valid Brazilian person name
  if (!result.name) {
    for (const line of lines) {
      const cand = sanitizeDriverName(line);
      if (cand) {
        result.name = cand;
        break;
      }
    }
  }

  // 4. Extract CNH Category
  const boxCatMatches = Array.from(
    text.matchAll(
      /CAMPO_(?:ABAIXO|DIREITA|BOX)\[[^\]]*(?:CAT\.?\s*HAB\.?|CATEGORIA)[^\]]*\]:\s*\b(AE|AD|AC|AB|[A-E])\b/gi
    )
  );
  if (boxCatMatches.length > 0) {
    result.cnhCategory = boxCatMatches[0][1].toUpperCase() as CnhCategory;
  } else {
    const catLabelMatch = text.match(
      /(?:9\.?\s*)?(?:CAT\.?\s*HAB\.?|CATEGORIA)\s*[:\-]?\s*\b(AE|AD|AC|AB|[A-E])\b/i
    );
    if (catLabelMatch) {
      result.cnhCategory = catLabelMatch[1].toUpperCase() as CnhCategory;
    } else {
      for (let i = 0; i < lines.length; i++) {
        if (/CAT\.?\s*HAB|CATEGORIA/i.test(lines[i])) {
          const windowText = lines.slice(i, i + 4).join(' ');
          const m = windowText.match(/\b(AE|AD|AC|AB|[A-E])\b/);
          if (m) {
            result.cnhCategory = m[1].toUpperCase() as CnhCategory;
            break;
          }
        }
      }
    }
  }

  // 5. Extract Expiration (Validade) and Birth Date (Data de Nascimento)
  if (!result.cnhExpiration) {
    const boxVal = text.match(
      /CAMPO_(?:ABAIXO|DIREITA|BOX)\[[^\]]*(?:VALIDADE|4b)[^\]]*\]:\s*([0-9.\-\/]+)/i
    );
    if (boxVal) {
      result.cnhExpiration = normalizeDateToIso(boxVal[1]);
    }
  }

  if (!result.cnhExpiration) {
    const valLabelMatch = text.match(
      /(?:4b\.?\s*)?VALIDADE\s*[:\-]?\s*(\d{2}[.\/\-]\d{2}[.\/\-]\d{4}|\d{4}-\d{2}-\d{2})/i
    );
    if (valLabelMatch) {
      result.cnhExpiration = normalizeDateToIso(valLabelMatch[1]);
    }
  }

  if (!result.birthDate) {
    const boxBirth = text.match(
      /CAMPO_(?:ABAIXO|DIREITA|BOX)\[[^\]]*(?:NASCIMENTO|NASC|DATA\s*DE\s*NASCIMENTO|[23]\.\s*DATA)[^\]]*\]:\s*([0-9.\-\/]+)/i
    );
    if (boxBirth) {
      result.birthDate = normalizeDateToIso(boxBirth[1]);
    }
  }

  if (!result.birthDate) {
    const birthLabelMatch = text.match(
      /(?:(?:2|3)\.?\s*)?(?:DATA\s*(?:DE\s*)?NASC(?:IMENTO)?|NASCIMENTO)\s*[:\-]?\s*(\d{2}[.\/\-]\d{2}[.\/\-]\d{4}|\d{4}-\d{2}-\d{2})/i
    );
    if (birthLabelMatch) {
      result.birthDate = normalizeDateToIso(birthLabelMatch[1]);
    }
  }

  // Candidate dates in text (DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY)
  const allBrDates = text.match(/\b\d{2}[.\/-]\d{2}[.\/-]\d{4}\b/g) || [];
  const parsedDates = allBrDates
    .map((d) => {
      const iso = normalizeDateToIso(d);
      const year = parseInt(iso.slice(0, 4), 10);
      return { raw: d, iso, year };
    })
    .filter((d) => d.year >= 1930 && d.year <= 2045);

  if (!result.birthDate && parsedDates.length > 0) {
    const birthCandidate = parsedDates.find((d) => d.year >= 1935 && d.year <= 2008);
    if (birthCandidate) {
      result.birthDate = birthCandidate.iso;
    }
  }

  if (!result.cnhExpiration && parsedDates.length > 0) {
    const sortedByFuture = [...parsedDates].sort((a, b) => b.iso.localeCompare(a.iso));
    if (sortedByFuture[0] && sortedByFuture[0].year >= 2024) {
      result.cnhExpiration = sortedByFuture[0].iso;
    }
  }

  // Fallback from filename if expiration date wasn't found in text
  if (!result.cnhExpiration && fileName) {
    const fileData = extractDriverDataFromFileName(fileName);
    if (fileData.expirationDate) {
      result.cnhExpiration = fileData.expirationDate;
    }
  }

  // 6. Points / Status
  const pointsMatch = text.match(/PONTOS\s*[:\-]?\s*(\d{1,3})\b/i);
  if (pointsMatch) {
    const pts = parseInt(pointsMatch[1], 10);
    result.currentPoints = pts;
    result.status = pts >= 40 ? 'SUSPENSA' : pts >= 20 ? 'ALERTA' : 'REGULAR';
  }

  // 7. Phone (only if explicitly labeled with tel/cel/fone or in strict (DD) 9XXXX-XXXX format)
  const phoneLabelMatch = text.match(
    /(?:TEL(?:EFONE)?|CEL(?:ULAR)?|FONE|CONTATO|WHATSAPP|WA)\s*[:\-]?\s*(\(?[1-9]{2}\)?\s*9?\d{4}[-\s]?\d{4})\b/i
  );
  if (phoneLabelMatch) {
    const rawDigits = phoneLabelMatch[1].replace(/\D/g, '');
    if (rawDigits !== result.cnhNumber && rawDigits !== result.cpf?.replace(/\D/g, '')) {
      result.phone = phoneLabelMatch[1].trim();
    }
  } else {
    const dddPhoneMatch = text.match(/\b\([1-9]{2}\)\s*9\d{4}[-\s]?\d{4}\b/);
    if (dddPhoneMatch) {
      result.phone = dddPhoneMatch[0].trim();
    }
  }

  // 8. Filiação (Mãe e Pai)
  const filiacaoMatch = text.match(/FILIA[ÇC][ÃA]O\s*[:\-]?\s*([^\n\r]+)(?:[\n\r]+([^\n\r]+))?/i);
  if (filiacaoMatch) {
    const motherCand = sanitizeDriverName(filiacaoMatch[1]);
    if (motherCand && motherCand !== result.name) {
      result.motherName = motherCand;
    }
    if (filiacaoMatch[2]) {
      const fatherCand = sanitizeDriverName(filiacaoMatch[2]);
      if (fatherCand && fatherCand !== result.name && fatherCand !== result.motherName) {
        result.fatherName = fatherCand;
      }
    }
  }

  // 9. RENACH
  const renachMatch = text.match(/RENACH\s*[:\-]?\s*([A-Z]{2}\s*\d{9}|\b[A-Z]{2}\d{9}\b)/i);
  if (renachMatch) {
    result.renachNumber = renachMatch[1].replace(/\s+/g, '').toUpperCase();
  }

  // 10. Código de Segurança
  const secCodeMatch = text.match(/C[ÓO]D(?:IGO)?\.?\s*(?:DE\s*)?SEGURAN[ÇC]A\s*[:\-]?\s*(\d{10,11})/i);
  if (secCodeMatch) {
    result.cnhSecurityCode = secCodeMatch[1].trim();
  }

  // 11. Data de Emissão e 1ª Habilitação
  const issueMatch = text.match(/(?:DATA\s*(?:DE\s*)?EMISS[ÃA]O|EMISS[ÃA]O)\s*[:\-]?\s*(\d{2}[.\/\-]\d{2}[.\/\-]\d{4})/i);
  if (issueMatch) {
    result.cnhIssueDate = normalizeDateToIso(issueMatch[1]);
  }

  const firstHabMatch = text.match(/(?:1[ªA]?\s*HABILITA[ÇC][ÃA]O|PRIMEIRA\s*HABILITA[ÇC][ÃA]O)\s*[:\-]?\s*(\d{2}[.\/\-]\d{2}[.\/\-]\d{4})/i);
  if (firstHabMatch) {
    result.firstLicenseDate = normalizeDateToIso(firstHabMatch[1]);
  }

  // 12. Veículo / Placa vinculada detectada no documento ou no nome do arquivo
  const plateMatch = (text + ' ' + (fileName || '')).match(/\b([A-Z]{3}[- ]?[0-9][0-9A-Z][0-9]{2})\b/i);
  if (plateMatch) {
    const rawPlate = plateMatch[1].replace(/[- ]/g, '').toUpperCase();
    result.assignedVehiclePlate = rawPlate;
  }

  return result;
}

/**
 * Deterministic parser for Brazilian CRLV-e (Certificado de Registro e Licenciamento de Veículo)
 */
export function parseCrlvFromText(rawText: string): Partial<Vehicle> {
  if (!rawText || !rawText.trim()) return {};

  const text = rawText.replace(/\r/g, '\n');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const result: Partial<Vehicle> = {
    licensingStatus: 'EM_DIA',
    activeFinesCount: 0,
    totalFinesValue: 0,
  };

  // 1. Plate (Placa Mercosul ou Padrão Cinza)
  const boxPlate = text.match(/CAMPO_(?:ABAIXO|DIREITA|BOX)\[PLACA(?:\s*\/?\s*UF)?\]:\s*([A-Z]{3}[-\s]?[0-9][A-Z0-9][0-9]{2})/i);
  const plateLabelMatch = text.match(
    /PLACA(?:\s*\/?\s*UF)?\s*[:\-]?\s*([A-Z]{3}[-\s]?[0-9][A-Z0-9][0-9]{2})\b/i
  );
  if (boxPlate) {
    result.plate = boxPlate[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
  } else if (plateLabelMatch) {
    result.plate = plateLabelMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
  } else {
    const plates = text.match(/\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/g) || [];
    if (plates.length > 0) {
      result.plate = plates[0].toUpperCase();
    }
  }

  // 2. CPF / CNPJ do Proprietário
  const boxCpfCnpj = text.match(/CAMPO_(?:ABAIXO|DIREITA|BOX)\[CPF\s*\/?\s*CNPJ\]:\s*([0-9.\-\/]{11,18})/i);
  if (boxCpfCnpj) {
    result.ownerCnpjCpf = boxCpfCnpj[1].trim();
  } else {
    const cnpjMatch = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
    const cpfMatch = text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
    if (cnpjMatch) {
      result.ownerCnpjCpf = cnpjMatch[0];
    } else if (cpfMatch) {
      result.ownerCnpjCpf = cpfMatch[0];
    } else {
      const raw14 = text.match(/\b\d{14}\b/);
      if (raw14) {
        result.ownerCnpjCpf = formatCnpjString(raw14[0]);
      }
    }
  }
  const ownerCpfDigits = (result.ownerCnpjCpf || '').replace(/\D/g, '');

  // 3. RENAVAM (9 a 11 dígitos)
  const boxRenavam = text.match(/CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:C[ÓO]DIGO\s*)?RENAVAM\]:\s*(\d{9,11})/i);
  const renLabelMatch = text.match(
    /(?:C[ÓO]DIGO\s*)?RENAVAM\s*[:\-]?\s*\b(\d{9,11})\b/i
  );
  if (boxRenavam && boxRenavam[1] !== ownerCpfDigits) {
    result.renavam = boxRenavam[1];
  } else if (renLabelMatch && renLabelMatch[1] !== ownerCpfDigits) {
    result.renavam = renLabelMatch[1];
  } else {
    for (let i = 0; i < lines.length; i++) {
      if (/RENAVAM/i.test(lines[i])) {
        const windowStr = lines.slice(i, i + 4).join(' ');
        const matches = windowStr.match(/\b\d{9,11}\b/g) || [];
        const validRen =
          matches.find((m) => m !== ownerCpfDigits && !isValidBrazilianCpf(m)) || matches[0];
        if (validRen) {
          result.renavam = validRen;
          break;
        }
      }
    }
  }

  // 4. Chassi (17 caracteres)
  const boxChassis = text.match(/CAMPO_(?:ABAIXO|DIREITA|BOX)\[CHASSI\]:\s*([A-HJ-NPR-Z0-9]{17})/i);
  const chasLabelMatch = text.match(/CHASSI\s*[:\-]?\s*\b([A-HJ-NPR-Z0-9]{17})\b/i);
  if (boxChassis) {
    result.chassis = boxChassis[1].toUpperCase();
  } else if (chasLabelMatch) {
    result.chassis = chasLabelMatch[1].toUpperCase();
  } else {
    const vinMatches = text.match(/\b[89A-Z][A-Z0-9]{16}\b/g) || [];
    const validVin = vinMatches.find((v) => /\d/.test(v) && /[A-Z]/.test(v) && !/^\d+$/.test(v));
    if (validVin) {
      result.chassis = validVin.toUpperCase();
    }
  }

  // 5. Ano Fab / Mod
  const boxFab = text.match(/CAMPO_(?:ABAIXO|DIREITA|BOX)\[ANO\s*FABRICA[ÇC][ÃA]O\]:\s*((?:19|20)\d{2})/i);
  const boxMod = text.match(/CAMPO_(?:ABAIXO|DIREITA|BOX)\[ANO\s*MODELO\]:\s*((?:19|20)\d{2})/i);
  const yearSlashMatch = text.match(/\b((?:19|20)\d{2})\s*[\/\-]\s*((?:19|20)\d{2})\b/);
  if (boxFab && boxMod) {
    result.yearFabMod = `${boxFab[1]}/${boxMod[1]}`;
  } else if (yearSlashMatch) {
    result.yearFabMod = `${yearSlashMatch[1]}/${yearSlashMatch[2]}`;
  }

  // 6. Marca / Modelo
  const boxBrand = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[MARCA\s*\/?\s*MODELO(?:\s*\/?\s*VERS[ÃA]O)?\]:\s*([^\n\r]+)/i
  );
  const brandLabelMatch = text.match(
    /MARCA\s*\/?\s*MODELO(?:\s*\/?\s*VERS[ÃA]O)?\s*[:\-]\s*([^\n\r]{4,70})/i
  );
  if (boxBrand) {
    result.brandModel = sanitizeCrlvBrandModel(boxBrand[1]);
  } else if (brandLabelMatch && !/ESP[ÉE]CIE|PLACA|CHASSI/i.test(brandLabelMatch[1])) {
    result.brandModel = sanitizeCrlvBrandModel(brandLabelMatch[1]);
  }

  // 7. Combustível
  if (/DIESEL\s*S\s*10/i.test(text)) {
    result.fuel = 'Diesel S10';
  } else if (/DIESEL/i.test(text)) {
    result.fuel = 'Diesel';
  } else if (/ALCOOL\s*\/\s*GASOLINA|ÁLCOOL\s*\/\s*GASOLINA|ETANOL\s*\/\s*GASOLINA|FLEX/i.test(text)) {
    result.fuel = 'Flex';
  } else if (/GASOLINA/i.test(text)) {
    result.fuel = 'Gasolina';
  } else if (/EL[ÉE]TRICO/i.test(text)) {
    result.fuel = 'Elétrico';
  }

  // 8. Cor
  const colorMatch = text.match(
    /\b(BRANCA|BRANCO|PRATA|PRETA|PRETO|CINZA|AZUL|VERMELHA|VERMELHO|AMARELA|AMARELO|VERDE|BEGE)\b/i
  );
  if (colorMatch) {
    const c = colorMatch[1].toUpperCase();
    result.color =
      c === 'BRANCA' || c === 'BRANCO'
        ? 'Branco'
        : c === 'PRETA' || c === 'PRETO'
        ? 'Preto'
        : c === 'VERMELHA' || c === 'VERMELHO'
        ? 'Vermelho'
        : c === 'AMARELA' || c === 'AMARELO'
        ? 'Amarelo'
        : c.charAt(0) + c.slice(1).toLowerCase();
  }

  // 9. Tipo de Veículo
  if (/BITRUCK|BI[-\s]TRUCK/i.test(text)) {
    result.vehicleType = 'Bitruck';
  } else if (/TRUCK/i.test(text)) {
    result.vehicleType = 'Truck';
  } else if (/TOCO/i.test(text)) {
    result.vehicleType = 'Toco';
  } else if (/3\/4|TR[ÊE]S\s*QUARTOS|VUC/i.test(text)) {
    result.vehicleType = '3/4';
  } else if (/VAN|FURG[ÃA]O/i.test(text)) {
    result.vehicleType = 'Van';
  } else if (/CAVALO\s*MEC[ÂA]NICO|TRATOR\s*CAMINH[ÃA]O|CAMINH[ÃA]O\s*TRATOR/i.test(text)) {
    result.vehicleType = 'Cavalo Mecânico';
  } else if (/SEMI[-\s]*REBOQUE|REBOQUE|CARRETA/i.test(text)) {
    result.vehicleType = 'Carreta';
  } else if (/CAMINH[ÃA]O/i.test(text)) {
    result.vehicleType = 'Caminhão';
  } else if (/CAMINHONETE|CAMIONETA|UTILIT[ÁA]RIO|PICK[-\s]?UP/i.test(text)) {
    result.vehicleType = 'Utilitário';
  } else if (/[ÔO]NIBUS|MICRO[-\s]*[ÔO]NIBUS/i.test(text)) {
    result.vehicleType = 'Ônibus';
  } else if (/AUTOM[ÓO]VEL|PASSAGEIRO/i.test(text)) {
    result.vehicleType = 'Automóvel';
  }

  // 10. Proprietário
  const boxOwnerMatches = Array.from(
    text.matchAll(/CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:NOME\s*DO\s*PROPRIET[ÁA]RIO|PROPRIET[ÁA]RIO|NOME)\]:\s*([^\n\r]+)/gi)
  );
  for (const m of boxOwnerMatches) {
    const cand = m[1].trim();
    if (isValidCrlvOwnerName(cand)) {
      result.ownerName = cand;
      break;
    }
  }

  if (!result.ownerName) {
    for (const line of lines) {
      const cleanLine = line.replace(/^CAMPO_[^\]]+\]:\s*/i, '').trim();
      if (
        /\b(?:LTDA|S\/A|S\.A\.?|EIRELI|ME\b|EPP\b|TRANSPORTES|TRANSPORTADORA|LOG[ÍI]STICA|COM[ÉE]RCIO|IND[ÚU]STRIA|SERVI[ÇC]OS|LOCA[ÇC][ÃA]O|LOCADORA|DISTRIBUIDORA|CONSTRUTORA|ENGENHARIA|AGROPECU[ÁA]RIA|EMPREENDIMENTOS|PARTICIPA[ÇC][ÕO]ES)\b/i.test(
          cleanLine
        ) &&
        isValidCrlvOwnerName(cleanLine)
      ) {
        result.ownerName = cleanLine
          .replace(/^(?:NOME\s*DO\s*PROPRIET[ÁA]RIO|PROPRIET[ÁA]RIO|NOME)\s*[:\-]?\s*/i, '')
          .trim();
        break;
      }
    }
  }

  // 11. Município / UF
  const boxLocalMatches = Array.from(
    text.matchAll(/CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:LOCAL|MUNIC[ÍI]PIO|CIDADE)\]:\s*([^\n\r]+)/gi)
  );
  for (const m of boxLocalMatches) {
    const sanitized = sanitizeCrlvCityUf(m[1]);
    if (sanitized) {
      result.cityUf = sanitized;
      break;
    }
  }

  if (!result.cityUf) {
    const localWithDateMatches = Array.from(
      text.matchAll(
        /\b([A-ZÀ-Ÿ][A-ZÀ-Ÿ\s'.-]{2,35}?)(?:\s*[\/\-]\s*|\s+)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s+\d{2}\/\d{2}\/\d{4}\b/g
      )
    );
    for (const m of localWithDateMatches) {
      const sanitized = sanitizeCrlvCityUf(`${m[1]}/${m[2]}`);
      if (sanitized) {
        result.cityUf = sanitized;
        break;
      }
    }
  }

  return result;
}

// Reserved words that must never be mistaken for a vehicle plate
const FORBIDDEN_PLATE_PREFIXES = new Set([
  'DER', 'PRF', 'CET', 'DSV', 'CTB', 'AIT', 'NOT', 'COD', 'CNH', 'REF', 'SER', 'REG', 'DOC',
  'PAG', 'SNE', 'VAL', 'DAT', 'ART', 'LEI', 'PAR', 'SEC', 'DEP', 'MIN', 'GOV', 'FED', 'ROD',
  'KM0', 'KM1', 'KM2', 'KM3', 'KM4', 'KM5', 'KM6', 'KM7', 'KM8', 'KM9', 'AUT', 'INF', 'BCO',
  'AG0', 'AG1', 'CC0', 'CC1', 'CEP', 'TEL', 'CPF', 'CNP', 'RAD', 'VEL', 'LIM', 'MED',
]);

function isValidBrazilianPlate(candidate?: string): boolean {
  if (!candidate) return false;
  const clean = candidate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 7) return false;
  // Mercosul (ABC1D23) or Traditional (ABC1234)
  if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(clean)) return false;
  const prefix = clean.slice(0, 3);
  if (FORBIDDEN_PLATE_PREFIXES.has(prefix)) return false;
  return true;
}

/**
 * Deterministic parser for Brazilian Traffic Fines (Auto de Infração de Trânsito / Notificação)
 * Reads notifications from SENATRAN, DETRAN (all states), PRF, DER, DNIT, PREFEITURA / CET, DSV.
 */
export function parseFineFromText(rawText: string, fileName?: string): Partial<TrafficFine> {
  if (!rawText || !rawText.trim()) return {};

  const text = rawText.replace(/\r/g, '\n');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const result: Partial<TrafficFine> = {
    status: 'PENDENTE',
  };

  // 1. Plate (Placa)
  // Check spatial label first
  const boxPlateMatches = Array.from(
    text.matchAll(
      /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:PLACA(?:\s*\/?\s*UF)?|PLACA\s*DO\s*VE[ÍI]CULO)\]:\s*([A-Z0-9\-\s]{7,10})/gi
    )
  );
  for (const m of boxPlateMatches) {
    const cand = m[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (isValidBrazilianPlate(cand)) {
      result.plate = cand;
      break;
    }
  }

  if (!result.plate) {
    const plateLabelMatch = text.match(
      /(?:PLACA(?:\s*DO\s*VE[ÍI]CULO|\s*\/?\s*UF)?|IDENTIFICA[ÇC][ÃA]O\s*DO\s*VE[ÍI]CULO)\s*[:\-]?\s*([A-Z]{3}[-\s]?[0-9][A-Z0-9][0-9]{2})\b/i
    );
    if (plateLabelMatch && isValidBrazilianPlate(plateLabelMatch[1])) {
      result.plate = plateLabelMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
  }

  if (!result.plate) {
    const allPlates = text.match(/\b[A-Z]{3}[-\s]?[0-9][A-Z0-9][0-9]{2}\b/g) || [];
    for (const p of allPlates) {
      if (isValidBrazilianPlate(p)) {
        result.plate = p.toUpperCase().replace(/[^A-Z0-9]/g, '');
        break;
      }
    }
  }

  // 2. AIT Number (Auto de Infração de Trânsito)
  // Priority A: Spatial box matching any field containing AUTO, AIT, NOTIFICACAO, AUTUACAO
  const boxAitMatches = Array.from(
    text.matchAll(
      /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:[^\n\r\]]*(?:AUTO|AIT|NOTIFICA[ÇC][ÃA]O|AUTUA[ÇC][ÃA]O)[^\n\r\]]*)\]:\s*([A-Z0-9.\-#\s]{4,24})/gi
    )
  );
  for (const m of boxAitMatches) {
    const cand = m[1].trim().toUpperCase().replace(/\s+/g, '');
    if (
      cand !== result.plate &&
      cand.length >= 5 &&
      cand.length <= 22 &&
      /\d{3,}/.test(cand) &&
      !/^(?:RENAVAM|CHASSI|PLACA|BRASIL|SENATRAN|DETRAN|VALOR|DATA|HORA|CODIGO)/.test(cand) &&
      !/^\d{2}[\/\-.]\d{2}[\/\-.]\d{4}$/.test(cand) &&
      !/^[567]\d{3}[-\s]?\d$/.test(cand)
    ) {
      result.aitNumber = cand;
      break;
    }
  }

  // Priority B: Explicit AIT labels in text
  if (!result.aitNumber) {
    const aitLabelMatch = text.match(
      /(?:AUTO\s*DE\s*INFRA[ÇC][ÃA]O(?:\s*DE\s*TR[ÂA]NSITO)?(?:\s*\(?AIT\)?)?|N[º°o.]?\s*(?:DO\s*)?(?:AUTO|AIT)(?:\s*DE\s*INFRA[ÇC][ÃA]O)?|NÚMERO\s*DO\s*AUTO(?:\s*DE\s*INFRA[ÇC][ÃA]O)?|IDENTIFICA[ÇC][ÃA]O\s*DO\s*AUTO(?:\s*DE\s*INFRA[ÇC][ÃA]O)?|NOTIFICA[ÇC][ÃA]O\s*(?:DE\s*AUTUA[ÇC][ÃA]O|DA\s*PENALIDADE|N[º°o.]?)|N[º°o.]?\s*DA\s*NOTIFICA[ÇC][ÃA]O|AIT\s*N[º°o.]?|N[º°o.]?\s*DO\s*AIT|\bAIT\b)\s*[:\-#]?\s*([A-Z0-9]{1,4}[\s.\-]?[A-Z0-9]{4,14}(?:-[0-9A-Z])?)/i
    );
    if (aitLabelMatch) {
      const cand = aitLabelMatch[1].trim().toUpperCase().replace(/\s+/g, '');
      if (
        cand !== result.plate &&
        cand.length >= 5 &&
        cand.length <= 22 &&
        /\d{3,}/.test(cand) &&
        !/^(?:RENAVAM|CHASSI|PLACA|BRASIL|SENATRAN|DETRAN|VALOR|DATA|HORA)/.test(cand) &&
        !/^\d{2}[\/\-.]\d{2}[\/\-.]\d{4}$/.test(cand)
      ) {
        result.aitNumber = cand;
      }
    }
  }

  // Priority C: Line following "AUTO DE INFRAÇÃO" or "AIT"
  if (!result.aitNumber) {
    for (let i = 0; i < lines.length; i++) {
      if (
        /(?:AUTO\s*DE\s*INFRA[ÇC][ÃA]O|N[º°o.]?\s*DO\s*AUTO|^AIT$|^AIT\s*[:\-#]|^AUTO\s*N[º°o.]?)/i.test(
          lines[i]
        )
      ) {
        for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
          const cand = lines[j].trim().toUpperCase().replace(/\s+/g, '');
          if (
            cand !== result.plate &&
            cand.length >= 5 &&
            cand.length <= 20 &&
            /\d{3,}/.test(cand) &&
            !/^(?:RENAVAM|CHASSI|PLACA|DATA|HORA|LOCAL|VALOR|MUNICIP|ESTADO|CODIGO)/.test(cand) &&
            !/^\d{2}[\/\-.]\d{2}[\/\-.]\d{4}$/.test(cand)
          ) {
            result.aitNumber = cand;
            break;
          }
        }
        if (result.aitNumber) break;
      }
    }
  }

  // Priority D: Known Brazilian AIT formats
  if (!result.aitNumber) {
    const knownAitMatch = text.match(
      /\b([0-9][A-Z][0-9]{6}-[0-9A-Z]|[A-Z][0-9]{7,8}-[0-9A-Z]|[TSEB]\d{8,9}|[A-Z]{1,3}\d{6,10}(?:-[0-9A-Z])?|\d{7,10}-[0-9A-Z])\b/
    );
    if (
      knownAitMatch &&
      knownAitMatch[1] !== result.plate &&
      !/^\d{2}\/\d{2}\/\d{4}$/.test(knownAitMatch[1])
    ) {
      result.aitNumber = knownAitMatch[1].toUpperCase();
    }
  }

  // Priority E: Filename match
  if (!result.aitNumber && fileName) {
    const fnMatch = fileName.match(/([A-Z0-9]{1,4}[_\-]?\d{5,10}(?:-[0-9A-Z])?)/i);
    if (fnMatch && fnMatch[1].toUpperCase() !== result.plate) {
      result.aitNumber = fnMatch[1].toUpperCase().replace(/_/g, '-');
    }
  }

  // 3. CTB Infraction Code (Código CTB)
  const boxCode = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:C[ÓO]DIGO\s*(?:DA\s*)?INFRA[ÇC][ÃA]O(?:\s*\/?\s*DESDOBRAMENTO)?|C[ÓO]D\.?\s*INFRA[ÇC][ÃA]O|ENQUADRAMENTO|C[ÓO]DIGO\s*CTB)\]:\s*([567]\d{2,3}[-\s.]?\d{1,2})/i
  );
  let rawCode = boxCode ? boxCode[1] : '';

  if (!rawCode) {
    const codeLabelMatch = text.match(
      /(?:C[ÓO]DIGO\s*(?:DA\s*)?INFRA[ÇC][ÃA]O|ENQUADRAMENTO|C[ÓO]D\.?\s*INFRA[ÇC][ÃA]O|C[ÓO]DIGO\s*CTB)\s*[:\-]?\s*([567]\d{2,3}[-\s.]?\d{1,2})\b/i
    );
    if (codeLabelMatch) rawCode = codeLabelMatch[1];
  }

  if (!rawCode) {
    const anyCodeMatch = text.match(/\b([567]\d{3}[-\s]?\d|[567]\d{2}[-\s]?\d{2})\b/);
    if (anyCodeMatch) rawCode = anyCodeMatch[1];
  }

  if (rawCode) {
    const digits = rawCode.replace(/\D/g, '');
    if (digits.length === 5) {
      result.infractionCode = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else {
      result.infractionCode = rawCode.trim();
    }
  }

  const matchedCtb = result.infractionCode
    ? COMMON_CTB_CODES.find((c) => c.code === result.infractionCode)
    : undefined;

  // 4. NIC / Multa Dobrada Check
  const isNic =
    result.infractionCode === '5002-0' ||
    /N[ÃA]O\s*INDICA[ÇC][ÃA]O\s*DE\s*CONDUTOR|MULTA\s*NIC|ART\.?\s*257\s*§\s*8/i.test(text);

  result.isDoubledFine = isNic;
  result.isNicFine = isNic;
  result.multiplierFactor = isNic ? 2 : 1;

  // 5. Monetary Amounts
  const boxValor = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:VALOR\s*(?:DA\s*MULTA|INTEGRAL|ORIGINAL|DO\s*AUTO|A\s*PAGAR|TOTAL)|VALOR\s*\(R\$\))\]:\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2})/i
  );
  if (boxValor) {
    const val = parseFloat(boxValor[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      result.fineAmount = val;
    }
  }

  if (!result.fineAmount) {
    const valorMultaMatch = text.match(
      /(?:VALOR\s*(?:DA\s*MULTA|INTEGRAL|DO\s*AUTO|ORIGINAL|A\s*PAGAR|TOTAL)|VALOR\s*\(R\$\))\s*[:\-]?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2})/i
    );
    if (valorMultaMatch) {
      const val = parseFloat(valorMultaMatch[1].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(val) && val > 0) {
        result.fineAmount = val;
      }
    }
  }

  // Check discount in document (SNE 20% or 40%)
  const boxDiscount = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:VALOR\s*COM\s*DESCONTO|VALOR\s*SNE)\]:\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2})/i
  );
  if (boxDiscount) {
    const dVal = parseFloat(boxDiscount[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(dVal) && dVal > 0) {
      result.discountAmount = dVal;
    }
  }

  if (!result.fineAmount && matchedCtb) {
    result.fineAmount = isNic ? Number((matchedCtb.value * 2).toFixed(2)) : matchedCtb.value;
  }

  if (result.fineAmount) {
    result.originalAmount = isNic
      ? Number((result.fineAmount / 2).toFixed(2))
      : result.fineAmount;
    if (!result.discountAmount) {
      result.discountAmount = Number((result.fineAmount * 0.8).toFixed(2));
    }
  }

  // 6. Infraction Description
  const boxDesc = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:DESCRI[ÇC][ÃA]O(?:\s*DA\s*INFRA[ÇC][ÃA]O)?|TIPIFICA[ÇC][ÃA]O(?:\s*RESUMIDA)?|INFRA[ÇC][ÃA]O)\]:\s*([^\n\r]{6,200})/i
  );
  if (boxDesc) {
    result.infractionDescription = boxDesc[1].trim();
  } else {
    const descMatch = text.match(
      /(?:DESCRI[ÇC][ÃA]O(?:\s*DA\s*INFRA[ÇC][ÃA]O)?|TIPIFICA[ÇC][ÃA]O(?:\s*RESUMIDA)?)\s*[:\-]?\s*([^\n\r]{10,220})/i
    );
    if (descMatch) {
      result.infractionDescription = descMatch[1].trim();
    } else if (matchedCtb) {
      result.infractionDescription = matchedCtb.desc;
    }
  }

  // 7. Severity & Points
  if (/GRAV[ÍI]SSIMA/i.test(text)) {
    result.severity = 'GRAVISSIMA';
    result.points = isNic ? 0 : 7;
  } else if (/\bGRAVE\b/i.test(text)) {
    result.severity = 'GRAVE';
    result.points = isNic ? 0 : 5;
  } else if (/M[ÉE]DIA/i.test(text)) {
    result.severity = 'MEDIA';
    result.points = isNic ? 0 : 4;
  } else if (/\bLEVE\b/i.test(text)) {
    result.severity = 'LEVE';
    result.points = isNic ? 0 : 3;
  } else if (matchedCtb) {
    result.severity = matchedCtb.severity as FineSeverity;
    result.points = isNic ? 0 : matchedCtb.points;
  }

  // 8. Infraction Date & Time
  let extractedDate = '';
  let extractedTime = '';

  // Spatial search for Date
  const boxDate = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:DATA\s*(?:E\s*HORA\s*)?(?:DA\s*INFRA[ÇC][ÃA]O|DO\s*COMETIMENTO)?|DATA\s*INFRA[ÇC][ÃA]O|DATA\s*\/?\s*HORA|DATA|COMETIMENTO)\]:\s*(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})(?:\s*(?:[ÀA]S|\s+|-)\s*(\d{2}[:hH]\d{2}(?::\d{2})?))?/i
  );
  if (boxDate) {
    extractedDate = brDateToIso(boxDate[1]);
    if (boxDate[2]) extractedTime = boxDate[2].replace(/[hH]/, ':').slice(0, 5);
  }

  // Inline search for Date
  if (!extractedDate) {
    const infDateMatch = text.match(
      /(?:DATA(?:\s*(?:E\s*HORA|\/?\s*HORA))?\s*(?:DA\s*INFRA[ÇC][ÃA]O|DO\s*COMETIMENTO)?|DATA\s*INFRA[ÇC][ÃA]O|COMETIMENTO)\s*[:\-]?\s*(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})(?:\s*(?:[ÀA]S|\s+|-)?\s*(\d{2}[:hH]\d{2}(?::\d{2})?))?/i
    );
    if (infDateMatch) {
      extractedDate = brDateToIso(infDateMatch[1]);
      if (infDateMatch[2]) extractedTime = infDateMatch[2].replace(/[hH]/, ':').slice(0, 5);
    }
  }

  // Any date in document if still missing
  if (!extractedDate) {
    const anyDateMatch = text.match(/\b(\d{2}[\/\-.]\d{2}[\/\-.]20\d{2})\b/);
    if (anyDateMatch) {
      extractedDate = brDateToIso(anyDateMatch[1]);
    }
  }

  // Search for separate Time
  if (!extractedTime) {
    const boxTime = text.match(
      /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:HORA\s*(?:DA\s*INFRA[ÇC][ÃA]O|DO\s*COMETIMENTO)?|HOR[ÁA]RIO|HORA)\]:\s*(\d{2}[:hH]\d{2}(?::\d{2})?)/i
    );
    if (boxTime) {
      extractedTime = boxTime[1].replace(/[hH]/, ':').slice(0, 5);
    } else {
      const timeMatch = text.match(
        /(?:HORA(?:\s*DA\s*INFRA[ÇC][ÃA]O|DO\s*COMETIMENTO)?|HOR[ÁA]RIO)\s*[:\-]?\s*(\d{2}[:hH]\d{2}(?::\d{2})?)/i
      );
      if (timeMatch) {
        extractedTime = timeMatch[1].replace(/[hH]/, ':').slice(0, 5);
      }
    }
  }

  if (extractedDate) {
    const finalTime = extractedTime || '12:00';
    result.infractionDate = normalizeInfractionDateTime(`${extractedDate}T${finalTime}`);
  }

  // 9. Infraction Location (Local da Infração)
  const boxLoc = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:LOCAL\s*(?:DA\s*INFRA[ÇC][ÃA]O|DO\s*COMETIMENTO)?|ENDERE[ÇC]O(?:\s*DA\s*INFRA[ÇC][ÃA]O)?)\]:\s*([^\n\r]{5,120})/i
  );
  if (boxLoc) {
    result.infractionLocation = boxLoc[1]
      .replace(/\s*(?:DATA|HORA|MUNIC[ÍI]PIO|UF|VELOCIDADE)\s*[:\-].*$/i, '')
      .trim();
  } else {
    const locMatch = text.match(
      /(?:LOCAL\s*(?:DA\s*INFRA[ÇC][ÃA]O|DO\s*COMETIMENTO)?|ENDERE[ÇC]O(?:\s*DA\s*INFRA[ÇC][ÃA]O)?)\s*[:\-]?\s*([^\n\r]{5,120})/i
    );
    if (locMatch) {
      result.infractionLocation = locMatch[1]
        .replace(/\s*(?:DATA|HORA|MUNIC[ÍI]PIO|UF|VELOCIDADE)\s*[:\-].*$/i, '')
        .trim();
    } else {
      const roadMatch = text.match(
        /\b((?:RODOVIA|ROD\.|BR[-\s]?\d{3}|SP[-\s]?\d{3}|AV\.|AVENIDA|RUA|MARGINAL)[^\n\r]{4,100})/i
      );
      if (roadMatch) {
        result.infractionLocation = roadMatch[1].trim();
      }
    }
  }

  // 10. City & State (Município / UF)
  const boxCity = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:MUNIC[ÍI]PIO(?:\s*\/?\s*UF)?|CIDADE(?:\s*\/?\s*UF)?)\]:\s*([^\n\r]{3,40})/i
  );
  if (boxCity) {
    const m = boxCity[1].match(
      /([A-ZÀ-Ÿ\s]{3,35}?)(?:\s*[\/\-]\s*|\s+)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i
    );
    if (m) {
      result.city = m[1].trim();
      result.state = m[2].toUpperCase();
    } else {
      result.city = boxCity[1].trim();
    }
  }

  if (!result.city || !result.state) {
    const cityUfMatch = text.match(
      /(?:MUNIC[ÍI]PIO|CIDADE)\s*[:\-]?\s*([A-ZÀ-Ÿ\s]{3,35}?)(?:\s*[\/\-]\s*|\s+UF\s*[:\-]?\s*)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i
    );
    if (cityUfMatch) {
      result.city = cityUfMatch[1].trim();
      result.state = cityUfMatch[2].toUpperCase();
    }
  }

  // 11. Due Date (Data Limite / Vencimento)
  const boxDue = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:DATA\s*LIMITE(?:\s*PARA\s*DEFESA)?|VENCIMENTO|PAGAMENTO\s*AT[ÉE]|DATA\s*DE\s*VENCIMENTO)\]:\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
  );
  if (boxDue) {
    result.dueDate = brDateToIso(boxDue[1]);
  } else {
    const dueLabelMatch = text.match(
      /(?:VENCIMENTO|DATA\s*LIMITE|AT[ÉE]\s*O\s*DIA|PAGAMENTO\s*AT[ÉE])\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i
    );
    if (dueLabelMatch) {
      result.dueDate = brDateToIso(dueLabelMatch[1]);
    }
  }

  // 12. Issuing Authority (Órgão Autuador)
  const boxAuth = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:[ÓO]RG[ÃA]O\s*AUTUADOR|AUTORIDADE\s*DE\s*TR[ÂA]NSITO)\]:\s*([^\n\r]+)/i
  );
  if (boxAuth) {
    const authText = boxAuth[1].toUpperCase();
    if (/PRF|POL[ÍI]CIA\s*RODOVI[ÁA]RIA/.test(authText)) result.issuingAuthority = 'PRF';
    else if (/DNIT/.test(authText)) result.issuingAuthority = 'DNIT';
    else if (/DER/.test(authText)) result.issuingAuthority = 'DER';
    else if (/CET|PREFEITURA/.test(authText)) result.issuingAuthority = 'PREFEITURA / CET';
    else if (/DSV/.test(authText)) result.issuingAuthority = 'DSV';
    else if (/DETRAN/.test(authText)) result.issuingAuthority = 'DETRAN';
  }

  if (!result.issuingAuthority) {
    if (/\bPRF\b|POL[ÍI]CIA\s*RODOVI[ÁA]RIA\s*FEDERAL/i.test(text)) {
      result.issuingAuthority = 'PRF';
    } else if (/\bDNIT\b|DEPARTAMENTO\s*NACIONAL\s*DE\s*INFRAESTRUTURA/i.test(text)) {
      result.issuingAuthority = 'DNIT';
    } else if (/\bDER\b|DEPARTAMENTO\s*DE\s*ESTRADAS\s*DE\s*RODAGEM/i.test(text)) {
      result.issuingAuthority = 'DER';
    } else if (/\bCET\b|COMPANHIA\s*DE\s*ENGENHARIA\s*DE\s*TR[ÁA]FEGO|PREFEITURA/i.test(text)) {
      result.issuingAuthority = 'PREFEITURA / CET';
    } else if (/\bDSV\b|DEPARTAMENTO\s*DE\s*OPERA[ÇC][ÃA]O\s*DO\s*SISTEMA/i.test(text)) {
      result.issuingAuthority = 'DSV';
    } else if (/\bDETRAN\b/i.test(text)) {
      result.issuingAuthority = 'DETRAN';
    }
  }

  // 13. Owner / Razão Social & CNPJ
  let rawOwnerName = '';

  const boxOwner = text.match(
    /CAMPO_(?:ABAIXO|DIREITA|BOX)\[(?:[^\n\r\]]*(?:AUTUADO|DESTINAT[ÁA]RIO|INFRATOR|RAZ[ÃA]O\s*SOCIAL|PROPRIET[ÁA]RIO)[^\n\r\]]*)\]:\s*([^\n\r]{3,100})/i
  );
  if (boxOwner) {
    rawOwnerName = boxOwner[1].trim();
  } else {
    const ownerMatch = text.match(
      /(?:PROPRIET[ÁA]RIO(?:\s*\/?\s*(?:RAZ[ÃA]O\s*SOCIAL|CONDUTOR|ARRENDAT[ÁA]RIO))?|NOME\s*DO\s*PROPRIET[ÁA]RIO|NOME\s*\/?\s*RAZ[ÃA]O\s*SOCIAL|RAZ[ÃA]O\s*SOCIAL|AUTUADO(?:\s*\/?\s*PROPRIET[ÁA]RIO)?|DESTINAT[ÁA]RIO(?:\s*DA\s*NOTIFICA[ÇC][ÃA]O)?|NOME\s*DO\s*INFRATOR)\s*[:\-]?\s*([^\n\r]{3,100})/i
    );
    if (ownerMatch) {
      rawOwnerName = ownerMatch[1].trim();
    }
  }

  // Clean owner name from trailing label prefixes
  if (rawOwnerName) {
    rawOwnerName = rawOwnerName
      .replace(/\s*(?:CPF|CNPJ|ENDERE[ÇC]O|MUNIC[ÍI]PIO|CIDADE|UF|PLACA|DATA|HORA|BAIRRO|CEP)\s*[:\-].*$/i, '')
      .replace(/^[0-9.\-\/]+\s*[-:]\s*/, '')
      .trim();
  }

  // Search for CNPJ or CPF in document
  const cnpjMatch = text.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})\b/);
  const cpfMatch = text.match(/\b(\d{3}\.\d{3}\.\d{3}\-\d{2})\b/);
  const docId = cnpjMatch ? cnpjMatch[1] : cpfMatch ? cpfMatch[1] : '';

  if (rawOwnerName && docId) {
    if (!rawOwnerName.includes(docId)) {
      result.ownerCnpjRazaoSocial = `${docId} - ${rawOwnerName}`;
    } else {
      result.ownerCnpjRazaoSocial = rawOwnerName;
    }
  } else if (rawOwnerName) {
    result.ownerCnpjRazaoSocial = rawOwnerName;
  } else if (docId) {
    result.ownerCnpjRazaoSocial = docId;
  }

  return result;
}

/**
 * Normalizes, resolves aliases, formats dates and ensures two-way binding consistency
 * between scanned CNH document data (from AI, OCR, or local parser) and the Driver form.
 */
export function normalizeScannedDriverData(raw: any): Partial<Driver> {
  if (!raw || typeof raw !== 'object') return {};

  const cleanDigits = (v: any) =>
    typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\D/g, '') : '';
  const cleanStr = (v: any) =>
    typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';

  // 1. Name
  const rawName =
    raw.name ||
    raw.nome ||
    raw.driverName ||
    raw.nomeCondutor ||
    raw.nomeCompleto ||
    raw.condutor ||
    raw['1. SOBRENOME, NOME'] ||
    raw['1. SOBRENOME / NOME'] ||
    raw['NOME'] ||
    '';
  const name = sanitizeDriverName(cleanStr(rawName)) || cleanStr(rawName).toUpperCase();

  // 2. CPF
  const rawCpf =
    raw.cpf ||
    raw.cpfCondutor ||
    raw.documentoCpf ||
    raw.numCpf ||
    raw.cpfCnpj ||
    raw['CPF'] ||
    '';
  const cpfDigits = cleanDigits(rawCpf);
  const cpf = cpfDigits.length === 11 ? formatCpfString(cpfDigits) : cleanStr(rawCpf);

  // 3. CNH Number
  const rawCnh =
    raw.cnhNumber ||
    raw.cnh ||
    raw.numeroCnh ||
    raw.numCnh ||
    raw.registro ||
    raw.numeroRegistro ||
    raw.nRegistro ||
    raw.regCnh ||
    raw.registroCnh ||
    raw['4d. Nº REGISTRO'] ||
    raw['Nº REGISTRO'] ||
    raw['REGISTRO'] ||
    '';
  const cnhNumber = cleanDigits(rawCnh) || cleanStr(rawCnh);

  // 4. Category
  const rawCat =
    raw.cnhCategory ||
    raw.category ||
    raw.categoria ||
    raw.catHab ||
    raw.categoriaCnh ||
    raw.cat ||
    raw['CAT. HAB.'] ||
    raw['CATEGORIA'] ||
    'B';
  const catMatch = cleanStr(rawCat).toUpperCase().match(/\b(AE|AD|AC|AB|[A-E])\b/);
  const cnhCategory = (catMatch ? catMatch[1] : 'B') as CnhCategory;

  // 5. Expiration Date
  const rawExp =
    raw.cnhExpiration ||
    raw.expirationDate ||
    raw.validade ||
    raw.validadeCnh ||
    raw.dataValidade ||
    raw.dtValidade ||
    raw['4b. VALIDADE'] ||
    raw['VALIDADE'] ||
    '';
  const cnhExpiration = normalizeDateToIso(rawExp) || cleanStr(rawExp);

  // 6. Birth Date
  const rawBirth =
    raw.birthDate ||
    raw.dataNascimento ||
    raw.nascimento ||
    raw.dtNascimento ||
    raw['3. DATA NASCIMENTO'] ||
    raw['DATA NASCIMENTO'] ||
    '';
  const birthDate = normalizeDateToIso(rawBirth) || cleanStr(rawBirth);

  // 7. Mother Name
  const rawMother =
    raw.motherName ||
    raw.nomeMae ||
    raw.mae ||
    raw.filiacaoMae ||
    raw.filiacao1 ||
    raw['NOME DA MÃE'] ||
    raw['MÃE'] ||
    '';
  const motherName = sanitizeDriverName(cleanStr(rawMother)) || cleanStr(rawMother).toUpperCase();

  // 8. Father Name
  const rawFather =
    raw.fatherName ||
    raw.nomePai ||
    raw.pai ||
    raw.filiacaoPai ||
    raw.filiacao2 ||
    raw['NOME DO PAI'] ||
    raw['PAI'] ||
    '';
  const fatherName = sanitizeDriverName(cleanStr(rawFather)) || cleanStr(rawFather).toUpperCase();

  // 9. RENACH
  const rawRenach =
    raw.renachNumber ||
    raw.renach ||
    raw.numRenach ||
    raw.numeroRenach ||
    raw['RENACH'] ||
    '';
  const renachNumber = cleanStr(rawRenach).replace(/\s+/g, '').toUpperCase();

  // 10. Security Code
  const rawSecCode =
    raw.cnhSecurityCode ||
    raw.securityCode ||
    raw.codigoSeguranca ||
    raw.codSeguranca ||
    raw['CÓD. SEGURANÇA'] ||
    raw['CÓDIGO DE SEGURANÇA'] ||
    '';
  const cnhSecurityCode = cleanDigits(rawSecCode) || cleanStr(rawSecCode);

  // 11. Dates
  const rawIssue =
    raw.cnhIssueDate ||
    raw.issueDate ||
    raw.dataEmissao ||
    raw.dtEmissao ||
    raw['4a. DATA EMISSÃO'] ||
    raw['DATA EMISSÃO'] ||
    '';
  const cnhIssueDate = normalizeDateToIso(rawIssue);

  const rawFirstLicense =
    raw.firstLicenseDate ||
    raw.primeiraHabilitacao ||
    raw.dataPrimeiraHabilitacao ||
    raw.dt1Habilitacao ||
    raw['4c. 1ª HABILITAÇÃO'] ||
    raw['1ª HABILITAÇÃO'] ||
    '';
  const firstLicenseDate = normalizeDateToIso(rawFirstLicense);

  // 12. Points / Status / Phone / Email / Assigned Vehicle
  const currentPoints =
    typeof raw.currentPoints === 'number'
      ? raw.currentPoints
      : Number(raw.pontos || 0) || 0;
  const status =
    raw.status ||
    (currentPoints >= 40 ? 'SUSPENSA' : currentPoints >= 20 ? 'ALERTA' : 'REGULAR');
  const phone = cleanStr(raw.phone || raw.telefone || raw.celular || '');
  const email = cleanStr(raw.email || '');
  const assignedVehiclePlate = cleanStr(
    raw.assignedVehiclePlate || raw.vehiclePlate || raw.placa || raw.placaVeiculo || ''
  ).toUpperCase();

  const companyName = cleanStr(raw.companyName || raw.empresa || '');
  const companyCnpj = cleanStr(raw.companyCnpj || raw.cnpj || '');

  return {
    name: name || undefined,
    cpf: cpf || undefined,
    cnhNumber: cnhNumber || undefined,
    cnhCategory,
    cnhExpiration: cnhExpiration || undefined,
    birthDate: birthDate || undefined,
    fatherName: fatherName || undefined,
    motherName: motherName || undefined,
    cnhSecurityCode: cnhSecurityCode || undefined,
    renachNumber: renachNumber || undefined,
    cnhIssueDate: cnhIssueDate || undefined,
    firstLicenseDate: firstLicenseDate || undefined,
    currentPoints,
    status,
    phone: phone || undefined,
    email: email || undefined,
    assignedVehiclePlate: assignedVehiclePlate || undefined,
    companyName: companyName || undefined,
    companyCnpj: companyCnpj || undefined,
  };
}
