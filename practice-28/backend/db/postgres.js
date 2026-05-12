const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

async function initPostgres() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(10) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'customer',
        is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token TEXT PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(10) PRIMARY KEY,
        user_id VARCHAR(10) NOT NULL,
        items JSONB NOT NULL,
        total NUMERIC(12,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        stripe_payment_intent VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const { rows } = await client.query("SELECT COUNT(*) FROM users");
    if (parseInt(rows[0].count) === 0) {
      const adminHash = await bcrypt.hash("admin12345", 10);
      const sellerHash = await bcrypt.hash("seller12345", 10);
      const customerHash = await bcrypt.hash("customer12345", 10);
      await client.query(
        `INSERT INTO users (id, email, first_name, last_name, role, password_hash) VALUES
        ('adm001', 'admin@techmarket.local', 'System', 'Admin', 'admin', $1),
        ('sel001', 'seller@techmarket.local', 'Default', 'Seller', 'seller', $2),
        ('cus001', 'customer@techmarket.local', 'Default', 'Customer', 'customer', $3)
        ON CONFLICT DO NOTHING;`,
        [adminHash, sellerHash, customerHash],
      );
      console.log("PostgreSQL: пользователи созданы");
    }
    console.log("PostgreSQL: инициализирован");
  } finally {
    client.release();
  }
}

module.exports = { pool, initPostgres };
