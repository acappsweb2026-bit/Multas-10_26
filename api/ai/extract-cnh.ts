import { GoogleGenAI, Type } from '@google/genai';
import Tesseract from 'tesseract.js';
import {
  parseCnhFromText,
  sanitizeDriverName,
  normalizeDateToIso,
  extractDriverDataFromFileName,
  isValidBrazilianCpf,
  formatCpfString,
} from '../../src/lib/documentParser';

const MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { base64Data, mimeType, simulatedText, fileName } = req.body || {};

  let ocrText = '';
  if (base64Data) {
    try {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      if (!cleanBase64.startsWith('JVBERi0') && cleanBase64.length > 50) {
        const imageBuf = Buffer.from(cleanBase64, 'base64');
        const ocrResult = await Tesseract.recognize(imageBuf, 'por', {
          errorHandler: () => {},
        });
        ocrText = ocrResult?.data?.text || '';
      }
    } catch (ocrErr) {
      console.warn('OCR failed in api/ai/extract-cnh:', ocrErr);
    }
  }

  const combinedText = [simulatedText, ocrText].filter(Boolean).join('\n\n').trim();
  const localParsed = combinedText ? parseCnhFromText(combinedText, fileName) : {};
  const fileData = extractDriverDataFromFileName(fileName);
  const hasRealLocal = Boolean(localParsed.name || localParsed.cpf || localParsed.cnhNumber || fileData.name);

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    if (hasRealLocal) {
      return res.status(200).json({
        success: true,
        data: {
          ...localParsed,
          name: sanitizeDriverName(localParsed.name || '') || fileData.name || '',
          cnhExpiration: normalizeDateToIso(localParsed.cnhExpiration) || fileData.expirationDate || '',
          birthDate: normalizeDateToIso(localParsed.birthDate) || '',
        },
        source: ocrText ? 'ocr-engine' : 'pdf-parser',
      });
    }
    return res.status(422).json({
      success: false,
      error: 'Chave GEMINI_API_KEY não configurada para leitura de imagem sem texto.',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];
    if (base64Data && mimeType) {
      contents.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: base64Data.replace(/^data:[^;]+;base64,/, ''),
        },
      });
    }
    contents.push({
      text: `Você é um especialista em documentos de trânsito brasileiros (SENATRAN/DETRAN/CONTRAN). Analise esta CNH (Carteira Nacional de Habilitação) e extraia SOMENTE os dados reais do condutor.
Texto extraído do documento:
${combinedText || '(analisar imagem)'}
${fileName ? `Nome do arquivo original: ${fileName}` : ''}

REGRAS MANDATÓRIAS:
1. NOME COMPLETO DO CONDUTOR (campo 'name'):
   - O condutor é SEMPRE uma pessoa física (ex: HELIO SANTOS, MARCOS SILVA).
   - No modelo novo de CNH (2022+), o campo é "1. SOBRENOME, NOME" (ex: "SANTOS, HELIO" -> converta e retorne "HELIO SANTOS").
   - JAMAIS confunda com carimbos institucionais de conformidade, termos como "DOCUMENTO ASSINADO COM CERTIFICADO DIGITAL", "ASSINADO DIGITALMENTE", "ICP-BRASIL", "SERPRO", "VALOR LEGAL". Textos de assinatura digital NÃO são nomes!
   - Se o nome constar no nome do arquivo (ex: "CNH HelioSantos..."), utilize-o como confirmação.
2. CPF (campo 'cpf'):
   - Formate estritamente no padrão 000.000.000-00 com 11 dígitos válidos.
3. NÚMERO DE REGISTRO DA CNH (campo 'cnhNumber'):
   - Sequência de 9 a 11 dígitos (campo 4d Nº Registro ou 5. Nº CNH).
4. CATEGORIA (campo 'cnhCategory'):
   - Ex: "A", "B", "C", "D", "E", "AB", "AC", "AD", "AE".
5. VALIDADE (campo 'cnhExpiration'):
   - Data no formato ISO YYYY-MM-DD. Campo "4b. VALIDADE".
6. DATA DE NASCIMENTO (campo 'birthDate'):
   - Data no formato ISO YYYY-MM-DD. Campo "3. DATA DE NASCIMENTO" ou "2. DATA DE NASCIMENTO".`,
    });

    const schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        cpf: { type: Type.STRING },
        cnhNumber: { type: Type.STRING },
        cnhCategory: { type: Type.STRING },
        cnhExpiration: { type: Type.STRING },
        birthDate: { type: Type.STRING },
        currentPoints: { type: Type.INTEGER },
        status: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
      },
    };

    let parsedData: any = null;
    let modelUsed = MODELS[0];
    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { responseMimeType: 'application/json', responseSchema: schema },
        });
        parsedData = JSON.parse(response.text || '{}');
        modelUsed = model;
        break;
      } catch {
        // try next model
      }
    }

    if (parsedData) {
      const sanitizedAiName = sanitizeDriverName(parsedData.name || '');
      const sanitizedLocalName = sanitizeDriverName(localParsed.name || '');
      const resolvedName = sanitizedAiName || sanitizedLocalName || fileData.name || '';

      const resolvedCpf =
        (parsedData.cpf && isValidBrazilianCpf(parsedData.cpf)
          ? formatCpfString(parsedData.cpf)
          : '') ||
        (localParsed.cpf && isValidBrazilianCpf(localParsed.cpf)
          ? formatCpfString(localParsed.cpf)
          : '') ||
        '';

      const resolvedCnh = parsedData.cnhNumber || localParsed.cnhNumber || '';
      const resolvedCat = parsedData.cnhCategory || localParsed.cnhCategory || 'B';
      const resolvedExp =
        normalizeDateToIso(parsedData.cnhExpiration) ||
        normalizeDateToIso(localParsed.cnhExpiration) ||
        fileData.expirationDate ||
        '';
      const resolvedBirth =
        normalizeDateToIso(parsedData.birthDate) ||
        normalizeDateToIso(localParsed.birthDate) ||
        '';

      return res.status(200).json({
        success: Boolean(resolvedName || resolvedCpf || resolvedCnh),
        data: {
          ...localParsed,
          ...parsedData,
          name: resolvedName,
          cpf: resolvedCpf,
          cnhNumber: resolvedCnh,
          cnhCategory: resolvedCat,
          cnhExpiration: resolvedExp,
          birthDate: resolvedBirth,
        },
        source: modelUsed,
      });
    }
  } catch (err) {
    console.warn('Error in /api/ai/extract-cnh:', err);
  }

  if (hasRealLocal) {
    return res.status(200).json({
      success: true,
      data: {
        ...localParsed,
        name: sanitizeDriverName(localParsed.name || '') || fileData.name || '',
        cnhExpiration: normalizeDateToIso(localParsed.cnhExpiration) || fileData.expirationDate || '',
        birthDate: normalizeDateToIso(localParsed.birthDate) || '',
      },
      source: 'pdf-parser',
    });
  }

  return res.status(422).json({
    success: false,
    error: 'Não foi possível ler os dados da CNH enviada.',
  });
}
