import 'dotenv/config';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DB_PATH    = join(__dirname, '..', 'data', 'coffee.db');

// --- Customer data ---
const CUSTOMERS = [
  { id: 'cust_001', name: 'Alice Chen',        email: 'alice@example.com' },
  { id: 'cust_002', name: 'Ben Torres',        email: 'ben@example.com' },
  { id: 'cust_003', name: 'Carla Nguyen',      email: 'carla@example.com' },
  { id: 'cust_004', name: 'David Kim',         email: 'david@example.com' },
  { id: 'cust_005', name: 'Eva Martinez',      email: 'eva@example.com' },
  { id: 'cust_006', name: 'Felix Brown',       email: 'felix@example.com' },
  { id: 'cust_007', name: 'Grace Liu',         email: 'grace@example.com' },
  { id: 'cust_008', name: 'Henry Park',        email: 'henry@example.com' },
  { id: 'cust_009', name: 'Isla White',        email: 'isla@example.com' },
  { id: 'cust_010', name: 'James Patel',       email: 'james@example.com' },
  { id: 'cust_011', name: 'Kira Johnson',      email: 'kira@example.com' },
  { id: 'cust_012', name: 'Leo Garcia',        email: 'leo@example.com' },
  { id: 'cust_013', name: 'Mia Robinson',      email: 'mia@example.com' },
  { id: 'cust_014', name: 'Noah Wilson',       email: 'noah@example.com' },
  { id: 'cust_015', name: 'Olivia Anderson',   email: 'olivia@example.com' },
  { id: 'cust_016', name: 'Paul Thomas',       email: 'paul@example.com' },
  { id: 'cust_017', name: 'Quinn Jackson',     email: 'quinn@example.com' },
  { id: 'cust_018', name: 'Rachel Harris',     email: 'rachel@example.com' },
  { id: 'cust_019', name: 'Sam Martin',        email: 'sam@example.com' },
  { id: 'cust_020', name: 'Tara Lewis',        email: 'tara@example.com' },
  { id: 'cust_021', name: 'Uma Clark',         email: 'uma@example.com' },
  { id: 'cust_022', name: 'Victor Lee',        email: 'victor@example.com' },
  { id: 'cust_023', name: 'Wendy Walker',      email: 'wendy@example.com' },
  { id: 'cust_024', name: 'Xander Hall',       email: 'xander@example.com' },
  { id: 'cust_025', name: 'Yara Allen',        email: 'yara@example.com' },
  { id: 'cust_026', name: 'Zoe Young',         email: 'zoe@example.com' },
  { id: 'cust_027', name: 'Aaron King',        email: 'aaron@example.com' },
  { id: 'cust_028', name: 'Beth Wright',       email: 'beth@example.com' },
  { id: 'cust_029', name: 'Chris Scott',       email: 'chris@example.com' },
  { id: 'cust_030', name: 'Dana Green',        email: 'dana@example.com' },
  { id: 'cust_031', name: 'Eli Baker',         email: 'eli@example.com' },
  { id: 'cust_032', name: 'Fiona Adams',       email: 'fiona@example.com' },
  { id: 'cust_033', name: 'George Nelson',     email: 'george@example.com' },
  { id: 'cust_034', name: 'Hannah Carter',     email: 'hannah@example.com' },
  { id: 'cust_035', name: 'Ivan Mitchell',     email: 'ivan@example.com' },
  { id: 'cust_036', name: 'Jess Perez',        email: 'jess@example.com' },
  { id: 'cust_037', name: 'Ken Roberts',       email: 'ken@example.com' },
  { id: 'cust_038', name: 'Lily Turner',       email: 'lily@example.com' },
  { id: 'cust_039', name: 'Mike Phillips',     email: 'mike@example.com' },
  { id: 'cust_040', name: 'Nina Campbell',     email: 'nina@example.com' },
];

const CUSTOMER_WEIGHTS = CUSTOMERS.map((_, i) => {
  if (i < 10) return 6;
  if (i < 25) return 2;
  return 1;
});

const MENU = [
  { item: 'Espresso',           amount: 3.00, weight: 2 },
  { item: 'Americano',          amount: 3.50, weight: 2 },
  { item: 'Latte',              amount: 4.75, weight: 4 },
  { item: 'Cappuccino',         amount: 4.50, weight: 4 },
  { item: 'Cold Brew',          amount: 5.00, weight: 4 },
  { item: 'Flat White',         amount: 4.75, weight: 2 },
  { item: 'Matcha Latte',       amount: 5.50, weight: 2 },
  { item: 'Croissant',          amount: 3.25, weight: 2 },
  { item: 'Blueberry Muffin',   amount: 3.50, weight: 2 },
  { item: 'Avocado Toast',      amount: 9.00, weight: 1 },
  { item: 'Banana Bread',       amount: 3.00, weight: 1 },
  { item: 'Breakfast Sandwich', amount: 8.50, weight: 1 },
];

function makeWeightedPicker(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  return function pick() {
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };
}

function buildDatePool() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = [];
  const weights = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    dates.push(iso);
    weights.push(dow === 0 || dow === 6 ? 1.8 : 1.0);
  }
  return makeWeightedPicker(dates, weights);
}

// Exported so src/db.js can call it on first boot (Azure has no seed step)
export function seedDatabase(db) {
  const pickCustomer = makeWeightedPicker(CUSTOMERS, CUSTOMER_WEIGHTS);
  const pickMenuItem = makeWeightedPicker(MENU, MENU.map(m => m.weight));
  const pickDate     = buildDatePool();

  db.prepare('DELETE FROM transactions').run();
  db.prepare('DELETE FROM customers').run();

  const insertCustomer = db.prepare(
    'INSERT INTO customers (customer_id, name, email) VALUES (?, ?, ?)'
  );
  const insertTx = db.prepare(
    'INSERT INTO transactions (date, item, amount, customer_id) VALUES (?, ?, ?, ?)'
  );

  db.transaction(() => {
    for (const c of CUSTOMERS) insertCustomer.run(c.id, c.name, c.email);
    for (let i = 0; i < 200; i++) {
      const customer = pickCustomer();
      const menuItem = pickMenuItem();
      insertTx.run(pickDate(), menuItem.item, menuItem.amount, customer.id);
    }
  })();
}

// Only runs when invoked directly: node scripts/seed.js
if (process.argv[1] === __filename) {
  mkdirSync(join(__dirname, '..', 'data'), { recursive: true });
  const db = new Database(DB_PATH);
  seedDatabase(db);
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM transactions').get();
  console.log(`Seeded ${n} transactions into ${DB_PATH}`);
  db.close();
}
