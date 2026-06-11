import Database from 'better-sqlite3';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'coffee.db');

let _db;
export function getDb() {
  if (!_db) _db = new Database(DB_PATH);
  return _db;
}
