import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  getRevenueByDay,
  getTopItems,
  getRepeatCustomerRate,
  getAverageTicket,
} from '../src/stats.js';

function makeDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE customers (
      customer_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    );
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item TEXT NOT NULL,
      amount REAL NOT NULL,
      customer_id TEXT NOT NULL
    );
  `);
  return db;
}

function insertTx(db, rows) {
  const stmt = db.prepare(
    'INSERT INTO transactions (date, item, amount, customer_id) VALUES (?, ?, ?, ?)'
  );
  const run = db.transaction(() => {
    for (const [date, item, amount, cid] of rows) stmt.run(date, item, amount, cid);
  });
  run();
}

// ---------------------------------------------------------------------------
// getRevenueByDay
// ---------------------------------------------------------------------------

test('getRevenueByDay returns empty array when no transactions', () => {
  const db = makeDb();
  const rows = getRevenueByDay(db);
  assert.deepEqual(rows, []);
  db.close();
});

test('getRevenueByDay returns one row per date, sorted ascending', () => {
  const db = makeDb();
  insertTx(db, [
    ['2024-03-01', 'Latte', 4.75, 'c1'],
    ['2024-03-03', 'Espresso', 3.00, 'c2'],
    ['2024-03-01', 'Croissant', 3.25, 'c1'],
  ]);
  const rows = getRevenueByDay(db);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, '2024-03-01');
  assert.equal(rows[1].date, '2024-03-03');
  db.close();
});

test('getRevenueByDay sums amounts correctly per date', () => {
  const db = makeDb();
  insertTx(db, [
    ['2024-03-01', 'Latte', 4.75, 'c1'],
    ['2024-03-01', 'Croissant', 3.25, 'c2'],
    ['2024-03-02', 'Espresso', 3.00, 'c3'],
  ]);
  const rows = getRevenueByDay(db);
  assert.equal(rows[0].revenue, 8.00);
  assert.equal(rows[1].revenue, 3.00);
  db.close();
});

// ---------------------------------------------------------------------------
// getTopItems
// ---------------------------------------------------------------------------

test('getTopItems returns items sorted by totalRevenue descending', () => {
  const db = makeDb();
  insertTx(db, [
    ['2024-03-01', 'Latte', 4.75, 'c1'],
    ['2024-03-01', 'Latte', 4.75, 'c2'],
    ['2024-03-01', 'Espresso', 3.00, 'c3'],
  ]);
  const rows = getTopItems(db);
  assert.equal(rows[0].item, 'Latte');
  assert.equal(rows[0].totalRevenue, 9.50);
  assert.equal(rows[0].count, 2);
  assert.equal(rows[1].item, 'Espresso');
  db.close();
});

test('getTopItems respects the limit parameter', () => {
  const db = makeDb();
  insertTx(db, [
    ['2024-03-01', 'A', 5.00, 'c1'],
    ['2024-03-01', 'B', 4.00, 'c2'],
    ['2024-03-01', 'C', 3.00, 'c3'],
  ]);
  const rows = getTopItems(db, 2);
  assert.equal(rows.length, 2);
  db.close();
});

test('getTopItems count field matches transaction count per item', () => {
  const db = makeDb();
  insertTx(db, [
    ['2024-03-01', 'Cold Brew', 5.00, 'c1'],
    ['2024-03-02', 'Cold Brew', 5.00, 'c2'],
    ['2024-03-03', 'Cold Brew', 5.00, 'c3'],
  ]);
  const rows = getTopItems(db, 1);
  assert.equal(rows[0].count, 3);
  assert.equal(rows[0].totalRevenue, 15.00);
  db.close();
});

// ---------------------------------------------------------------------------
// getRepeatCustomerRate
// ---------------------------------------------------------------------------

test('getRepeatCustomerRate correctly identifies repeat customers', () => {
  const db = makeDb();
  insertTx(db, [
    ['2024-03-01', 'Latte', 4.75, 'c1'],
    ['2024-03-02', 'Latte', 4.75, 'c1'], // c1 is a repeat
    ['2024-03-01', 'Espresso', 3.00, 'c2'], // c2 is one-time
    ['2024-03-01', 'Espresso', 3.00, 'c3'], // c3 is one-time
  ]);
  const result = getRepeatCustomerRate(db);
  assert.equal(result.repeatCustomers, 1);
  assert.equal(result.totalCustomers, 3);
  assert.equal(result.rate, 0.333);
  db.close();
});

test('getRepeatCustomerRate returns rate=0 when all customers have exactly 1 purchase', () => {
  const db = makeDb();
  insertTx(db, [
    ['2024-03-01', 'Latte', 4.75, 'c1'],
    ['2024-03-01', 'Espresso', 3.00, 'c2'],
  ]);
  const result = getRepeatCustomerRate(db);
  assert.equal(result.repeatCustomers, 0);
  assert.equal(result.rate, 0);
  db.close();
});

test('getRepeatCustomerRate returns rate=0 when table is empty', () => {
  const db = makeDb();
  const result = getRepeatCustomerRate(db);
  assert.equal(result.rate, 0);
  assert.equal(result.totalCustomers, 0);
  db.close();
});

// ---------------------------------------------------------------------------
// getAverageTicket
// ---------------------------------------------------------------------------

test('getAverageTicket returns average of all amounts', () => {
  const db = makeDb();
  insertTx(db, [
    ['2024-03-01', 'Latte', 4.00, 'c1'],
    ['2024-03-01', 'Espresso', 2.00, 'c2'],
    ['2024-03-01', 'Muffin', 3.00, 'c3'],
  ]);
  const result = getAverageTicket(db);
  assert.equal(result.averageTicket, 3.00);
  db.close();
});

test('getAverageTicket returns 0 when table is empty', () => {
  const db = makeDb();
  const result = getAverageTicket(db);
  assert.equal(result.averageTicket, 0);
  db.close();
});
