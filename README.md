# Rayena

> **Ancient Wisdom × Modern AI × Real-Time Planetary Data**
>
> A full-stack Vedic astrology platform with AI-grounded predictions, dating
> mode, and a 100-book classical text knowledge base.

## ✨ Features

### Core Astrology (11)
- 🧠 **AI Q&A** — ask any life question, get a Vedic chart-grounded answer
- 📅 **Yearly Prediction Report** — 10-section annual forecast (career, love, health, finances, month-by-month, remedies)
- ❤️ **Compatibility / Kundli Matching** — Ashtakoot 36-point + Mangal Dosha + AI interpretation
- 🌙 **Dream Interpretation** — Vedic + Ibn Sirin + Artemidorus, contextualised by current Moon
- 🃏 **Tarot Reading** — planetary-weighted 78-card deck, two-step (lay → choose) flow
- ✋ **Palm Reading** — OpenAI Vision + Samudrika Shastra + Cheiro + Benham
- 🔮 **Past Prediction Validation** — Nadi-style 3 events that verify accuracy before predicting future
- 🔢 **Numerology** — Pythagorean + Chaldean systems
- ❓ **Prashna / Horary** — KP 1-249 sub-lord system
- 🗓️ **Panchang** — Tithi, Nakshatra, Yoga, Karana, Vaara
- 🛎️ **Daily Horoscope** — personalised by chart

### Dating Mode (12)
- Cosmic compatibility scoring (6-dimension 0-100 algorithm)
- Astrology-native discovery feed with swipe + match
- AI planetary icebreakers (1 credit per generation)
- Vedic Chemistry Report (15 credits, 5-page essay)
- Composite chart analysis (20 credits)
- Past-life karmic connection (25 credits)
- Cosmic Weather daily love forecast
- Muhurta for first dates
- Prashna "Should I message?" (5 credits)
- Cosmic Mixers IRL events
- 4-tier subscriptions (Free / Cosmic ₹199 / Stellar ₹499 / Divine ₹999)

### Book-Grounded AI
Every AI response is grounded in real text from a **100+ book** library covering:
**Brihat Parashara Hora Shastra • Brihat Jataka • Phaladeepika • Saravali • Uttara Kalamrita • Lal Kitab • Cheiro's Book of Numbers • Ibn Sirin's Dictionary of Dreams • Samudrika Shastra • Muhurta Chintamani • Prasna Marga • Jataka Chandrika • Stree Jataka • Mantra Mahodadhi • Pictorial Key to the Tarot • Book of Thoth** — and many more.

Every reading ends with a "📚 Books Consulted from Rayena Library" citations list.

## 🏗️ Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, Zustand, TypeScript |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy async (or Firestore) |
| **Database** | SQLite (local dev) or Firebase Firestore (production) |
| **Auth** | Firebase Auth (or local JWT for dev) |
| **AI** | OpenAI GPT-4o (text) + GPT-4o Vision (palm reading) |
| **Astro Engine** | pyswisseph + custom Vedic modules (Dasha, Yogas, Shadbala, Ashtakavarga, Navamsa) |
| **RAG** | In-memory keyword search over book knowledge base |

## 📁 Structure

```
rayena/
├── backend/                      # FastAPI app (port 8000)
│   ├── main.py                   # App entry
│   ├── routers/                  # 20+ API routers (auth, charts, readings, dating, ...)
│   ├── models/                   # SQLAlchemy models
│   ├── services/
│   │   ├── astro/                # Swiss Ephemeris wrapper, Dasha, Yogas, Panchang, Muhurta
│   │   ├── ai/                   # OpenAI client, RAG, 20 prompt templates, book knowledge
│   │   ├── dating/               # Compatibility engine, discovery, AI features
│   │   ├── tarot/                # 78-card deck, planetary weighting, spreads
│   │   ├── palm/                 # Vision API + book-grounded interpretation
│   │   └── numerology/           # Pythagorean + Chaldean
│   ├── data/                     # Seed data (interests, prompts)
│   ├── firebase_config.py        # Firebase Admin SDK init
│   ├── firebase_db.py            # Firestore helper layer
│   └── requirements.txt
│
├── frontend/                     # Next.js 14 (port 3000)
│   ├── src/
│   │   ├── app/                  # Pages (dashboard, dating/, tarot, palm, ...)
│   │   ├── components/           # React components (charts, dating cards, ...)
│   │   └── lib/                  # API client, Zustand stores, Firebase init
│   └── package.json
│
├── firebase.json                 # Firebase Hosting + Firestore config
├── firestore.rules               # Security rules
├── firestore.indexes.json
├── .env.example                  # Backend env template
└── README.md
```

## 🚀 Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**
- An **OpenAI API key** (https://platform.openai.com/api-keys)
- A **Firebase project** (optional — for production; SQLite works for dev)

### 1. Clone
```bash
git clone https://github.com/<you>/rayena.git
cd rayena
```

### 2. Backend
```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate           # Windows
# source .venv/bin/activate      # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cd ..
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY + JWT_SECRET

# Run
cd backend
python main.py
# → http://localhost:8000  (API docs at /docs)
```

### 3. Frontend
```bash
cd frontend

# Install dependencies
npm install

# Configure environment (only needed if using Firebase Auth)
cp .env.local.example .env.local
# Edit .env.local with your Firebase web app config

# Run
npm run dev
# → http://localhost:3000
```

### 4. Firebase (Optional, Production)
If you want to use Firebase Auth + Firestore instead of local SQLite:

1. Create a project at https://console.firebase.google.com
2. Enable **Authentication → Email/Password** and **Firestore Database**
3. Download a **service account key** (Settings → Service Accounts → Generate New Private Key)
4. Save it as `rayena/serviceAccountKey.json` (already gitignored)
5. Copy the Firebase web app config into `frontend/.env.local`
6. Set `FIREBASE_PROJECT_ID` and `FIREBASE_STORAGE_BUCKET` in `.env`

Deploy hosting + rules:
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

## 🧪 API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Total endpoints: **70+** across auth, profiles, charts, readings, tarot, palm, dreams, compatibility, numerology, prashna, and 6 dating routers.

## 🔐 Security Notes

- **`.env` and `serviceAccountKey.json` are gitignored** — never commit secrets
- Use `.env.example` and `.env.local.example` as templates only
- For production, prefer **environment variables** or a secret manager (GCP Secret Manager, AWS SM, etc.) over files
- Rotate the JWT secret and API keys before public deployment
- Review `firestore.rules` before opening Firestore to public traffic

## 📜 License

This project is for educational and personal use. Classical text excerpts in
the book knowledge base are from public domain editions (Santhanam, Iyer, etc.).
The Rayena codebase itself is **not currently licensed for redistribution** —
add a LICENSE file before publishing if you want to open-source it.

## 🙏 Credits

Built on the shoulders of millennia of astrological tradition. Classical texts:
**Sage Parashara, Varahamihira, Kalyana Varma, Mantreshwara, Kalidasa, Cheiro,
William Benham, Ibn Sirin, Artemidorus**, and dozens more.

Modern stack: **Next.js, FastAPI, OpenAI, Firebase, pyswisseph, Swiss Ephemeris**.
