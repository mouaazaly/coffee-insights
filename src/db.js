import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedDatabase } from '../scripts/seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '..', 'data');
const DB_PATH   = join(DATA_DIR, 'coffee.db');

let _db;
export function getDb() {
  if (!_db) {
    mkdirSync(DATA_DIR, { recursive: true });
    _db = new Database(DB_PATH);
    _db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        date        TEXT NOT NULL,
        item        TEXT NOT NULL,
        amount      REAL NOT NULL,
        customer_id TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
    `);
    // Auto-seed on first boot so deployed environments (Azure) have data
    const { n } = _db.prepare('SELECT COUNT(*) AS n FROM transactions').get();
    if (n === 0) seedDatabase(_db);
  }
  return _db;
}
