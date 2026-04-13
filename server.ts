import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("triage.db");

// Ensure recordings directory exists
const recordingsDir = path.join(__dirname, "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
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
    preferred_time, clinician_preference, ai_confidence, status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

// 1. Sarah Jenkins - Routine
insertTriage.run(
  'Sarah Jenkins', '1985-05-12', '07700 900123', 
  JSON.stringify(['Earache', 'Mild fever']), '3 days', 
  3, 'ROUTINE', 0, 'Schedule a routine GP appointment within 48 hours.', 
  'Tomorrow morning', 'Any GP', 0.92, 'Pending', twoDaysAgo.toISOString()
);

// 2. Jenny Wilson - Urgent
insertTriage.run(
  'Jenny Wilson', '1992-11-20', '07700 900456', 
  JSON.stringify(['Severe abdominal pain', 'Nausea']), '4 hours', 
  8, 'URGENT_SAME_DAY', 0, 'Requires urgent clinical assessment today. Contact the duty doctor.', 
  'ASAP', 'Duty Doctor', 0.88, 'Action Required', yesterday.toISOString()
);

// 3. Elena Rodriguez - Completed
const elenaResult = insertTriage.run(
  'Elena Rodriguez', '1978-03-15', '07700 900789', 
  JSON.stringify(['Prescription renewal', 'Stable asthma']), 'N/A', 
  2, 'ROUTINE', 0, 'Administrative review for prescription renewal.', 
  'Next week', 'Dr. Smith', 0.95, 'Completed', now.toISOString()
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
      db.prepare("DELETE FROM triage_results WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to delete record" });
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
