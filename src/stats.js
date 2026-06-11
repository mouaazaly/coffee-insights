export function getRevenueByDay(db) {
  return db.prepare(`
    SELECT date, ROUND(SUM(amount), 2) AS revenue
    FROM transactions
    GROUP BY date
    ORDER BY date ASC
  `).all();
}

export function getTopItems(db, limit = 10) {
  return db.prepare(`
    SELECT
      item,
      ROUND(SUM(amount), 2) AS totalRevenue,
      COUNT(*)              AS count
    FROM transactions
    GROUP BY item
    ORDER BY totalRevenue DESC
    LIMIT ?
  `).all(limit);
}

export function getRepeatCustomerRate(db) {
  const { total } = db.prepare(
    'SELECT COUNT(DISTINCT customer_id) AS total FROM transactions'
  ).get();

  const { repeats } = db.prepare(`
    SELECT COUNT(*) AS repeats FROM (
      SELECT customer_id
      FROM transactions
      GROUP BY customer_id
      HAVING COUNT(*) > 1
    )
  `).get();

  return {
    repeatCustomers: repeats,
    totalCustomers: total,
    rate: total === 0 ? 0 : Math.round((repeats / total) * 1000) / 1000,
  };
}

export function getAverageTicket(db) {
  const row = db.prepare(
    'SELECT ROUND(AVG(amount), 2) AS averageTicket FROM transactions'
  ).get();
  return { averageTicket: row.averageTicket ?? 0 };
}
