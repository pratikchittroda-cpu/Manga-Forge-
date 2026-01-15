import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StoryData, GeneratorOptions, Character, Panel, Chapter } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.code === 429 || error.message?.includes('429') || error.message?.includes('quota'))) {
      console.warn(`Quota exceeded. Retrying in ${baseDelay}ms...`);
      await delay(baseDelay);
      return retryOperation(operation, retries - 1, baseDelay * 2);
    }
    throw error;
  }
}

export const generateStoryAndCharacters = async (options: GeneratorOptions): Promise<StoryData> => {
  const ai = createClient();

  const refPrompt = `
    References:
    - Story Style referenced from: ${options.references.storyRef || "Original"}
    - Art/Visual Style referenced from: ${options.references.artRef || "Original"}
    - Character Design referenced from: ${options.references.designRef || "Original"}
  `;

  // Explicitly allowing adult themes in text generation if requested
  const adultInstruction = options.genre.includes("Adult") || options.genre.includes("Hentai") || options.genre.includes("Smut") || options.genre.includes("Ecchi")
    ? "This story is for a MATURE audience. Include romantic, sensual, or explicit scenarios if they fit the genre. Do not hold back on description." 
    : "";

  const prompt = `
    Create a massive, detailed concept for a ${options.style === 'colored' ? 'Manhwa/Webtoon' : 'Manga'} 
    in the ${options.genre} genre. 
    Language: ${options.language}.
    Tone: ${options.tone}.
    ${refPrompt}
    ${adultInstruction}

    REQUIREMENTS:
    1. Title & Synopsis.
    2. "Unique Ending" concept.
    3. CAST LIST: Create EXACTLY 20 detailed characters. 
       - Main Protagonist, Main Antagonist, Supporting Cast, Rivals, Love Interests, etc.
       - Each must have unique abilities and highly detailed visual descriptions (hair, eyes, body type, clothing, specific features).
    4. STORY ARC: Create an outline for the first 10 CHAPTERS.
       - For EACH chapter, provide a Title, a Summary, and a detailed storyboard of 5 KEY PANELS.
       - CRITICAL: The "dialogue" field for each panel must be DETAILED, LONG, and formatted like a SCREENPLAY. Write actual conversations, emotional outbursts, and internal monologues. Do NOT summarize dialogue.
       - The story should flow continuously.
    5. "Research Notes": Trends in ${options.genre}.

    Output PURE JSON.
  `;

  const characterSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      name: { type: Type.STRING },
      role: { type: Type.STRING },
      appearance: { type: Type.STRING },
      abilities: { type: Type.STRING },
      personality: { type: Type.STRING },
      age: { type: Type.STRING },
      height: { type: Type.STRING },
      backstory: { type: Type.STRING },
      secret: { type: Type.STRING },
    },
    required: ["id", "name", "role", "appearance", "abilities", "personality", "age", "height", "backstory", "secret"],
  };

  const panelSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.INTEGER },
      description: { type: Type.STRING },
      dialogue: { type: Type.STRING },
    },
    required: ["id", "description", "dialogue"],
  };

  const chapterSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.INTEGER },
      title: { type: Type.STRING },
      summary: { type: Type.STRING },
      panels: {
        type: Type.ARRAY,
        items: panelSchema,
      }
    },
    required: ["id", "title", "summary", "panels"]
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      synopsis: { type: Type.STRING },
      genre: { type: Type.STRING },
      endingTwist: { type: Type.STRING },
      researchNotes: { type: Type.STRING },
      characters: {
        type: Type.ARRAY,
        items: characterSchema,
      },
      chapters: {
        type: Type.ARRAY,
        items: chapterSchema,
      }
    },
    required: ["title", "synopsis", "genre", "endingTwist", "researchNotes", "characters", "chapters"],
  };

  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const rawData = JSON.parse(text);

    return {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      title: rawData.title,
      synopsis: rawData.synopsis,
      genre: rawData.genre,
      endingTwist: rawData.endingTwist,
      researchNotes: rawData.researchNotes,
      characters: rawData.characters,
      chapters: rawData.chapters,
      currentChapterIndex: 0
    };
  });
};

export const generateImage = async (prompt: string, style: 'colored' | 'bw', ref?: string, isNSFW: boolean = false): Promise<string> => {
  const ai = createClient();
  
  // Note: Gemini API has safety filters. Even with NSFW in prompt, it may block images.
  // We add tags to attempt to guide it towards "Artistic" representations if possible.
  const nsfwPrompt = isNSFW ? "detailed anatomy, mature content, artistic nude, uncensored, adult themes," : "";

  const stylePrompt = style === 'colored' 
    ? "Manhwa webtoon style, high quality digital art, full color, vibrant, cinematic lighting, detailed anatomy" 
    : "Manga style, black and white, screentones, ink lines, high contrast, intricate detail, detailed anatomy";

  const refNote = ref && ref !== "Original" ? `Art style inspired by ${ref}.` : "";

  const fullPrompt = `${prompt}. ${stylePrompt}. ${nsfwPrompt} ${refNote} Masterpiece, best quality, 8k, highly detailed, dynamic composition.`;

  // We DO NOT retry here inside the service anymore because we are handling the "30 sec" pacing in the App queue.
  // We throw error so App knows to wait.
  
  try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1", 
          }
        }
      });

      let imageUrl = "";
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!imageUrl) throw new Error("No image generated (likely safety filter)");
      return imageUrl;
  } catch (error) {
      console.error("Error generating image:", error);
      throw error; 
  }
};

export const generateNextChapter = async (story: StoryData, options: GeneratorOptions): Promise<Chapter> => {
  const ai = createClient();
  const lastChapter = story.chapters[story.chapters.length - 1];
  
  const prompt = `
    Continue the story "${story.title}".
    Genre: ${story.genre}.
    Previous Chapter ${lastChapter.id}: "${lastChapter.title}".
    Last events: ${lastChapter.panels.map(p => p.description).join(' -> ')}.
    
    Generate "Chapter ${lastChapter.id + 1}".
    Provide a Title, Summary and 5 visual panels with DETAILED, LONG dialogue (Screenplay format).
    
    Output PURE JSON.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      summary: { type: Type.STRING },
      panels: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            description: { type: Type.STRING },
            dialogue: { type: Type.STRING },
          },
          required: ["id", "description", "dialogue"],
        }
      }
    },
    required: ["title", "summary", "panels"]
  };

  return retryOperation(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    const data = JSON.parse(text);
    return {
      id: lastChapter.id + 1,
      title: data.title,
      summary: data.summary,
      panels: data.panels
    };
  });
};