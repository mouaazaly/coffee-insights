import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './db.js';
import { getRevenueByDay, getTopItems, getRepeatCustomerRate, getAverageTicket } from './stats.js';
import { generateInsights } from './insights.js';
import { askAgent } from './agent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

app.get('/api/stats', (req, res) => {
  const db = getDb();
  res.json({
    revenueByDay: getRevenueByDay(db),
    topItems: getTopItems(db),
    repeatCustomerRate: getRepeatCustomerRate(db),
    averageTicket: getAverageTicket(db),
  });
});

app.get('/api/insights', async (req, res) => {
  const summary = await generateInsights(getDb());
  res.json({ summary });
});

app.post('/api/ask', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }
  const answer = await askAgent(question, getDb());
  res.json({ answer });
});

app.listen(PORT, () => {
  console.log(`Coffee Insights running at http://localhost:${PORT}`);
});
