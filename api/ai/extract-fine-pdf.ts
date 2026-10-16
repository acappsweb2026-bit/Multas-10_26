import { GoogleGenAI, Type } from '@google/genai';
import { parseFineFromText, normalizeInfractionDateTime } from '../../src/lib/documentParser';

const MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

function extractPrintableTextFromBase64(base64Data?: string): string {
  if (!base64Data) return '';
  try {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    if (!cleanBase64.startsWith('JVBERi0')) return '';
    const buf = Buffer.from(cleanBase64, 'base64');
    const latin1 = buf.toString('latin1');
    const extractedLines: string[] = [];
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    while ((match = streamRegex.exec(latin1)) !== null) {
      try {
        const rawStream = Buffer.from(match[1], 'binary');
        const zlib = require('zlib');
        const decompressed = zlib.inflateSync(rawStream).toString('utf-8');
        const textRegex = /\(([^)]+)\)\s*Tj/g;
        let tm: RegExpExecArray | null;
        while ((tm = textRegex.exec(decompressed)) !== null) {
          extractedLines.push(tm[1]);
        }
      } catch {}
    }
    return extractedLines.join(' ');
  } catch {
    return '';
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { base64Data, mimeType, simulatedText, fileName } = req.body || {};
  const decodedPdfText = extractPrintableTextFromBase64(base64Data);
  const combinedText = [simulatedText, decodedPdfText].filter(Boolean).join('\n\n').trim();
  const localParsed = combinedText ? parseFineFromText(combinedText, fileName) : {};
  const hasRealLocal = Boolean(
    localParsed.aitNumber ||
      localParsed.plate ||
      localParsed.infractionCode ||
      localParsed.fineAmount
  );

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    if (hasRealLocal) {
      return res.status(200).json({
        success: true,
        data: localParsed,
        source: 'pdf-parser',
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
      text: `Extraia SOMENTE os dados reais presentes nesta Notificação de Infração de Trânsito (AIT) brasileira. NUNCA invente placas, AITs ou rodovias fictícias.\nArquivo: ${fileName || 'documento.pdf'}\nTexto extraído:\n${combinedText || '(analisar imagem)'}`,
    });

    const schema = {
      type: Type.OBJECT,
      properties: {
        aitNumber: { type: Type.STRING },
        plate: { type: Type.STRING },
        infractionDate: { type: Type.STRING },
        infractionLocation: { type: Type.STRING },
        city: { type: Type.STRING },
        state: { type: Type.STRING },
        infractionCode: { type: Type.STRING },
        infractionDescription: { type: Type.STRING },
        fineAmount: { type: Type.NUMBER },
        discountAmount: { type: Type.NUMBER },
        originalAmount: { type: Type.NUMBER },
        isDoubledFine: { type: Type.BOOLEAN },
        multiplierFactor: { type: Type.INTEGER },
        isNicFine: { type: Type.BOOLEAN },
        ownerCnpjRazaoSocial: { type: Type.STRING },
        dueDate: { type: Type.STRING },
        status: { type: Type.STRING },
        severity: { type: Type.STRING },
        points: { type: Type.INTEGER },
        issuingAuthority: { type: Type.STRING },
        driverName: { type: Type.STRING },
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

    if (
      parsedData &&
      (parsedData.aitNumber || parsedData.plate || parsedData.infractionCode || parsedData.fineAmount)
    ) {
      return res.status(200).json({
        success: true,
        data: {
          ...localParsed,
          ...parsedData,
          aitNumber: (
            parsedData.aitNumber ||
            parsedData.ait ||
            parsedData.autoInfracao ||
            parsedData.numeroAit ||
            localParsed.aitNumber ||
            ''
          )
            .toString()
            .trim()
            .toUpperCase(),
          plate: (parsedData.plate || localParsed.plate || '')
            .toString()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ''),
          infractionDate: normalizeInfractionDateTime(
            parsedData.infractionDate || localParsed.infractionDate || ''
          ),
          infractionLocation: (
            parsedData.infractionLocation ||
            parsedData.local ||
            localParsed.infractionLocation ||
            ''
          ).trim(),
          city: parsedData.city || localParsed.city || '',
          state: parsedData.state || localParsed.state || '',
          infractionCode: parsedData.infractionCode || localParsed.infractionCode || '',
          infractionDescription:
            parsedData.infractionDescription || localParsed.infractionDescription || '',
          ownerCnpjRazaoSocial: (
            parsedData.ownerCnpjRazaoSocial ||
            parsedData.ownerName ||
            parsedData.razaoSocial ||
            parsedData.proprietario ||
            localParsed.ownerCnpjRazaoSocial ||
            ''
          ).trim(),
          dueDate: parsedData.dueDate || localParsed.dueDate || '',
          fineAmount: Number(parsedData.fineAmount || localParsed.fineAmount) || 0,
          originalAmount:
            Number(
              parsedData.originalAmount ||
                parsedData.fineAmount ||
                localParsed.originalAmount ||
                localParsed.fineAmount
            ) || 0,
          discountAmount:
            Number(parsedData.discountAmount || localParsed.discountAmount) || 0,
          isDoubledFine: Boolean(parsedData.isDoubledFine ?? localParsed.isDoubledFine),
          multiplierFactor:
            Number(parsedData.multiplierFactor || localParsed.multiplierFactor) || 1,
          isNicFine: Boolean(
            parsedData.isNicFine ||
              parsedData.isDoubledFine ||
              localParsed.isNicFine ||
              localParsed.isDoubledFine
          ),
          driverName: parsedData.driverName || localParsed.driverName || '',
          issuingAuthority:
            parsedData.issuingAuthority || localParsed.issuingAuthority || 'DETRAN',
          status: parsedData.status || localParsed.status || 'PENDENTE',
          severity: parsedData.severity || localParsed.severity || 'MEDIA',
          points:
            parsedData.points !== undefined
              ? Number(parsedData.points)
              : localParsed.points !== undefined
              ? Number(localParsed.points)
              : 4,
        },
        source: modelUsed,
      });
    }
  } catch (err) {
    console.warn('Error in /api/ai/extract-fine-pdf:', err);
  }

  if (hasRealLocal) {
    return res.status(200).json({
      success: true,
      data: localParsed,
      source: 'pdf-parser',
    });
  }

  return res.status(422).json({
    success: false,
    error: 'Não foi possível ler os dados da multa enviada.',
  });
}
