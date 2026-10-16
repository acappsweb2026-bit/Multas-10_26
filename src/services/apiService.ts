import { DetranQueryResult, Driver, TrafficFine, Vehicle } from '../types';
import { extractPdfContentClient } from '../lib/pdfClientExtractor';
import {
  parseCnhFromText,
  parseCrlvFromText,
  parseFineFromText,
  sanitizeCrlvCityUf,
  sanitizeCrlvBrandModel,
  isValidCrlvOwnerName,
  sanitizeDriverName,
  normalizeDateToIso,
  extractDriverDataFromFileName,
  isValidBrazilianCpf,
  formatCpfString,
  normalizeScannedDriverData,
} from '../lib/documentParser';

function stripEmptyFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined && v !== null && v !== '') {
      (cleaned as any)[k] = v;
    }
  }
  return cleaned;
}

function isPdfInput(mimeType?: string, fileName?: string, base64Data?: string): boolean {
  if (mimeType && mimeType.toLowerCase().includes('pdf')) return true;
  if (fileName && fileName.toLowerCase().endsWith('.pdf')) return true;
  if (base64Data) {
    const clean = base64Data.replace(/^data:[^;]+;base64,/, '');
    if (clean.startsWith('JVBERi0') || base64Data.startsWith('data:application/pdf')) {
      return true;
    }
  }
  return false;
}

export async function extractDriverFromCnh(fileOrBase64: {
  base64Data?: string;
  mimeType?: string;
  simulatedText?: string;
  fileName?: string;
}): Promise<{
  success: boolean;
  data?: Partial<Driver>;
  error?: string;
  warning?: string;
  source?: string;
}> {
  let extractedPdfText = '';
  let pageImageBase64: string | undefined;

  // 1. If input is a PDF, extract real embedded text and render page 1 via pdfjs-dist in browser
  if (
    fileOrBase64.base64Data &&
    isPdfInput(fileOrBase64.mimeType, fileOrBase64.fileName, fileOrBase64.base64Data)
  ) {
    const pdfContent = await extractPdfContentClient(fileOrBase64.base64Data);
    extractedPdfText = pdfContent.text;
    pageImageBase64 = pdfContent.pageImageBase64;
  }

  const combinedText = [fileOrBase64.simulatedText, extractedPdfText].filter(Boolean).join('\n\n');
  const localParsed = combinedText ? stripEmptyFields(parseCnhFromText(combinedText, fileOrBase64.fileName)) : {};
  const fileData = extractDriverDataFromFileName(fileOrBase64.fileName);
  const sanitizedLocalName = sanitizeDriverName(localParsed.name || '') || fileData.name || '';
  const sanitizedLocalExp = normalizeDateToIso(localParsed.cnhExpiration) || fileData.expirationDate || '';
  const sanitizedLocalBirth = normalizeDateToIso(localParsed.birthDate) || '';

  const cleanLocal: Partial<Driver> = {
    ...localParsed,
    name: sanitizedLocalName || undefined,
    cnhExpiration: sanitizedLocalExp || undefined,
    birthDate: sanitizedLocalBirth || undefined,
    cpf: localParsed.cpf && isValidBrazilianCpf(localParsed.cpf) ? formatCpfString(localParsed.cpf) : localParsed.cpf,
  };

  const hasRealLocalCnh = Boolean(cleanLocal.name || cleanLocal.cpf || cleanLocal.cnhNumber);

  // 2. Call server-side Gemini endpoint (passing rendered page image + extracted text)
  try {
    const payloadBase64 = pageImageBase64 || fileOrBase64.base64Data;
    const payloadMime = pageImageBase64 ? 'image/jpeg' : fileOrBase64.mimeType;

    const res = await fetch('/api/ai/extract-cnh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data: payloadBase64,
        mimeType: payloadMime,
        simulatedText: combinedText,
        fileName: fileOrBase64.fileName,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const aiData = stripEmptyFields(json.data);
        const mergedRaw = {
          ...cleanLocal,
          ...aiData,
          name: aiData.name || sanitizedLocalName || fileData.name || '',
          cnhExpiration: aiData.cnhExpiration || sanitizedLocalExp || fileData.expirationDate || '',
          birthDate: aiData.birthDate || sanitizedLocalBirth || '',
        };

        const normalized = normalizeScannedDriverData(mergedRaw);

        if (normalized.name || normalized.cpf || normalized.cnhNumber) {
          return {
            success: true,
            data: normalized,
            source: json.source || 'gemini-ai',
          };
        }
      }
    }
  } catch (err) {
    console.warn('Server AI CNH extraction unavailable, using local PDF parser:', err);
  }

  // 3. If real data was extracted directly from the PDF text or filename, return it cleanly without error!
  if (hasRealLocalCnh) {
    const normalized = normalizeScannedDriverData(cleanLocal);
    return {
      success: true,
      data: normalized,
      source: 'pdf-text-parser',
    };
  }

  return {
    success: false,
    error:
      'Não foi possível ler os dados automaticamente deste arquivo (documento ilegível ou imagem sem texto selecionável). Preencha os campos abaixo.',
  };
}

export const extractCnhData = extractDriverFromCnh;

export async function extractVehicleFromCrlv(fileOrBase64: {
  base64Data?: string;
  mimeType?: string;
  simulatedText?: string;
  fileName?: string;
}): Promise<{
  success: boolean;
  data?: Partial<Vehicle>;
  error?: string;
  warning?: string;
  source?: string;
}> {
  let extractedPdfText = '';
  let pageImageBase64: string | undefined;

  if (
    fileOrBase64.base64Data &&
    isPdfInput(fileOrBase64.mimeType, fileOrBase64.fileName, fileOrBase64.base64Data)
  ) {
    const pdfContent = await extractPdfContentClient(fileOrBase64.base64Data);
    extractedPdfText = pdfContent.text;
    pageImageBase64 = pdfContent.pageImageBase64;
  }

  const combinedText = [fileOrBase64.simulatedText, extractedPdfText].filter(Boolean).join('\n\n');
  const localParsed = combinedText ? stripEmptyFields(parseCrlvFromText(combinedText)) : {};
  const hasRealLocalCrlv = Boolean(
    localParsed.plate || localParsed.renavam || localParsed.chassis || localParsed.brandModel
  );

  try {
    const payloadBase64 = pageImageBase64 || fileOrBase64.base64Data;
    const payloadMime = pageImageBase64 ? 'image/jpeg' : fileOrBase64.mimeType;

    const res = await fetch('/api/ai/extract-crlv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data: payloadBase64,
        mimeType: payloadMime,
        simulatedText: combinedText,
        fileName: fileOrBase64.fileName,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const aiData = stripEmptyFields(json.data);
        const cleanAiCityUf = sanitizeCrlvCityUf(aiData.cityUf);
        const cleanAiOwner =
          aiData.ownerName && isValidCrlvOwnerName(aiData.ownerName)
            ? aiData.ownerName.trim()
            : '';
        const merged: Partial<Vehicle> = {
          ...localParsed,
          ...aiData,
          plate: (aiData.plate || localParsed.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
          renavam: aiData.renavam || localParsed.renavam || '',
          chassis: aiData.chassis || localParsed.chassis || '',
          brandModel: sanitizeCrlvBrandModel(aiData.brandModel || localParsed.brandModel || ''),
          ownerName: cleanAiOwner || localParsed.ownerName || '',
          ownerCnpjCpf: aiData.ownerCnpjCpf || localParsed.ownerCnpjCpf || '',
          cityUf: cleanAiCityUf || localParsed.cityUf || '',
        };
        if (merged.plate || merged.renavam || merged.chassis || merged.brandModel) {
          return {
            success: true,
            data: merged,
            source: json.source || 'gemini-ai',
          };
        }
      }
    }
  } catch (err) {
    console.warn('Server AI CRLV extraction unavailable, using local PDF parser:', err);
  }

  if (hasRealLocalCrlv) {
    return {
      success: true,
      data: localParsed,
      source: 'pdf-text-parser',
    };
  }

  return {
    success: false,
    error:
      'Não foi possível ler os dados automaticamente deste arquivo CRLV. Preencha os campos manualmente.',
  };
}

export const extractCrlvData = extractVehicleFromCrlv;

export async function extractFineFromPdf(fileOrBase64: {
  base64Data?: string;
  mimeType?: string;
  simulatedText?: string;
  fileName?: string;
}): Promise<{
  success: boolean;
  data?: Partial<TrafficFine>;
  error?: string;
  warning?: string;
  source?: string;
}> {
  let extractedPdfText = '';
  let pageImageBase64: string | undefined;

  if (
    fileOrBase64.base64Data &&
    isPdfInput(fileOrBase64.mimeType, fileOrBase64.fileName, fileOrBase64.base64Data)
  ) {
    const pdfContent = await extractPdfContentClient(fileOrBase64.base64Data);
    extractedPdfText = pdfContent.text;
    pageImageBase64 = pdfContent.pageImageBase64;
  }

  const combinedText = [fileOrBase64.simulatedText, extractedPdfText].filter(Boolean).join('\n\n');
  const localParsed = combinedText
    ? stripEmptyFields(parseFineFromText(combinedText, fileOrBase64.fileName))
    : {};
  const hasRealLocalFine = Boolean(
    localParsed.aitNumber ||
      localParsed.plate ||
      localParsed.infractionCode ||
      localParsed.fineAmount
  );

  try {
    const payloadBase64 = pageImageBase64 || fileOrBase64.base64Data;
    const payloadMime = pageImageBase64 ? 'image/jpeg' : fileOrBase64.mimeType;

    const res = await fetch('/api/ai/extract-fine-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data: payloadBase64,
        mimeType: payloadMime,
        simulatedText: combinedText,
        fileName: fileOrBase64.fileName,
      }),
    });

    if (res.ok) {
      const result = await res.json();
      if (result.success && result.data) {
        const d = stripEmptyFields(result.data as any);
        const cleanLocal = stripEmptyFields(localParsed);
        const merged: Partial<TrafficFine> = {
          ...cleanLocal,
          ...d,
          aitNumber: (
            d.aitNumber ||
            d.ait ||
            d.autoInfracao ||
            d.numeroAit ||
            cleanLocal.aitNumber ||
            ''
          )
            .toString()
            .trim()
            .toUpperCase(),
          plate: (d.plate || cleanLocal.plate || '')
            .toString()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ''),
          infractionDate: d.infractionDate || cleanLocal.infractionDate || '',
          infractionLocation:
            d.infractionLocation ||
            d.local ||
            d.localInfracao ||
            d.endereco ||
            cleanLocal.infractionLocation ||
            '',
          city: d.city || cleanLocal.city || '',
          state: d.state || cleanLocal.state || '',
          infractionCode: d.infractionCode || cleanLocal.infractionCode || '',
          infractionDescription:
            d.infractionDescription || cleanLocal.infractionDescription || '',
          dueDate: d.dueDate || cleanLocal.dueDate || '',
          fineAmount: Number(d.fineAmount || cleanLocal.fineAmount) || 0,
          originalAmount:
            Number(d.originalAmount || d.fineAmount || cleanLocal.originalAmount || cleanLocal.fineAmount) ||
            0,
          discountAmount:
            Number(d.discountAmount || cleanLocal.discountAmount) ||
            (Number(d.fineAmount || cleanLocal.fineAmount)
              ? Number((Number(d.fineAmount || cleanLocal.fineAmount) * 0.8).toFixed(2))
              : undefined),
          isDoubledFine: Boolean(d.isDoubledFine ?? cleanLocal.isDoubledFine),
          multiplierFactor: Number(d.multiplierFactor || cleanLocal.multiplierFactor) || 1,
          isNicFine: Boolean(
            d.isNicFine || d.isDoubledFine || cleanLocal.isNicFine || cleanLocal.isDoubledFine
          ),
          ownerCnpjRazaoSocial: d.ownerCnpjRazaoSocial || cleanLocal.ownerCnpjRazaoSocial || '',
          driverName: d.driverName || cleanLocal.driverName || '',
          issuingAuthority: d.issuingAuthority || cleanLocal.issuingAuthority || 'DETRAN',
          status: d.status || cleanLocal.status || 'PENDENTE',
          severity: d.severity || cleanLocal.severity || 'MEDIA',
          points:
            d.points !== undefined
              ? Number(d.points)
              : cleanLocal.points !== undefined
              ? Number(cleanLocal.points)
              : d.isDoubledFine || cleanLocal.isDoubledFine
              ? 0
              : 4,
        };

        if (
          merged.aitNumber ||
          merged.plate ||
          merged.infractionCode ||
          (merged.fineAmount && merged.fineAmount > 0)
        ) {
          return {
            success: true,
            data: merged,
            source: result.source || 'gemini-ai',
          };
        }
      }
    }
  } catch (err) {
    console.warn('Server AI Fine PDF extraction unavailable, using local PDF parser:', err);
  }

  if (hasRealLocalFine) {
    return {
      success: true,
      data: localParsed,
      source: 'pdf-text-parser',
    };
  }

  return {
    success: false,
    error:
      'Não foi possível extrair os dados automaticamente deste PDF/imagem. Verifique se o documento está legível ou preencha os campos manualmente.',
  };
}

export async function consultDetran(
  plate: string,
  renavam?: string,
  state?: string,
  vehicleContext?: Partial<Vehicle>,
  existingFines?: TrafficFine[]
): Promise<{ success: boolean; data?: DetranQueryResult; error?: string }> {
  try {
    const res = await fetch('/api/detran/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plate,
        renavam: vehicleContext?.renavam || renavam,
        chassis: vehicleContext?.chassis,
        model: vehicleContext?.brandModel,
        owner: vehicleContext?.ownerName || vehicleContext?.companyName,
        licensingStatus: vehicleContext?.licensingStatus,
        state: state || vehicleContext?.cityUf,
        existingFines: existingFines || [],
      }),
    });
    return await res.json();
  } catch (err: any) {
    console.error('Error querying Detran API:', err);
    return { success: false, error: err.message || 'Erro ao conectar à base do Detran.' };
  }
}

export const consultDetranByPlate = consultDetran;

// Utility to convert file to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
