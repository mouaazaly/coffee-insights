# Coffee Shop Insights

A multi-stage AI customer insights app for a coffee shop SMB. Loads realistic transaction data into SQLite, runs a stats pipeline, generates AI-powered business summaries via Groq, and provides an agentic Q&A that answers questions grounded in real sales numbers — all displayed on a live dashboard.

## Architecture

```
Stage 1 — Data:     scripts/seed.js     → 200 transactions into SQLite
Stage 2 — Stats:    src/stats.js        → revenue by day, top items, repeat rate, avg ticket
Stage 3 — AI:       src/insights.js     → Groq LLM summary from real stats
Stage 4 — Agent:    src/agent.js        → tool-calling Q&A loop grounded in Stage 2
Stage 5 — Frontend: public/index.html   → Chart.js dashboard + ask-a-question box
Stage 6 — Tests:    tests/              → 15 tests (stats + agent loop, no network calls)
```

**Stack:** Node.js · Express · SQLite (better-sqlite3) · Groq API · Vanilla HTML/JS · Chart.js

## How to run

**Prerequisites:** Node.js v18+

```bash
git clone https://github.com/mouaazaly/coffee-insights.git
cd coffee-insights
npm install
```

Create a `.env` file (see `.env.example`):
```
GROQ_API_KEY=your_groq_key_here
```

```bash
npm run seed    # load 200 transactions into SQLite
npm start       # start server at http://localhost:3000
```

Run tests (no API key needed):
```bash
npm test
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats` | All stats (revenue by day, top items, repeat rate, avg ticket) |
| GET | `/api/insights` | AI-generated business summary via Groq |
| POST | `/api/ask` | Agentic Q&A — body: `{ "question": "..." }` |
