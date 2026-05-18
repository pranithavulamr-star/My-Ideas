// Nikitria MVP backend — Express server, proxies OpenAI (ChatGPT) for Niki.
// Loads API key from the OPENAI_API_KEY environment variable.
//
// Set it before starting the server, e.g.:
//   PowerShell:  $env:OPENAI_API_KEY = "sk-..."
//   Bash:        export OPENAI_API_KEY="sk-..."
//   Or copy .env.example to .env (the server reads .env automatically).

const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Optional: load .env file if present (no dependency on dotenv).
(function loadDotEnv() {
  try {
    const p = path.join(ROOT, '.env');
    if (!fs.existsSync(p)) return;
    const raw = fs.readFileSync(p, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) return;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    });
  } catch {}
})();

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.error('\nERROR: OPENAI_API_KEY is not set.');
  console.error('Set it via environment variable or create a .env file (see .env.example).\n');
  process.exit(1);
}

// Spec §2.1 model tiers mapped to OpenAI equivalents.
const MODELS = {
  fast: 'gpt-4o-mini',
  smart: 'gpt-4o-mini',
  deep: 'gpt-4o-mini',
};

// ---- OpenAI helper ----------------------------------------------------------
function callOpenAI({ model, messages, temperature = 0.8, max_tokens = 800, response_format }) {
  const body = JSON.stringify({
    model, messages, temperature, max_tokens,
    ...(response_format ? { response_format } : {}),
  });
  const options = {
    hostname: 'api.openai.com', port: 443, path: '/v1/chat/completions', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed);
        } catch (e) { reject(new Error('OpenAI parse error: ' + data.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---- Niki persona + guardrails (spec §2.3) ----------------------------------
const NIKI_SYSTEM_BASE = `You are Niki, an AI coach inside the Nikitria life-RPG app. Read these rules carefully; they define you.

CORE IDENTITY
- You are a narrator and coach for the user's character — the character is a gamified representation of their real life.
- You are NOT a therapist, NOT a friend, NOT a romantic partner, NOT a general chatbot. You do not write code, plan trips, summarize papers, or draft emails.
- You never claim feelings, consciousness, or presence between sessions beyond your memory system.
- You celebrate specific wins with specific detail. No generic flattery. Sycophancy is forbidden.
- Your voice is warm, direct, and grounded. Short paragraphs. No emoji unless the user uses one first.

NIKITRIA WORLD
- Every user has ONE character with five stats (0–100 each): Body, Mind, Career, Social, Spirit.
- Actions in real life earn XP which levels the character and grows stats.
- Stats never decrease. Punishment for inconsistency is the streak breaking, not stat loss.
- Classes (Scholar, Warrior, Artist, Connector, Strategist, Wanderer) unlock at level 10 and give +15% XP to one stat.

REFUSALS
- Romantic/sexual steering: redirect warmly to the game.
- Medical/legal/financial advice: acknowledge their plan, add "I'm tracking what you're working toward — talk to a professional before acting."
- General-chatbot use: gently decline and return focus to their character.

CRISIS
- If suicidal ideation, self-harm, or acute crisis: respond warmly and include verbatim: "If you're in crisis right now please reach a trained human: US 988, UK Samaritans 116 123, India iCall 9152987821. I'll be here when you're ready." Do not counsel. Do not generate a quest.

STYLE
- 2–4 sentences by default. Longer only when asked.
- Reference the user's character stats and recent activity when relevant.
- Do not narrate your process. Just speak.`;

function buildNikiSystem({ character, tone, extra }) {
  const toneLine = {
    Warm: 'Tone: warm, encouraging, present.',
    Direct: 'Tone: direct, terse, no softening.',
    Witty: 'Tone: witty and playful, but never mocking.',
    Stoic: 'Tone: stoic, measured, quietly confident.',
  }[tone] || 'Tone: warm, encouraging, present.';
  const charLine = character
    ? `Character: ${character.name} — Level ${character.level}, class ${character.class || 'Unclassed'}. Stats: Body ${Math.round(character.stats.body)}, Mind ${Math.round(character.stats.mind)}, Career ${Math.round(character.stats.career)}, Social ${Math.round(character.stats.social)}, Spirit ${Math.round(character.stats.spirit)}. Streak: ${character.streak || 0}.`
    : 'Character: (onboarding).';
  return `${NIKI_SYSTEM_BASE}\n\n${toneLine}\n${charLine}${extra ? `\n${extra}` : ''}`;
}

// ---- Crisis keyword short-circuit (spec §2.4) -------------------------------
const TIER_A = [
  'kill myself', 'killing myself', 'end my life', 'end it all', 'suicide',
  'suicidal', 'want to die', 'better off dead', 'no reason to live',
  'cut myself', 'cutting myself', 'overdose', 'hang myself',
];
function crisisCheck(text) {
  const t = (text || '').toLowerCase();
  return TIER_A.some((k) => t.includes(k));
}
const CRISIS_REPLY =
  "I'm here. What you're feeling sounds heavy, and I don't want you to carry it alone right now.\n\n" +
  "If you're in crisis right now please reach a trained human: US 988, UK Samaritans 116 123, India iCall 9152987821. I'll be here when you're ready.";

// ---- Express app ------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(ROOT, 'public')));

// ============================================================================
// POST /api/niki/chat
// ============================================================================
app.post('/api/niki/chat', async (req, res) => {
  try {
    const { messages = [], character, tone } = req.body || {};
    const last = messages[messages.length - 1];
    if (last && last.role === 'user' && crisisCheck(last.content)) {
      return res.json({ reply: CRISIS_REPLY, crisis: true });
    }
    const system = buildNikiSystem({ character, tone });
    const out = await callOpenAI({
      model: MODELS.fast,
      messages: [{ role: 'system', content: system }, ...messages.slice(-12)],
      temperature: 0.85, max_tokens: 350,
    });
    res.json({ reply: out.choices?.[0]?.message?.content?.trim() || '…' });
  } catch (err) {
    console.error('chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// POST /api/niki/onboarding
// ============================================================================
app.post('/api/niki/onboarding', async (req, res) => {
  try {
    const { becoming, proudOf, avoided, nextHour, name, tone } = req.body || {};
    const system = `${NIKI_SYSTEM_BASE}\n\nYou are finishing onboarding. Return JSON only:
{
  "reflection": "2-3 sentences reflecting back what the user shared. Name two stats that will serve their goal. Warm, specific.",
  "stat_weights": {"body":1.0,"mind":1.0,"career":1.0,"social":1.0,"spirit":1.0},
  "first_quest": {"title":"short imperative","framing":"1 line Niki framing, second person","stat":"body|mind|career|social|spirit","xp":100,"verification":"self-report"}
}
- Two supporting stats get 1.3, one 1.1, others 1.0.
- first_quest must be achievable in <60 minutes with no integration.
- reflection must quote one concrete phrase the user used.`;
    const user = `Name: ${name}. Tone: ${tone}.
Becoming: "${becoming}"
Proud of: "${proudOf}"
Avoided: "${avoided}"
Next 60 minutes: "${nextHour}"`;
    const out = await callOpenAI({
      model: MODELS.smart,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.7, max_tokens: 600,
      response_format: { type: 'json_object' },
    });
    let parsed;
    try { parsed = JSON.parse(out.choices?.[0]?.message?.content || '{}'); }
    catch { parsed = fallbackOnboarding(name); }
    res.json(parsed);
  } catch (err) {
    console.error('onboarding error:', err.message);
    res.json(fallbackOnboarding(req.body?.name));
  }
});
function fallbackOnboarding(name) {
  return {
    reflection: `Heard${name ? ', ' + name : ''}. What you're reaching for will ask something of you across more than one part of your life. Let's start small.`,
    stat_weights: { body: 1.1, mind: 1.3, career: 1.3, social: 1.0, spirit: 1.0 },
    first_quest: {
      title: 'Twenty focused minutes',
      framing: 'Set a timer, phone face-down, and spend twenty minutes on the thing you named. That is today.',
      stat: 'mind', xp: 100, verification: 'self-report',
    },
  };
}

// ============================================================================
// POST /api/niki/quests — daily quests
// ============================================================================
app.post('/api/niki/quests', async (req, res) => {
  try {
    const { character, recent = [], intent = '' } = req.body || {};
    const lvl = character?.level || 1;
    const slots = lvl >= 20 ? 3 : lvl >= 5 ? 2 : 1;
    const system = `${NIKI_SYSTEM_BASE}\n\nGenerate today's daily quests. Return JSON:
{"quests":[{"title":"...","framing":"1-line second-person Niki framing","stat":"body|mind|career|social|spirit","xp":80-180,"verification":"self-report"}]}
- Exactly ${slots} quest(s).
- Each achievable in <90 min.
- Prefer stats the user has lower values in.
- No emoji, no exclamation marks.
- Never prescribe medical, disordered-eating, or risky activity.`;
    const user = `Character: ${JSON.stringify(character || {})}
Recent XP log (last 30 events, truncated): ${JSON.stringify(recent).slice(0, 1200)}
User intent for today: "${intent}"`;
    const out = await callOpenAI({
      model: MODELS.smart,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.85, max_tokens: 500,
      response_format: { type: 'json_object' },
    });
    let parsed;
    try { parsed = JSON.parse(out.choices?.[0]?.message?.content || '{"quests":[]}'); }
    catch { parsed = { quests: [] }; }
    if (!parsed.quests?.length) parsed.quests = fallbackQuests(slots);
    res.json(parsed);
  } catch (err) {
    console.error('quests error:', err.message);
    res.json({ quests: fallbackQuests(1) });
  }
});
function fallbackQuests(n) {
  const pool = [
    { title: 'Twenty-minute walk', framing: 'Step outside and move for twenty minutes.', stat: 'body', xp: 100 },
    { title: 'Read thirty pages', framing: 'Pick up the book and read without distraction.', stat: 'mind', xp: 110 },
    { title: 'Ship one small thing', framing: 'Send the email, make the commit, or finish the draft.', stat: 'career', xp: 130 },
    { title: 'Call someone who matters', framing: 'Pick up the phone and let them hear your voice.', stat: 'social', xp: 100 },
    { title: 'Five-minute stillness', framing: 'Sit, breathe, and notice what you notice.', stat: 'spirit', xp: 90 },
  ];
  return pool.slice(0, n).map((q) => ({ ...q, verification: 'self-report' }));
}

// ============================================================================
// POST /api/niki/weekly — weekly narrative quest (spec §4.5)
// ============================================================================
app.post('/api/niki/weekly', async (req, res) => {
  try {
    const { character } = req.body || {};
    const system = `${NIKI_SYSTEM_BASE}\n\nGenerate a 7-day narrative weekly quest. Return JSON:
{"title":"short narrative title","framing":"2-sentence second-person opening","stat":"primary stat","beats":["day 1 beat","day 2 beat","day 3 beat","day 4 beat","day 5 beat","day 6 beat","day 7 closing beat"],"xp":700,"reward_line":"1-sentence Niki-voiced reward teaser"}
- 3–5 concrete sub-beats. Keep each one to 1 sentence.
- Tied to the user's stated goals, class, and stats.
- Avoid generic self-help phrasing.`;
    const user = `Character: ${JSON.stringify(character || {})}`;
    const out = await callOpenAI({
      model: MODELS.smart,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.85, max_tokens: 700,
      response_format: { type: 'json_object' },
    });
    let parsed;
    try { parsed = JSON.parse(out.choices?.[0]?.message?.content || '{}'); }
    catch { parsed = fallbackWeekly(); }
    res.json(parsed);
  } catch (err) {
    console.error('weekly error:', err.message);
    res.json(fallbackWeekly());
  }
});
function fallbackWeekly() {
  return {
    title: 'The Foundation Week',
    framing: 'Seven days. Small, repeatable acts. No heroics. Just the pattern.',
    stat: 'mind',
    beats: [
      'Day 1: decide the single thing you want to build this week.',
      'Day 2: do it for twenty minutes before lunch.',
      'Day 3: do it again. Nothing clever.',
      'Day 4: rest if you need to; do it anyway if you do not.',
      'Day 5: write one sentence about what you learned.',
      'Day 6: do it one more time.',
      'Day 7: tell one person what you built.',
    ],
    xp: 700,
    reward_line: 'A small badge, and a page added to your story.',
  };
}

// ============================================================================
// POST /api/niki/story — long story arc (4-12 weeks)
// ============================================================================
app.post('/api/niki/story', async (req, res) => {
  try {
    const { character, goal } = req.body || {};
    const system = `${NIKI_SYSTEM_BASE}\n\nDesign a long story arc for the user. Return JSON:
{"title":"Arc title","summary":"2-sentence arc overview","weeks":8,"milestones":["week 1 milestone","week 2 milestone","...up to 8"],"stat":"primary stat","xp_total":3000,"reward_cosmetic":"a single short cosmetic description"}
- 4–12 weeks.
- Tied specifically to the user's declared goal.`;
    const user = `Character: ${JSON.stringify(character || {})}\nUser-declared goal: "${goal || ''}"`;
    const out = await callOpenAI({
      model: MODELS.deep,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.8, max_tokens: 900,
      response_format: { type: 'json_object' },
    });
    let parsed;
    try { parsed = JSON.parse(out.choices?.[0]?.message?.content || '{}'); }
    catch { parsed = fallbackStory(goal); }
    res.json(parsed);
  } catch (err) {
    console.error('story error:', err.message);
    res.json(fallbackStory(req.body?.goal));
  }
});
function fallbackStory(goal) {
  return {
    title: 'The Long Arc',
    summary: `A structured path toward "${goal || 'what you said you wanted'}". Small weekly proof, stacked.`,
    weeks: 8,
    milestones: [
      'Week 1: name the first small proof.', 'Week 2: repeat and measure.',
      'Week 3: share the first result with one person.', 'Week 4: remove one blocker you have been tolerating.',
      'Week 5: raise the target slightly.', 'Week 6: rest without guilt.',
      'Week 7: document what is working.', 'Week 8: finish visibly.',
    ],
    stat: 'career', xp_total: 3000, reward_cosmetic: 'Arc-Keeper aura',
  };
}

// ============================================================================
// POST /api/niki/party-quest — party quest proposal
// ============================================================================
app.post('/api/niki/party-quest', async (req, res) => {
  try {
    const { party, proposer } = req.body || {};
    const system = `${NIKI_SYSTEM_BASE}\n\nDesign a 7-day party quest. Return JSON:
{"title":"...","framing":"2-sentence Niki-voiced framing","mode":"shared|parallel","target":"one concrete measurable per-person or per-party target","stat":"body|mind|career|social|spirit","xp":250}
- "shared": one collective target across party.
- "parallel": each member does the same thing independently.`;
    const user = `Party members: ${JSON.stringify(party || [])}\nProposed by: ${proposer}`;
    const out = await callOpenAI({
      model: MODELS.smart,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.85, max_tokens: 500,
      response_format: { type: 'json_object' },
    });
    let parsed;
    try { parsed = JSON.parse(out.choices?.[0]?.message?.content || '{}'); }
    catch { parsed = fallbackParty(); }
    res.json(parsed);
  } catch (err) {
    console.error('party error:', err.message);
    res.json(fallbackParty());
  }
});
function fallbackParty() {
  return {
    title: 'The Fifty Kilometer Week',
    framing: 'Together you cover fifty kilometers by Sunday. Running, walking, cycling, it all counts.',
    mode: 'shared', target: '50 km collective', stat: 'body', xp: 250,
  };
}

// ============================================================================
// POST /api/niki/reflect — journal reflection
// ============================================================================
app.post('/api/niki/reflect', async (req, res) => {
  try {
    const { entry, character } = req.body || {};
    const system = `${NIKI_SYSTEM_BASE}\n\nReflect on a journal entry. Exactly 2 sentences. Second person. Reference one concrete thing from the entry. No questions. No generic affirmations.`;
    const out = await callOpenAI({
      model: MODELS.fast,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Character level ${character?.level || 1}. Entry:\n\n${(entry || '').slice(0, 4000)}` },
      ],
      temperature: 0.8, max_tokens: 180,
    });
    res.json({ reflection: out.choices?.[0]?.message?.content?.trim() || '' });
  } catch (err) {
    console.error('reflect error:', err.message);
    res.json({ reflection: '' });
  }
});

// ============================================================================
// POST /api/niki/class-advice — class recommendation at level 10
// ============================================================================
app.post('/api/niki/class-advice', async (req, res) => {
  try {
    const { character } = req.body || {};
    const system = `${NIKI_SYSTEM_BASE}\n\nRecommend a class for the user. Return JSON:
{"recommended":"Scholar|Warrior|Artist|Connector|Strategist|Wanderer","reason":"2-sentence reason grounded in their stats and recent behavior"}`;
    const out = await callOpenAI({
      model: MODELS.smart,
      messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(character || {}) }],
      temperature: 0.6, max_tokens: 300,
      response_format: { type: 'json_object' },
    });
    let parsed;
    try { parsed = JSON.parse(out.choices?.[0]?.message?.content || '{}'); }
    catch { parsed = { recommended: 'Wanderer', reason: 'You have a balanced shape across stats — a generalist path fits.' }; }
    res.json(parsed);
  } catch (err) {
    res.json({ recommended: 'Wanderer', reason: 'Balanced shape across stats.' });
  }
});

// ============================================================================
// POST /api/niki/return-quest — streak repair (spec §4.6)
// ============================================================================
app.post('/api/niki/return-quest', async (req, res) => {
  try {
    const { character, brokenStreak } = req.body || {};
    const system = `${NIKI_SYSTEM_BASE}\n\nThe user missed a day and broke a ${brokenStreak}-day streak. Generate a Return Quest — generous, doable in <45 minutes, acknowledging the miss without shame. Return JSON:
{"title":"...","framing":"2-sentence warm Niki framing","stat":"body|mind|career|social|spirit","xp":120}`;
    const out = await callOpenAI({
      model: MODELS.smart,
      messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(character || {}) }],
      temperature: 0.8, max_tokens: 400,
      response_format: { type: 'json_object' },
    });
    let parsed;
    try { parsed = JSON.parse(out.choices?.[0]?.message?.content || '{}'); }
    catch { parsed = { title: 'Return', framing: 'Come back gently. Ten minutes of the thing you skipped.', stat: 'spirit', xp: 120 }; }
    res.json(parsed);
  } catch (err) {
    res.json({ title: 'Return', framing: 'Come back gently.', stat: 'spirit', xp: 120 });
  }
});

// ---- Root fallback ----------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Nikitria MVP running on http://localhost:${PORT}`);
});
