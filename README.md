# Nikitria

A gamified life-RPG web app with an AI coach (Niki). Real-life actions earn XP across five stats (Body, Mind, Career, Social, Spirit), Niki generates daily quests in her own voice, and a long progression system layers in classes, weekly arcs, party quests, achievements, a Spark economy, and a paywall.

Web prototype built end-to-end from the Nikitria MVP Build Specification. Backend is a tiny Express server that proxies OpenAI. Frontend is vanilla HTML/CSS/JS — no build step.

## Features

- **Onboarding** — 7-step conversational flow with Niki AI reflection
- **Niki chat** — persona guardrails, crisis pipeline, rate-limited free tier, explicit memory capture
- **Daily quests** — AI-generated based on character + recent activity, 1/2/3 slots by level
- **Weekly quests** — AI-generated 7-day narrative arcs (unlock at level 15)
- **Story arcs** — long 4–12 week AI-designed plans toward a stated goal
- **Character sheet** — 5 stats with 30-day sparklines, drill-in, titles, season banner
- **XP / leveling** — 50-level curve, streak multiplier (×1.0→×1.5), class bonuses (+15%), level-up takeover
- **Streaks + freezes** — auto-freeze on miss, Return Quest after broken streak
- **Habits** — up to 6, with stat mapping and 3 size tiers
- **Journal** — moods, Niki writing prompts, async reflection, 200-word XP threshold
- **Friends / party / feed / leaderboards** — invite, party quests, weekly + global (opt-in)
- **Achievements** — 80 achievements across 4 tiers, Spark rewards
- **Shop** — 60+ cosmetic items + utilities, Spark currency, gate logic, equip
- **Notifications** — in-app center + browser Notification API + evening streak reminder
- **Settings + privacy** — tone picker, data export (JSON + journal markdown), Niki memory viewer, reset
- **Nikitria+ paywall** — demo upgrade flow with comparison + monthly/yearly plans
- **Classes / Prestige / Mastery / Seasons** — full progression layer

## Tech

- **Backend** — Node.js + Express, proxies OpenAI Chat Completions
- **Frontend** — vanilla HTML/CSS/JS, no framework, no build step
- **Persistence** — `localStorage` (single-user web prototype)
- **AI** — OpenAI `gpt-4o-mini` for all Niki tiers (swap models in `server.js → MODELS`)

## Setup

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- An OpenAI API key — get one at https://platform.openai.com/api-keys

### Install & run

```bash
git clone https://github.com/<your-username>/nikki.git
cd nikki
npm install
cp .env.example .env
# Edit .env and paste your OpenAI key
npm start
```

Open http://localhost:3000.

### Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | yes | — | Your OpenAI secret key (server-side only — never exposed to the client) |
| `PORT` | no | `3000` | Port the server listens on |

## Project layout

```
nikki/
├── server.js          # Express server + OpenAI proxy + Niki persona/guardrails
├── package.json
├── .env.example       # Template — copy to .env and fill in
├── .gitignore         # Excludes .env, node_modules, etc
├── README.md
└── public/
    ├── index.html
    ├── styles.css
    ├── content.js     # Static data: 80 achievements, 60+ shop items, classes, seasons
    └── app.js         # All client logic — state, tabs, XP engine, AI calls, UI
```

## API endpoints

All endpoints are POST and return JSON. Body is `application/json`.

| Endpoint | Purpose |
|---|---|
| `/api/niki/chat` | Multi-turn chat with Niki (with crisis short-circuit) |
| `/api/niki/onboarding` | Process onboarding answers; returns reflection + stat weights + first quest |
| `/api/niki/quests` | Generate today's daily quests for the character |
| `/api/niki/weekly` | Generate a 7-day narrative weekly quest |
| `/api/niki/story` | Design a 4–12 week story arc toward a goal |
| `/api/niki/party-quest` | Generate a 7-day party quest |
| `/api/niki/reflect` | Async 2-sentence Niki reflection on a journal entry |
| `/api/niki/class-advice` | Recommend a class at level 10 based on stats |
| `/api/niki/return-quest` | Generate a recovery quest after a broken streak |

## Niki persona

Niki is a coach and narrator — explicitly NOT a therapist, friend, romantic partner, or general chatbot. Hard guardrails in the system prompt enforce:
- Redirect on romantic/sexual steering
- Decline medical/legal/financial advice with a "talk to a professional" line
- Crisis keyword short-circuit returns a verbatim helpline message (US 988, UK Samaritans 116 123, India iCall 9152987821)

See `server.js → NIKI_SYSTEM_BASE` for the full system prompt.

## Limitations

This is a web prototype. The full spec ships on React Native / Expo / Supabase / RevenueCat with native push, Apple Health, and real multi-user. Specifically:

- No real backend — `localStorage` only. Friends, party, leaderboard use simulated peers.
- No Apple Health / Google Fit (native-only APIs)
- No real push notifications on iOS PWAs (uses browser `Notification` API only)
- No real IAP — the Nikitria+ paywall is a demo toggle (in production this routes through RevenueCat)
- No real auth — single-user per browser

## Security

- `OPENAI_API_KEY` lives server-side only; the client never sees it
- `.env` is gitignored. If you ever accidentally commit a key, rotate it immediately at https://platform.openai.com/api-keys
- Niki's content moderation pipeline is minimal in this prototype (crisis keyword regex only) — the spec calls for OpenAI Moderation API in production

## License

Choose one before publishing (MIT is a sensible default).
