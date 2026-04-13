# MedTriage AI

MedTriage AI is a sophisticated, AI-powered medical triage and clinical intake system designed for UK-based GP surgeries. It streamlines the patient intake process by allowing patients to submit voice memos, which are then analyzed by advanced AI to extract clinical intent, prioritize urgency, and provide a structured dashboard for GP staff.

## 🚀 Key Features

### For Patients
- **Voice-First Intake**: Record or upload audio memos describing symptoms and concerns.
- **Automated Triage**: Receive immediate feedback on triage category and recommended actions.
- **Personal Health Dashboard**: Track the status of clinical submissions in an isolated, secure environment.
- **GP Feedback**: View closure summaries and advice directly from the clinical team.

### For GP Staff
- **Triage Dashboard**: A real-time, prioritized list of patient submissions integrated with clinical urgency scores.
- **Lifecycle Tracking**: Manage tickets through a full lifecycle: *Pending*, *Action Required*, *In Progress*, and *Completed*.
- **Audit Trail**: Transparent logging of every status change, including who made the change and clinical notes.
- **Urgency Categorization**: Automatic detection of "Red Flags" (Emergency 999) and Urgent Same-Day requirements using AI.
- **Audio Playback**: Listen to original patient recordings for full clinical context.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion (for animations), Lucide React (icons).
- **Backend**: Node.js, Express.
- **Database**: SQLite (via `better-sqlite3`) for robust, local data persistence.
- **AI Engine**: Google Gemini 2.5 Flash (via `@google/genai`) for high-accuracy medical audio analysis.

## 🚦 Getting Started

### Prerequisites
- Node.js installed.
- A Google Gemini API Key (set as `GEMINI_API_KEY` in your environment).

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## 🔐 Security & Standards
- **Role-Based Access Control (RBAC)**: Strict separation between Patient and GP views.
- **Patient Isolation**: Patients can only access their own clinical history.
- **Clinical Safety**: Built-in "Red Flag" detection logic to escalate life-threatening symptoms immediately.
- **NHS Digital Standards**: Designed with UK GP triage protocols in mind.

## 🧪 Demo Accounts

### Patient Access
- **Sarah Jenkins**: NHS `1234567890` / Password `pass123`
- **Jenny Wilson**: NHS `9876543210` / Password `pass123`
- **Elena Rodriguez**: NHS `5556667777` / Password `pass123`

### GP Staff Access
- **Access Code**: `gp123`

---
*Disclaimer: This is an AI-assisted triage tool. It is designed to support clinical decision-making, not replace professional medical judgment.*
