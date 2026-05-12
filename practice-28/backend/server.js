const { app, server } = require("./app");
const { pool, initPostgres } = require("./db/postgres");
const { connectMongo, initMongo } = require("./db/mongo");
const { connectRedis } = require("./db/redis");

const PORT = process.env.PORT || 3000;
const SERVER_ID = process.env.SERVER_ID || "backend-1";

async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query("SELECT 1");
      break;
    } catch {
      retries--;
      console.log("Ожидание PostgreSQL... (" + retries + ")");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  await connectRedis();
  await connectMongo();
  await initPostgres();
  await initMongo();

  server.listen(PORT, "0.0.0.0", () => {
    console.log("[" + SERVER_ID + "] REST API запущен на порту " + PORT);
  });
}

start().catch((err) => {
  console.error("Ошибка запуска:", err);
  process.exit(1);
});