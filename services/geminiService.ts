
import { GoogleGenAI, Type } from "@google/genai";
import type { Metadata, Author } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "YOUR_API_KEY_HERE" });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "El título principal del artículo en su idioma original (español o portugués)." },
    titleEn: { type: Type.STRING, description: "La traducción del título al inglés. Si no se encuentra, dejar vacío." },
    abstract: { type: Type.STRING, description: "El resumen o abstract completo en el idioma original." },
    abstractEn: { type: Type.STRING, description: "La traducción del resumen al inglés. Si no se encuentra, dejar vacío." },
    keywords: { type: Type.STRING, description: "Una lista de palabras clave en el idioma original, separadas por comas." },
    keywordsEn: { type: Type.STRING, description: "Una lista de palabras clave traducidas al inglés, separadas por comas. Si no se encuentran, dejar vacío." },
    authors: {
      type: Type.ARRAY,
      description: "Una lista de todos los autores del artículo.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "El nombre completo del autor." },
          affiliation: { type: Type.STRING, description: "La afiliación institucional del autor (universidad, centro de investigación, etc.)." },
          country: { type: Type.STRING, description: "El país de la afiliación institucional. Si no se encuentra, dejar vacío." },
          email: { type: Type.STRING, description: "La dirección de correo electrónico del autor. Si no se encuentra, dejar vacío." },
          orcid: { type: Type.STRING, description: "El identificador ORCID del autor, si está disponible. Si no se encuentra, dejar vacío." },
        },
        required: ["name", "affiliation", "country"],
      },
    },
  },
  required: ["title", "abstract", "keywords", "authors"],
};


export const extractMetadataFromText = async (text: string): Promise<Partial<Metadata>> => {
  const prompt = `
    Analiza el siguiente texto de un artículo académico y extrae los metadatos solicitados.
    El texto puede estar en español o portugués. Extrae los títulos, resúmenes y palabras clave tanto en el idioma original como en inglés si están disponibles.
    Para cada autor, extrae su nombre, afiliación y el país de la afiliación.
    Responde únicamente con el objeto JSON que se ajuste al esquema proporcionado.

    TEXTO DEL ARTÍCULO:
    ---
    ${text.substring(0, 15000)}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const extractedData = JSON.parse(jsonText);
    
    if (!extractedData.authors || extractedData.authors.length === 0) {
      extractedData.authors = [{ name: '', affiliation: '', email: '', orcid: '', country: '' }];
    } else {
       extractedData.authors = extractedData.authors.map((author: Partial<Author>) => ({
        name: author.name || '',
        affiliation: author.affiliation || '',
        email: author.email || '',
        orcid: author.orcid || '',
        country: author.country || '',
      }));
    }

    return extractedData as Partial<Metadata>;
  } catch (error) {
    console.error("Error extracting metadata with Gemini:", error);
    throw new Error("La extracción de metadatos con IA falló. Por favor, complete los campos manualmente.");
  }
};