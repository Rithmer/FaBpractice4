const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      age INTEGER NOT NULL CHECK (age >= 0),
      created_at BIGINT NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT),
      updated_at BIGINT NOT NULL DEFAULT CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)
    );
  `;

  await pool.query(query);
}

module.exports = {
  pool,
  initDb,
};
