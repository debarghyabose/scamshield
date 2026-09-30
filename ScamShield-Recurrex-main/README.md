# 🛡️ ScamShield

### Scam & Fraud Detection Platform

> **Detect. Analyze. Protect.**
>
> ScamShield helps users identify potentially fraudulent SMS messages, suspicious URLs, and common scam patterns before they become victims.

<p align="center">

![ScamShield](https://img.shields.io/badge/ScamShield-Scam%20Detection-red?style=for-the-badge&logo=shield&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build%20Tool-646CFF?style=for-the-badge&logo=vite&logoColor=white)

</p>

---

## 🚨 The Problem

Online scams are becoming increasingly sophisticated.

Fraudsters commonly use:

- 📱 Fake SMS messages
- 🔗 Malicious or deceptive URLs
- 🏦 Fake banking alerts
- 🎁 Fraudulent reward messages
- 🔐 Account verification scams
- 💳 Fake payment requests
- 👤 Impersonation attempts

Many users cannot easily distinguish between a legitimate message and a carefully crafted scam.

**ScamShield aims to make this analysis simple and accessible.**

---

# 💡 Our Solution

**ScamShield** is a web-based scam detection platform that analyzes suspicious messages and URLs and provides users with an understandable risk assessment.

Instead of expecting users to manually investigate a suspicious message, ScamShield analyzes available information and presents the result through a simple interface.

### 🔍 Core Workflow

```text
        👤 USER
           │
           ▼
   ┌──────────────────┐
   │ Enter SMS / URL  │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ React Frontend   │
   │    (Vercel)      │
   └────────┬─────────┘
            │
            │ HTTPS API
            ▼
   ┌──────────────────┐
   │ FastAPI Backend  │
   │     (Render)     │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Fraud Analysis   │
   │ & Risk Detection │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Risk Assessment  │
   │ + Explanation    │
   └────────┬─────────┘
            │
            ▼
        👤 USER
```

---

# ✨ Features

## 📱 SMS Scam Detection

Analyze suspicious SMS messages and identify potential scam indicators.

### Detects patterns such as:

- 🎁 Fake rewards
- 💰 Suspicious financial offers
- 🔐 Fake account verification
- 🏦 Banking impersonation
- 🔗 Suspicious links
- ⚠️ Urgency-based language
- 👤 Potential impersonation

---

## 🔗 URL Security Analysis

Users can submit a suspicious URL for analysis.

ScamShield can inspect characteristics such as:

- 🌐 Domain structure
- 🔍 URL patterns
- 📅 Domain information
- ⚠️ Suspicious keywords
- 🏦 Target-domain impersonation
- 🔀 Potentially deceptive domains

Example:

```text
https://secure-sbi-login-example.com
```

can be flagged for characteristics that may indicate an attempt to impersonate a legitimate service.

---

## 📊 Risk Assessment

ScamShield converts its analysis into an easy-to-understand result.

Example:

```text
┌───────────────────────────────┐
│        ⚠️ HIGH RISK           │
│                               │
│  Suspicious scam indicators   │
│  detected in this message.    │
│                               │
│  Risk Score: 87/100           │
└───────────────────────────────┘
```

The goal is to make the result understandable even for users without technical knowledge.

---

## 🧠 Explainable Detection

Instead of simply displaying:

> ❌ SCAM

ScamShield can provide contextual information about **why** something was flagged.

For example:

```text
⚠️ Suspicious Indicators

• Contains an urgent call to action
• Requests the user to click a link
• Uses financial/reward-related language
• URL appears suspicious
```

This helps users understand the warning rather than blindly trusting a score.

---

# 🛠️ Technology Stack

## 🎨 Frontend

| Technology | Purpose |
|---|---|
| ⚛️ React | User interface |
| ⚡ Vite | Development & build tooling |
| 🎨 CSS / UI Components | Interface styling |
| 🌐 Fetch API | Backend communication |

## ⚙️ Backend

| Technology | Purpose |
|---|---|
| 🐍 Python | Backend logic |
| ⚡ FastAPI | REST API |
| 🔎 URL Analysis | Suspicious URL inspection |
| 🧠 Detection Logic | Scam analysis |

## ☁️ Deployment

| Platform | Component |
|---|---|
| ▲ Vercel | React frontend |
| 🚀 Render | FastAPI backend |
| 🐙 GitHub | Source code & version control |

---

# 🏗️ Project Architecture

```text
                 ┌──────────────────┐
                 │      USER        │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  React + Vite    │
                 │    Frontend      │
                 └────────┬─────────┘
                          │
                       HTTPS
                          │
                          ▼
                 ┌──────────────────┐
                 │     FastAPI      │
                 │     Backend      │
                 └────────┬─────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
      ┌─────────────────┐     ┌─────────────────┐
      │  SMS Analysis   │     │  URL Analysis   │
      └────────┬────────┘     └────────┬────────┘
               │                       │
               └───────────┬───────────┘
                           ▼
                 ┌──────────────────┐
                 │  Risk Assessment │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   Result +       │
                 │   Explanation    │
                 └──────────────────┘
```

---

# 📁 Project Structure

```text
ScamShield/
│
├── 📁 frontend/
│   ├── 📁 public/
│   ├── 📁 src/
│   │   ├── 📁 components/
│   │   ├── 📁 pages/
│   │   ├── 📁 services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── 📁 backend/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
│
└── 📄 README.md
```

> **Note:** Update this structure if the actual repository uses a different organization.

---

# 🚀 Getting Started

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/JoyMukherjee3012/SnapShield.git
```

```bash
cd SnapShield
```

> If the repository is renamed to `ScamShield`, update the clone URL and directory name accordingly.

---

# 🎨 Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:5173
```

---

# ⚙️ Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

### Windows

```bash
python -m venv venv
```

Activate it:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn main:app --reload
```

The API will normally run at:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

# 🔐 Environment Variables

The frontend uses an environment variable to communicate with the backend.

Create:

```text
.env
```

Example:

```env
VITE_API_URL=http://127.0.0.1:8000
```

For production:

```env
VITE_API_URL=https://YOUR-BACKEND.onrender.com
```

> ⚠️ Never commit private API keys, passwords, secret tokens, or other credentials to GitHub.

---

# ☁️ Deployment

## ▲ Frontend → Vercel

The React/Vite frontend can be deployed through Vercel.

```text
GitHub
   │
   ▼
Vercel
   │
   ▼
React + Vite
```

Typical build configuration:

```text
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

---

## 🚀 Backend → Render

The FastAPI backend can be deployed as a Render Web Service.

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Production architecture:

```text
🌐 Vercel
    │
    │ HTTPS API Request
    ▼
🚀 Render
    │
    ▼
⚡ FastAPI
    │
    ▼
🔍 Scam Detection
```

---

# 🔄 API Communication

The frontend communicates with the backend through HTTP APIs.

Example:

```javascript
const response = await fetch(`${API_URL}/scan-sms`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message: sms
    })
});
```

The backend processes the request and returns a JSON response.

---

# 🛡️ Security Considerations

ScamShield is designed as a **scam detection and awareness tool**.

Users should still exercise caution when dealing with:

- 💳 Financial requests
- 🔐 Login credentials
- 🔑 OTPs
- 🏦 Banking information
- 📱 Unknown phone numbers
- 🔗 Untrusted links

A detection result should not be treated as an absolute guarantee that a message or URL is safe or malicious.

---

# 🎯 Future Improvements

Potential future improvements include:

- 🤖 Advanced ML-based scam classification
- 📱 Native Android application
- 🔔 Real-time scam alerts
- 📈 Detection analytics dashboard
- 🌍 Multi-language scam detection
- 🧠 Improved NLP-based message analysis
- 🔗 More advanced URL reputation analysis
- 🗄️ Detection history
- 👤 User accounts
- 📊 Personal security dashboard
- 📩 Direct SMS scanning with appropriate device permissions

---

# 🧪 Example Detection

### Suspicious Message

```text
Congratulations! You have won ₹50,000.
Claim your reward immediately by clicking:
https://example-suspicious-site.com
```

### ScamShield Analysis

```text
⚠️ HIGH RISK

Potential indicators:

🔴 Prize/reward claim
🔴 Urgent call to action
🔴 Suspicious external link
🔴 Financial incentive
```

---

# 📌 Project Status

🟢 **Active Development**

ScamShield is currently being developed and improved with additional detection capabilities and deployment infrastructure.

---

# 👨‍💻 Team

### ScamShield Team

Built for safer digital communication.

| Member | Role |
|---|---|
| 👨‍💻 Joy Mukherjee | Full Stack / Frontend |
| 👨‍💻 Team Member | Backend |
| 👨‍💻 Team Member | Detection / Analysis |
| 👨‍💻 Team Member | UI/UX |

> Replace the placeholder team members with the actual team names and roles.

---

# 📜 License

This project is intended for educational, research, and hackathon purposes.

Add an appropriate open-source license if the project is released for public reuse.

---

<p align="center">

## 🛡️ ScamShield

**Detect scams. Understand the risk. Stay protected.**

⭐ Star the repository if you find the project useful.

</p>
