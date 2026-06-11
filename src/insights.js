import 'dotenv/config';
import OpenAI from 'openai';
import { getRevenueByDay, getTopItems, getRepeatCustomerRate, getAverageTicket } from './stats.js';

let _groq;
function getGroq() {
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return _groq;
}

const SYSTEM_PROMPT = `You are a business analyst for a small independent coffee shop.
You will be given a JSON object containing real sales statistics.
Write a concise executive summary (3–5 sentences) that highlights:
- Overall revenue trend
- Best-selling items
- Customer loyalty (repeat rate)
- Average spend per visit
Be specific, use the exact numbers provided, and end with one actionable recommendation.
Do not invent data not present in the stats.`;

export async function generateInsights(db) {
  const stats = {
    revenueByDay: getRevenueByDay(db),
    topItems: getTopItems(db, 5),
    repeatCustomerRate: getRepeatCustomerRate(db),
    averageTicket: getAverageTicket(db),
  };

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Here are this month's stats:\n\n${JSON.stringify(stats, null, 2)}\n\nWrite the business summary now.`,
      },
    ],
    temperature: 0.4,
    max_tokens: 300,
  });

  return response.choices[0].message.content;
}
