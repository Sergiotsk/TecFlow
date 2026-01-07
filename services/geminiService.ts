
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