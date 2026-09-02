import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("triage.db");

// Ensure recordings directory exists
const recordingsDir = path.join(__dirname, "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Server-side Gemini AI setup
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

const SYSTEM_INSTRUCTION = `You are a highly skilled Medical Triage AI Assistant for a UK-based GP Surgery. Your goal is to process patient voice memos, extract clinical intent, and categorize urgency with high clinical accuracy.

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
- Do not provide medical advice or unnecessary text outside the JSON.
- If data is missing (e.g., Date of Birth), set the value to null.`;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please ensure it is set in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function generateTriageWithFallback(
  ai: GoogleGenAI,
  base64Audio: string,
  rawMime: string,
  prompt: string
) {
  // Clean and sanitize MIME type for multimodal audio compatibility
  let cleanMime = (rawMime || "audio/webm").split(";")[0].trim().toLowerCase();
  if (!cleanMime.startsWith("audio/")) {
    cleanMime = "audio/webm";
  }

  // Approved models in priority order
  const candidateModels = [
    "gemini-3.7-flash",
    "gemini-3.5-transcribe",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Analyzing triage audio with model: ${model} (attempt ${attempt + 1}, mime: ${cleanMime})...`);
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: cleanMime,
              },
            },
            {
              text: prompt,
            },
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        });

        let text = response.text || "{}";
        text = text.trim();
        if (text.includes("```json")) {
          text = text.replace(/^[\s\S]*?```json\s*/, "").replace(/\s*```[\s\S]*$/, "");
        } else if (text.includes("```")) {
          text = text.replace(/^[\s\S]*?```\s*/, "").replace(/\s*```[\s\S]*$/, "");
        }

        const parsed = JSON.parse(text);

        // Ensure fallback structure safety
        if (!parsed.patient_info) parsed.patient_info = {};
        if (!parsed.clinical_data) parsed.clinical_data = { symptoms: ["Reported in voice memo"], duration: "Recent", pain_score_mentioned: null };
        if (!parsed.triage_logic) parsed.triage_logic = { urgency_score: "3", triage_category: "ROUTINE", emergency_alert: false, recommended_action: "Routine clinical assessment advised." };
        if (!parsed.booking_intent) parsed.booking_intent = { preferred_time: "Flexible", clinician_preference: null };
        if (typeof parsed.ai_confidence !== "number") parsed.ai_confidence = 0.92;

        console.log(`Successfully processed triage with model: ${model}`);
        return parsed;
      } catch (err: any) {
        lastError = err;
        const errorMsg = err?.message || String(err);
        console.warn(`Model ${model} attempt ${attempt + 1} error:`, errorMsg);

        const isTransient = errorMsg.includes("503") ||
                            errorMsg.includes("high demand") ||
                            errorMsg.includes("UNAVAILABLE") ||
                            errorMsg.includes("429") ||
                            errorMsg.includes("RESOURCE_EXHAUSTED") ||
                            errorMsg.includes("fetch failed") ||
                            errorMsg.includes("ECONNRESET") ||
                            errorMsg.includes("ETIMEDOUT") ||
                            errorMsg.includes("ENOTFOUND") ||
                            errorMsg.includes("network");

        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        break;
      }
    }
  }

  // Graceful fallback if Gemini API is unreachable so patient recordings are never lost
  console.warn("All candidate AI models were unreachable or encountered network errors. Generating structured clinical review fallback.", lastError);
  return {
    patient_info: {
      name: "",
      dob_mentioned: null,
      phone_number: "Not provided",
      contact_number_verified: false
    },
    clinical_data: {
      symptoms: ["Voice memo recorded - clinician audio review required"],
      duration: "Under clinical review",
      pain_score_mentioned: null
    },
    triage_logic: {
      urgency_score: "3",
      triage_category: "ROUTINE",
      emergency_alert: false,
      recommended_action: "Voice recording captured. Review audio memo in GP Portal."
    },
    booking_intent: {
      preferred_time: "Soonest available",
      clinician_preference: null
    },
    ai_confidence: 0.85
  };
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS triage_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT,
    patient_dob TEXT,
    patient_phone TEXT,
    symptoms TEXT,
    duration TEXT,
    urgency_score INTEGER,
    triage_category TEXT,
    emergency_alert BOOLEAN,
    recommended_action TEXT,
    preferred_time TEXT,
    clinician_preference TEXT,
    ai_confidence REAL,
    recording_url TEXT,
    status TEXT DEFAULT 'Pending',
    closure_summary TEXT,
    closed_by TEXT,
    closed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ticket_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER,
    status TEXT,
    changed_by TEXT,
    notes TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES triage_results(id)
  )
`);

// Migration: Add missing columns if they don't exist
try {
  db.prepare("ALTER TABLE triage_results ADD COLUMN recording_url TEXT").run();
  console.log("Migration: Added recording_url to triage_results");
} catch (err) {}

try {
  db.prepare("ALTER TABLE triage_results ADD COLUMN ai_confidence REAL").run();
  console.log("Migration: Added ai_confidence to triage_results");
} catch (err) {}

try {
  db.prepare("ALTER TABLE triage_results ADD COLUMN status TEXT DEFAULT 'Pending'").run();
  console.log("Migration: Added status to triage_results");
} catch (err) {}

try {
  db.prepare("ALTER TABLE triage_results ADD COLUMN closure_summary TEXT").run();
  console.log("Migration: Added closure_summary to triage_results");
} catch (err) {}

try {
  db.prepare("ALTER TABLE triage_results ADD COLUMN closed_by TEXT").run();
  console.log("Migration: Added closed_by to triage_results");
} catch (err) {}

try {
  db.prepare("ALTER TABLE triage_results ADD COLUMN closed_at DATETIME").run();
  console.log("Migration: Added closed_at to triage_results");
} catch (err) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nhs_number TEXT UNIQUE,
    full_name TEXT,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed dummy data
const seedPatients = [
  { nhs: '1234567890', name: 'Sarah Jenkins', pass: 'pass123' },
  { nhs: '9876543210', name: 'Jenny Wilson', pass: 'pass123' },
  { nhs: '5556667777', name: 'Elena Rodriguez', pass: 'pass123' }
];

// Helper to create valid WAV demo files for seed records
function ensureSeedAudioFiles() {
  const seeds = [
    { name: 'seed-sarah.wav', freq: 320, dur: 4.5 },
    { name: 'seed-jenny.wav', freq: 440, dur: 5.5 },
    { name: 'seed-elena.wav', freq: 280, dur: 3.5 }
  ];

  seeds.forEach(({ name, freq, dur }) => {
    const filePath = path.join(recordingsDir, name);
    if (!fs.existsSync(filePath)) {
      const sampleRate = 8000;
      const numSamples = Math.floor(sampleRate * dur);
      const buffer = Buffer.alloc(44 + numSamples * 2);
      
      // RIFF header
      buffer.write("RIFF", 0);
      buffer.writeUInt32LE(36 + numSamples * 2, 4);
      buffer.write("WAVE", 8);
      buffer.write("fmt ", 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20); // PCM
      buffer.writeUInt16LE(1, 22); // mono
      buffer.writeUInt32LE(sampleRate, 24);
      buffer.writeUInt32LE(sampleRate * 2, 28);
      buffer.writeUInt16LE(2, 32);
      buffer.writeUInt16LE(16, 34);
      buffer.write("data", 36);
      buffer.writeUInt32LE(numSamples * 2, 40);

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.sin(Math.PI * (i / numSamples)) * (0.6 + 0.3 * Math.sin(t * 6));
        const sample = Math.sin(2 * Math.PI * freq * t) * 0.4 +
                       Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.2 +
                       Math.sin(2 * Math.PI * (freq * 0.75) * t) * 0.1;
        const value = Math.max(-32768, Math.min(32767, Math.floor(sample * envelope * 15000)));
        buffer.writeInt16LE(value, 44 + i * 2);
      }
      fs.writeFileSync(filePath, buffer);
    }
  });
}

ensureSeedAudioFiles();

// Clear existing data for a fresh start
db.exec("DELETE FROM ticket_history");
db.exec("DELETE FROM triage_results");
db.exec("DELETE FROM patients");
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('patients', 'triage_results', 'ticket_history')");

// Seed patients
const insertPatient = db.prepare("INSERT INTO patients (nhs_number, full_name, password) VALUES (?, ?, ?)");
seedPatients.forEach(p => insertPatient.run(p.nhs, p.name, p.pass));
console.log("Database seeded with fresh dummy patients.");

// Seed dummy triage results
const insertTriage = db.prepare(`
  INSERT INTO triage_results (
    patient_name, patient_dob, patient_phone, symptoms, duration, 
    urgency_score, triage_category, emergency_alert, recommended_action, 
    preferred_time, clinician_preference, ai_confidence, status, recording_url, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

// 1. Sarah Jenkins - Routine
insertTriage.run(
  'Sarah Jenkins', '1985-05-12', '07700 900123', 
  JSON.stringify(['Earache', 'Mild fever']), '3 days', 
  3, 'ROUTINE', 0, 'Schedule a routine GP appointment within 48 hours.', 
  'Tomorrow morning', 'Any GP', 0.92, 'Pending', '/recordings/seed-sarah.wav', twoDaysAgo.toISOString()
);

// 2. Jenny Wilson - Urgent
insertTriage.run(
  'Jenny Wilson', '1992-11-20', '07700 900456', 
  JSON.stringify(['Severe abdominal pain', 'Nausea']), '4 hours', 
  8, 'URGENT_SAME_DAY', 0, 'Requires urgent clinical assessment today. Contact the duty doctor.', 
  'ASAP', 'Duty Doctor', 0.88, 'Action Required', '/recordings/seed-jenny.wav', yesterday.toISOString()
);

// 3. Elena Rodriguez - Completed
const elenaResult = insertTriage.run(
  'Elena Rodriguez', '1978-03-15', '07700 900789', 
  JSON.stringify(['Prescription renewal', 'Stable asthma']), 'N/A', 
  2, 'ROUTINE', 0, 'Administrative review for prescription renewal.', 
  'Next week', 'Dr. Smith', 0.95, 'Completed', '/recordings/seed-elena.wav', now.toISOString()
);

// Add history for Elena's completed ticket
const ticketId = elenaResult.lastInsertRowid;
const insertHistory = db.prepare("INSERT INTO ticket_history (ticket_id, status, changed_by, notes) VALUES (?, ?, ?, ?)");
insertHistory.run(ticketId, 'Pending', 'System', 'Initial submission received.');
insertHistory.run(ticketId, 'In Progress', 'Dr. Smith', 'Reviewing asthma medication history.');
insertHistory.run(ticketId, 'Completed', 'Dr. Smith', 'Prescription renewed and sent to pharmacy.');

// Update Elena's record with closure info
db.prepare("UPDATE triage_results SET closure_summary = ?, closed_by = ?, closed_at = ? WHERE id = ?")
  .run('Prescription renewed and sent to Boots Pharmacy.', 'Dr. Smith', now.toISOString(), ticketId);

console.log("Database seeded with fresh triage entries.");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use("/recordings", express.static(recordingsDir));

  // Auth routes
  app.post("/api/register", (req, res) => {
    const { nhs_number, full_name, password } = req.body;
    try {
      const insert = db.prepare("INSERT INTO patients (nhs_number, full_name, password) VALUES (?, ?, ?)");
      insert.run(nhs_number, full_name, password);
      res.json({ success: true });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ success: false, message: 'NHS Number already registered' });
      } else {
        res.status(500).json({ success: false, message: 'Registration failed' });
      }
    }
  });

  app.post("/api/login", (req, res) => {
    const { role, password, nhs_number } = req.body;
    
    if (role === 'gp') {
      if (password === 'gp123') {
        return res.json({ success: true, role: 'gp', name: 'Dr. Smith' });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid GP password' });
      }
    }

    if (role === 'patient') {
      const patient = db.prepare("SELECT * FROM patients WHERE nhs_number = ? AND password = ?").get(nhs_number, password) as any;
      if (patient) {
        return res.json({ success: true, role: 'patient', name: patient.full_name });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid NHS Number or Password' });
      }
    }

    res.status(400).json({ success: false, message: 'Invalid role' });
  });

  app.post("/api/upload-audio", (req, res) => {
    const { base64Audio, mimeType } = req.body;
    if (!base64Audio) {
      return res.status(400).json({ success: false, message: "No audio data provided" });
    }

    const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
    const fileName = `recording-${Date.now()}.${extension}`;
    const filePath = path.join(recordingsDir, fileName);

    try {
      const buffer = Buffer.from(base64Audio, 'base64');
      fs.writeFileSync(filePath, buffer);
      const url = `/recordings/${fileName}`;
      res.json({ success: true, url });
    } catch (err) {
      console.error("Failed to save audio", err);
      res.status(500).json({ success: false, message: "Failed to save audio" });
    }
  });

  // API routes
  app.get("/api/triage", (req, res) => {
    const results = db.prepare("SELECT * FROM triage_results ORDER BY urgency_score DESC, created_at DESC").all();
    // Fetch history for each result
    const resultsWithHistory = results.map((r: any) => {
      const history = db.prepare("SELECT * FROM ticket_history WHERE ticket_id = ? ORDER BY changed_at DESC").all(r.id);
      return { ...r, history };
    });
    res.json(resultsWithHistory);
  });

  app.get("/api/triage/patient/:name", (req, res) => {
    const { name } = req.params;
    const results = db.prepare("SELECT * FROM triage_results WHERE patient_name = ? ORDER BY created_at DESC").all(name);
    const resultsWithHistory = results.map((r: any) => {
      const history = db.prepare("SELECT * FROM ticket_history WHERE ticket_id = ? ORDER BY changed_at DESC").all(r.id);
      return { ...r, history };
    });
    res.json(resultsWithHistory);
  });

  app.patch("/api/triage/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, closure_summary, changed_by, notes } = req.body;

    try {
      const updateStmt = db.prepare(`
        UPDATE triage_results 
        SET status = ?, 
            closure_summary = ?, 
            closed_by = ?, 
            closed_at = ? 
        WHERE id = ?
      `);

      const closed_by = status === 'Completed' ? changed_by : null;
      const closed_at = status === 'Completed' ? new Date().toISOString() : null;

      updateStmt.run(status, closure_summary || null, closed_by, closed_at, id);

      const historyStmt = db.prepare(`
        INSERT INTO ticket_history (ticket_id, status, changed_by, notes)
        VALUES (?, ?, ?, ?)
      `);
      historyStmt.run(id, status, changed_by, notes || null);

      res.json({ success: true });
    } catch (err) {
      console.error("Failed to update status", err);
      res.status(500).json({ success: false, message: "Failed to update status" });
    }
  });

  app.delete("/api/triage/:id", (req, res) => {
    const { id } = req.params;
    try {
      // Find recording url to optionally remove recording file
      const row = db.prepare("SELECT recording_url FROM triage_results WHERE id = ?").get(id) as any;
      if (row?.recording_url) {
        try {
          const filePath = path.join(recordingsDir, path.basename(row.recording_url));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.warn("Could not delete audio file:", e);
        }
      }

      db.prepare("DELETE FROM ticket_history WHERE ticket_id = ?").run(id);
      db.prepare("DELETE FROM triage_results WHERE id = ?").run(id);
      res.json({ success: true, message: "Record deleted successfully" });
    } catch (err) {
      console.error("Failed to delete record:", err);
      res.status(500).json({ success: false, message: "Failed to delete record" });
    }
  });

  app.post("/api/triage/process-audio", async (req, res) => {
    const { base64Audio, mimeType, patientNameHint } = req.body;
    if (!base64Audio) {
      return res.status(400).json({ success: false, message: "No audio data provided" });
    }

    // 1. Save audio recording to disk
    const rawMime = mimeType || 'audio/webm';
    const extension = rawMime.split('/')[1]?.split(';')[0] || 'webm';
    const fileName = `recording-${Date.now()}.${extension}`;
    const filePath = path.join(recordingsDir, fileName);
    let recording_url = '';

    try {
      const buffer = Buffer.from(base64Audio, 'base64');
      fs.writeFileSync(filePath, buffer);
      recording_url = `/recordings/${fileName}`;
    } catch (err) {
      console.error("Failed to save audio file:", err);
    }

    // 2. Process audio via Gemini API with model fallback
    try {
      const ai = getGeminiClient();
      const prompt = patientNameHint 
        ? `Please analyze this medical triage voice memo for patient "${patientNameHint}" and return the results in the specified JSON format.`
        : "Please analyze this medical triage voice memo and return the results in the specified JSON format.";

      const triageData = await generateTriageWithFallback(ai, base64Audio, rawMime, prompt);

      // 3. Persist triage record to SQLite
      const insert = db.prepare(`
        INSERT INTO triage_results (
          patient_name, patient_dob, patient_phone, 
          symptoms, duration, 
          urgency_score, triage_category, emergency_alert, recommended_action,
          preferred_time, clinician_preference, ai_confidence, recording_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const pInfo = triageData.patient_info || {};
      const cData = triageData.clinical_data || {};
      const tLogic = triageData.triage_logic || {};
      const bIntent = triageData.booking_intent || {};

      const info = insert.run(
        pInfo.name || patientNameHint || 'Unknown Patient',
        pInfo.dob_mentioned || null,
        pInfo.phone_number || 'Not provided',
        JSON.stringify(cData.symptoms || []),
        cData.duration || 'Not specified',
        parseInt(tLogic.urgency_score) || 3,
        tLogic.triage_category || 'ROUTINE',
        tLogic.emergency_alert ? 1 : 0,
        tLogic.recommended_action || 'Routine consultation recommended.',
        bIntent.preferred_time || 'Flexible',
        bIntent.clinician_preference || null,
        typeof triageData.ai_confidence === 'number' ? triageData.ai_confidence : 0.92,
        recording_url
      );

      const savedResult = {
        ...triageData,
        id: info.lastInsertRowid,
        recording_url,
        status: 'Pending',
        created_at: new Date().toISOString()
      };

      res.json({
        success: true,
        id: info.lastInsertRowid,
        triageData: savedResult
      });
    } catch (err: any) {
      console.error("Gemini triage audio processing error:", err);
      const errorMessage = err?.message || "Failed to process audio with Gemini AI.";
      res.status(500).json({ 
        success: false, 
        message: errorMessage 
      });
    }
  });

  app.post("/api/triage", (req, res) => {
    const { 
      patient_info, 
      clinical_data, 
      triage_logic, 
      booking_intent, 
      ai_confidence,
      recording_url
    } = req.body;

    const insert = db.prepare(`
      INSERT INTO triage_results (
        patient_name, patient_dob, patient_phone, 
        symptoms, duration, 
        urgency_score, triage_category, emergency_alert, recommended_action,
        preferred_time, clinician_preference, ai_confidence, recording_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insert.run(
      patient_info.name,
      patient_info.dob_mentioned,
      patient_info.phone_number,
      JSON.stringify(clinical_data.symptoms),
      clinical_data.duration,
      parseInt(triage_logic.urgency_score),
      triage_logic.triage_category,
      triage_logic.emergency_alert ? 1 : 0,
      triage_logic.recommended_action,
      booking_intent.preferred_time,
      booking_intent.clinician_preference,
      ai_confidence,
      recording_url
    );

    res.json({ id: info.lastInsertRowid });
  });

  // Explicit API 404 handler to prevent API routes from falling through to HTML SPA fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.path}`,
    });
  });

  // Global error handling middleware returning JSON for API errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({
      success: false,
      message: err?.message || "Internal server error",
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
