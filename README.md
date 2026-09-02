# MedTriage AI

MedTriage AI is an AI-powered medical triage and clinical intake system designed for UK-based GP surgeries. It streamlines the patient intake process by allowing patients to submit voice memos, which are then analyzed by advanced AI to extract clinical intent, prioritize urgency, and provide a structured dashboard for GP staff.

## 🚀 Key Features

### For Patients
- **Dedicated Patient Portal Login**: Secure NHS number authentication with registration support and 1-click demo account access.
- **Voice-First Intake**: Record live audio or upload audio memos describing symptoms and clinical concerns.
- **Automated Triage**: Receive immediate structured feedback on triage category and recommended actions.
- **Personal Health Dashboard**: Track the status and audit history of clinical submissions in an isolated, secure environment.
- **GP Feedback**: View closure summaries, doctor notes, and medical advice directly from the practice clinical team.

### For GP Staff
- **Dedicated GP Clinical Staff Login**: Clinical access code verification with Caldicott Principle audit notices and 1-click staff demo access.
- **Triage Dashboard**: Real-time, prioritized list of patient submissions scored by clinical urgency.
- **Lifecycle Tracking**: Manage triage tickets across stages: *Pending*, *Action Required*, *In Progress*, and *Completed*.
- **Audit Trail & History**: Complete logging of every status update, timestamps, staff identity, and clinical notes.
- **Red Flag Clinical Safety**: Immediate detection of life-threatening emergencies (Emergency 999) and urgent same-day consultations.
- **Audio Playback**: Listen to original patient audio recordings directly within the dashboard.

## 🛠 Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide React icons.
- **Backend Service**: Express.js server providing server-side API proxying and security.
- **Database**: SQLite (via `better-sqlite3`) with schema migrations for tickets, patients, and lifecycle history.
- **AI Audio Processing**: Server-side Google Gemini (`@google/genai`) using structured JSON schema with resilient model fallback (`gemini-3.6-flash` → `gemini-3.7-flash` → `gemini-2.5-pro`) and retry mechanisms against high-demand conditions.

## 🚦 Getting Started

### Prerequisites
- Node.js installed.
- A Google Gemini API Key configured in your environment or Google AI Studio settings (`GEMINI_API_KEY`).

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## 🔐 Security & Clinical Standards
- **Role-Based Access Control (RBAC)**: Distinct access scopes and dashboards for patients vs. GP staff.
- **Patient Isolation**: Patients only access their own clinical history and submissions.
- **Server-Side AI Proxy**: API keys are securely protected server-side and never exposed to the client.
- **Clinical Safety Protocol**: Built-in red-flag safety checks for chest pain, acute respiratory distress, severe bleeding, neurological signs, and crisis indications.

## 🧪 Demo Accounts

### Patient Logins
- **Sarah Jenkins**: NHS `1234567890` / Password `pass123` (Pending routine earache submission)
- **Jenny Wilson**: NHS `9876543210` / Password `pass123` (Action required urgent submission)
- **Elena Rodriguez**: NHS `5556667777` / Password `pass123` (Completed prescription renewal with doctor closure notes)

### GP Staff Login
- **Access Code**: `gp123`

---
*Disclaimer: This tool is an AI clinical intake assistant designed to support workflow efficiency and GP prioritization. It does not replace independent professional medical judgment.*
