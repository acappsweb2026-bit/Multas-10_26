import { GoogleGenAI, Type } from '@google/genai';
import {
  parseCrlvFromText,
  sanitizeCrlvCityUf,
  sanitizeCrlvBrandModel,
  isValidCrlvOwnerName,
} from '../../src/lib/documentParser';

const MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { base64Data, mimeType, simulatedText } = req.body || {};
  const combinedText = (simulatedText || '').trim();
  const localParsed = combinedText ? parseCrlvFromText(combinedText) : {};
  const hasRealLocal = Boolean(
    localParsed.plate || localParsed.renavam || localParsed.chassis || localParsed.brandModel
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
      text: `Extraia SOMENTE os dados reais presentes neste CRLV-e brasileiro (SENATRAN/DETRAN).
Atenção:
- O nome ou razão social da empresa proprietária fica no campo rotulado "NOME" (logo acima de "CPF / CNPJ"). Extraia em "ownerName".
- O município e UF ficam no campo rotulado "LOCAL" (ao lado de "DATA", ex: "SAO PAULO SP" -> "SÃO PAULO/SP"). NUNCA retorne "SENATRAN" ou "DETRAN/SP" em "cityUf".
- Em "brandModel", não inclua "ESP" do campo vizinho Espécie/Tipo.

Texto extraído:
${combinedText || '(analisar imagem)'}`,
    });

    const schema = {
      type: Type.OBJECT,
      properties: {
        plate: { type: Type.STRING },
        renavam: { type: Type.STRING },
        chassis: { type: Type.STRING },
        brandModel: { type: Type.STRING },
        yearFabMod: { type: Type.STRING },
        vehicleType: { type: Type.STRING },
        fuel: { type: Type.STRING },
        color: { type: Type.STRING },
        ownerName: { type: Type.STRING },
        ownerCnpjCpf: { type: Type.STRING },
        cityUf: { type: Type.STRING },
        licensingStatus: { type: Type.STRING },
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

    if (parsedData && (parsedData.plate || parsedData.renavam || parsedData.brandModel)) {
      const cleanAiCityUf = sanitizeCrlvCityUf(parsedData.cityUf);
      const cleanAiOwner =
        parsedData.ownerName && isValidCrlvOwnerName(parsedData.ownerName)
          ? parsedData.ownerName.trim()
          : '';
      return res.status(200).json({
        success: true,
        data: {
          ...localParsed,
          ...parsedData,
          plate: (parsedData.plate || localParsed.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
          renavam: parsedData.renavam || localParsed.renavam || '',
          chassis: parsedData.chassis || localParsed.chassis || '',
          brandModel: sanitizeCrlvBrandModel(parsedData.brandModel || localParsed.brandModel || ''),
          ownerName: cleanAiOwner || localParsed.ownerName || '',
          ownerCnpjCpf: parsedData.ownerCnpjCpf || localParsed.ownerCnpjCpf || '',
          cityUf: cleanAiCityUf || localParsed.cityUf || '',
        },
        source: modelUsed,
      });
    }
  } catch (err) {
    console.warn('Error in /api/ai/extract-crlv:', err);
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
    error: 'Não foi possível ler os dados do CRLV enviado.',
  });
}
