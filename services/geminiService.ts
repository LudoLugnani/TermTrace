import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ContractAnalysis } from "../types";

const TERMINATION_RIGHT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING },
    notice_period: { type: Type.STRING },
    method: { type: Type.STRING },
    clause_reference: { type: Type.STRING },
    original_text: { type: Type.STRING },
  },
};

const RENEWAL_TERMINATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    term_length: { type: Type.STRING },
    auto_renewal: { type: Type.STRING },
    renewal_conditions: { type: Type.STRING },
    termination_rights: {
      type: Type.ARRAY,
      items: TERMINATION_RIGHT_SCHEMA,
    },
  },
};

const CALENDAR_FEED_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    event_title: { type: Type.STRING },
    event_description: { type: Type.STRING },
    date_or_rule: { type: Type.STRING },
    related_clause: { type: Type.STRING },
  },
};

const DEADLINE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    clause_reference: { type: Type.STRING },
    original_text: { type: Type.STRING },
    deadline_type: { 
      type: Type.STRING, 
      enum: ['notice_period', 'fixed_date', 'timeframe'] 
    },
    value: { type: Type.STRING },
    converted_date: { type: Type.STRING },
    explanation: { type: Type.STRING },
  },
};

const OBLIGATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    party: { type: Type.STRING },
    clause_reference: { type: Type.STRING },
    original_text: { type: Type.STRING },
    summary: { type: Type.STRING },
    type: { 
      type: Type.STRING,
      enum: ['ongoing', 'one-off', 'conditional', 'recurring']
    },
    deadline: { type: Type.STRING },
    dependencies: { type: Type.STRING },
  },
};

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    parties: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    obligations: {
      type: Type.ARRAY,
      items: OBLIGATION_SCHEMA,
    },
    deadlines: {
      type: Type.ARRAY,
      items: DEADLINE_SCHEMA,
    },
    renewal_termination: RENEWAL_TERMINATION_SCHEMA,
    calendar_feed: {
      type: Type.ARRAY,
      items: CALENDAR_FEED_SCHEMA,
    },
  },
  required: ["parties", "obligations", "deadlines", "renewal_termination", "calendar_feed"],
};

export const analyzeContract = async (
  content: string | { mimeType: string, data: string }, 
  partyName: string
): Promise<ContractAnalysis> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are a world-class senior legal engineer. Your task is to analyze the provided contract document specifically for the party: "${partyName}".
    
    1. Identify all obligations, deadlines, time limits, and notice periods for this party.
    2. Extract exact clause text and convert into structured fields.
    3. Analyze Renewal & Termination Mechanics: extract renewal terms, termination rights, notice periods, specific processes, and consequences.
    4. Generate a Calendar Feed: Create iCal-compatible events from deadlines. If a date is calculated (e.g., "90 days before renewal"), output the rule.
    5. Behave strictly: Do not hallucinate. Only extract content directly stated. If ambiguous, explain in a note (in explanation or summary fields). If undetermined, leave blank. Prioritise accuracy.
  `;

  let parts: any[] = [];

  if (typeof content === 'string') {
    // Plain text content
    parts.push({
      text: `Analyze the following contract text for the party "${partyName}".\n\nContract Text:\n"""\n${content}\n"""`
    });
  } else {
    // File content (PDF, etc)
    parts.push({
      inlineData: {
        mimeType: content.mimeType,
        data: content.data
      }
    });
    parts.push({
      text: `Analyze this contract document for the party "${partyName}".`
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error("No response generated from the model.");
    }

    const data = JSON.parse(response.text) as ContractAnalysis;
    return data;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};