import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const polishText = async (text: string, context: 'diagnosis' | 'professional_note'): Promise<string> => {
  if (!text || !text.trim()) return "";
  
  if (!apiKey) {
    console.warn("No API Key provided for Gemini.");
    return text;
  }

  try {
    const prompt = context === 'diagnosis' 
      ? `Actúa como un técnico experto en IT y Electricidad. Reescribe el siguiente diagnóstico o nota técnica para que sea más profesional, claro y detallado para un informe al cliente. Mantén la información técnica precisa pero explícala bien. Texto original: "${text}"`
      : `Actúa como un dueño de negocio profesional. Reescribe la siguiente nota para un presupuesto o correo para que suene cortés, profesional y claro. Texto original: "${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return text; // Fallback to original text on error
  }
};