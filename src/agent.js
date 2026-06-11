import 'dotenv/config';
import OpenAI from 'openai';
import { getRevenueByDay, getTopItems, getRepeatCustomerRate, getAverageTicket } from './stats.js';

let _defaultGroqClient;
function getDefaultClient() {
  if (!_defaultGroqClient) {
    _defaultGroqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return _defaultGroqClient;
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'getRevenueByDay',
      description: 'Returns daily revenue totals sorted by date ascending.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTopItems',
      description: 'Returns top N menu items by total revenue and order count.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Number of items to return. Default 10.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRepeatCustomerRate',
      description: 'Returns repeat customer count, total customers, and repeat rate as a decimal.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getAverageTicket',
      description: 'Returns the average transaction amount in dollars.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

const TOOL_MAP = {
  getRevenueByDay:       (args, db) => getRevenueByDay(db),
  getTopItems:           (args, db) => getTopItems(db, args.limit ?? 10),
  getRepeatCustomerRate: (args, db) => getRepeatCustomerRate(db),
  getAverageTicket:      (args, db) => getAverageTicket(db),
};

const SYSTEM_PROMPT = `You are a data-driven assistant for a coffee shop owner.
You have access to tools that query real sales data.
When answering a question, ALWAYS call the relevant tool(s) first to retrieve actual data,
then formulate your answer using only that data.
Never estimate or guess numbers. If the data does not contain what the user asks about, say so.
Keep answers concise (2–4 sentences).`;

export async function askAgent(question, db, groqClient = null) {
  const client = groqClient ?? getDefaultClient();

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];

  for (let i = 0; i < 5; i++) {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: 500,
    });

    const choice = response.choices[0];

    if (choice.finish_reason === 'stop' || choice.finish_reason === 'end_turn') {
      return choice.message.content;
    }

    if (choice.finish_reason === 'tool_calls') {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const fn = TOOL_MAP[toolCall.function.name];
        const args = JSON.parse(toolCall.function.arguments || '{}');
        const result = fn(args, db);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    break;
  }

  throw new Error('Agent did not produce a final answer within 5 iterations');
}
