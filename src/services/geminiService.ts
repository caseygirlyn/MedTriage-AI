import { GoogleGenAI, Type } from "@google/genai";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    patient_info: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        dob_mentioned: { type: Type.STRING, nullable: true },
        phone_number: { type: Type.STRING, description: "The patient's contact phone number if mentioned" },
        contact_number_verified: { type: Type.BOOLEAN }
      },
      required: ["name", "dob_mentioned", "phone_number", "contact_number_verified"]
    },
    clinical_data: {
      type: Type.OBJECT,
      properties: {
        symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
        duration: { type: Type.STRING },
        pain_score_mentioned: { type: Type.INTEGER, nullable: true }
      },
      required: ["symptoms", "duration", "pain_score_mentioned"]
    },
    triage_logic: {
      type: Type.OBJECT,
      properties: {
        urgency_score: { type: Type.STRING, description: "1 (Routine) to 5 (Immediate)" },
        triage_category: { type: Type.STRING, description: "ROUTINE | URGENT_SAME_DAY | EMERGENCY_999" },
        emergency_alert: { type: Type.BOOLEAN },
        recommended_action: { type: Type.STRING }
      },
      required: ["urgency_score", "triage_category", "emergency_alert", "recommended_action"]
    },
    booking_intent: {
      type: Type.OBJECT,
      properties: {
        preferred_time: { type: Type.STRING },
        clinician_preference: { type: Type.STRING, nullable: true }
      },
      required: ["preferred_time", "clinician_preference"]
    },
    ai_confidence: { type: Type.NUMBER }
  },
  required: ["patient_info", "clinical_data", "triage_logic", "booking_intent", "ai_confidence"]
};

const SYSTEM_INSTRUCTION = `You are a highly skilled Medical Triage AI Assistant for a UK-based GP Surgery. Your goal is to process patient voice memos, extract clinical intent, and categorize urgency with 100% accuracy.

CRITICAL SAFETY PROTOCOL (RED FLAGS):
Before processing any data, check for "Life-Threatening Red Flags."
If the patient mentions:
- Chest pain or pressure
- Sudden weakness (especially one side of the body/face)
- Severe difficulty breathing or choking
- Heavy, uncontrollable bleeding
- Thoughts of self-harm or suicide
You MUST set "emergency_alert" to TRUE and "triage_category" to "EMERGENCY_999".

OUTPUT FILTRATION:
- Return ONLY a valid JSON object matching the provided schema.
- Do not provide medical advice or "fluff."
- If data is missing (e.g., Date of Birth), set the value to null.`;

export async function processTriageAudio(audioBase64: string, mimeType: string, patientNameHint?: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = patientNameHint 
    ? `Please analyze this medical triage voice memo for patient "${patientNameHint}" and return the results in the specified JSON format.`
    : "Please analyze this medical triage voice memo and return the results in the specified JSON format.";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  return JSON.parse(response.text || "{}");
}
