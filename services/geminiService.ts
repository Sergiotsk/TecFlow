
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const polishText = async (
  text: string,
  context: 'technical_diagnosis' | 'professional_note' | 'technical_issue' | 'work_report'
): Promise<string> => {
  console.log("polishText called with context:", context);

  if (!text || !text.trim()) return "";

  if (!apiKey) {
    console.warn("No API Key provided for Gemini.");
    throw new Error("API_KEY_MISSING");
  }

  try {
    let prompt = "";

    const sharedRules = "IMPORTANTE: Tu respuesta debe ser ÚNICAMENTE el texto mejorado, sin introducciones, sin comillas y sin explicaciones adicionales. Máximo 500 caracteres.";

    switch (context) {
      case 'technical_diagnosis':
        prompt = `Actúa como un técnico experto. Reescribe este diagnóstico técnico para un informe, usando terminología precisa y tono profesional. ${sharedRules} Texto original: "${text}"`;
        break;
      case 'technical_issue':
        prompt = `Actúa como un técnico recepcionista. Reescribe esta descripción del problema reportado por el cliente para que sea clara y concisa en el informe de ingreso. ${sharedRules} Texto original: "${text}"`;
        break;
      case 'work_report':
        prompt = `Actúa como un técnico experto. Reescribe este informe de trabajo realizado detallando las tareas y materiales usados de forma profesional para el cliente. ${sharedRules} Texto original: "${text}"`;
        break;
      case 'professional_note':
        prompt = `Actúa como un dueño de negocio. Reescribe esta nota para que suene cortés, profesional y amable. ${sharedRules} Texto original: "${text}"`;
        break;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || text;

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);

    // Check for 429 Quota Exceeded or 403
    if (error.message?.includes('429') || error.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }

    throw error;
  }
};

export const parseProductList = async (base64Data: string, mimeType: string): Promise<any[]> => {
  if (!apiKey) throw new Error("API_KEY_MISSING");

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Analiza esta imagen o documento que contiene una lista de precios o inventario.
    Extrae CADA ítem encontrado en una lista JSON estructurada.
    Para cada ítem, intenta identificar:
    - 'description': Nombre o descripción del producto.
    - 'unitPrice': Precio unitario EXACTAMENTE como aparece en la imagen (como STRING, incluyendo puntos, comas y símbolos de moneda). NO lo conviertas a número.
    - 'code': Código, SKU o ID del producto si existe.
    - 'stock': Cantidad disponible si existe (numérico).
    
    IMPORTANTE: 
    - El campo 'unitPrice' debe ser un STRING que preserve el formato original (ej: "$172.900", "157,15", etc.)
    - Si no encuentras código o stock, déjalos vacíos o en 0.
    - Devuelve SOLAMENTE el array JSON válido, sin bloques de código markdown, sin texto adicional.`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Improved JSON extraction: find the first '[' and the last ']'
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');

    if (start === -1 || end === -1) {
      throw new Error("No JSON array found in response");
    }

    const jsonStr = text.substring(start, end + 1);

    return JSON.parse(jsonStr);

  } catch (error: any) {
    console.error("Error parsing product list with Gemini:", error);
    if (error.message?.includes('429')) throw new Error("QUOTA_EXCEEDED");
    throw error;
  }
};