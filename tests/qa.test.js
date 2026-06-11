import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import Database from 'better-sqlite3';
import { askAgent } from '../src/agent.js';

function makeDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item TEXT NOT NULL,
      amount REAL NOT NULL,
      customer_id TEXT NOT NULL
    );
  `);
  const stmt = db.prepare(
    'INSERT INTO transactions (date, item, amount, customer_id) VALUES (?, ?, ?, ?)'
  );
  const seed = db.transaction(() => {
    stmt.run('2024-03-01', 'Latte', 4.75, 'c1');
    stmt.run('2024-03-01', 'Latte', 4.75, 'c1');
    stmt.run('2024-03-02', 'Espresso', 3.00, 'c2');
    stmt.run('2024-03-02', 'Cold Brew', 5.00, 'c3');
  });
  seed();
  return db;
}

function makeClient(responses) {
  let call = 0;
  return {
    chat: {
      completions: {
        create: mock.fn(async () => responses[Math.min(call++, responses.length - 1)]),
      },
    },
  };
}

// ---------------------------------------------------------------------------

test('agent calls getAverageTicket tool then returns grounded answer', async () => {
  const db = makeDb();
  const client = makeClient([
    {
      choices: [{
        finish_reason: 'tool_calls',
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: { name: 'getAverageTicket', arguments: '{}' },
          }],
        },
      }],
    },
    {
      choices: [{
        finish_reason: 'stop',
        message: { role: 'assistant', content: 'The average ticket is $4.38.' },
      }],
    },
  ]);

  const answer = await askAgent('What is the average ticket?', db, client);
  assert.ok(answer.includes('4.38'), `expected answer to contain 4.38, got: ${answer}`);
  assert.equal(client.chat.completions.create.mock.calls.length, 2);
  db.close();
});

test('agent stops on first turn when finish_reason is stop', async () => {
  const db = makeDb();
  const client = makeClient([
    {
      choices: [{
        finish_reason: 'stop',
        message: { role: 'assistant', content: 'I can help with that.' },
      }],
    },
  ]);

  const answer = await askAgent('Hello', db, client);
  assert.equal(answer, 'I can help with that.');
  assert.equal(client.chat.completions.create.mock.calls.length, 1);
  db.close();
});

test('agent throws after 5 iterations without a stop', async () => {
  const db = makeDb();
  const infiniteToolCall = {
    choices: [{
      finish_reason: 'tool_calls',
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_loop',
          type: 'function',
          function: { name: 'getAverageTicket', arguments: '{}' },
        }],
      },
    }],
  };
  const client = makeClient([infiniteToolCall]);

  await assert.rejects(
    () => askAgent('Loop forever', db, client),
    /did not produce a final answer within 5 iterations/
  );
  assert.equal(client.chat.completions.create.mock.calls.length, 5);
  db.close();
});

test('agent handles two tool calls in a single turn', async () => {
  const db = makeDb();
  const client = makeClient([
    {
      choices: [{
        finish_reason: 'tool_calls',
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_a',
              type: 'function',
              function: { name: 'getTopItems', arguments: '{"limit":3}' },
            },
            {
              id: 'call_b',
              type: 'function',
              function: { name: 'getAverageTicket', arguments: '{}' },
            },
          ],
        },
      }],
    },
    {
      choices: [{
        finish_reason: 'stop',
        message: { role: 'assistant', content: 'Latte is the top item and average ticket is $4.38.' },
      }],
    },
  ]);

  const answer = await askAgent('What are the top items?', db, client);
  assert.ok(answer.length > 0);
  // verify both tool results were sent — second create call should have 5 messages
  // (system, user, assistant-with-2-tool-calls, tool-result-a, tool-result-b)
  const secondCallMessages = client.chat.completions.create.mock.calls[1].arguments[0].messages;
  assert.equal(
    secondCallMessages.filter(m => m.role === 'tool').length,
    2
  );
  assert.equal(client.chat.completions.create.mock.calls.length, 2);
  db.close();
});
