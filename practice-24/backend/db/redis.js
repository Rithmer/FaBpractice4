const { createClient } = require("redis");
const { PRODUCTS_CACHE_TTL } = require("../config/constants");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://redis:6379",
});
redisClient.on("error", (err) => console.error("Redis error:", err));

async function connectRedis() {
  await redisClient.connect();
  console.log("Redis: подключён");
}

module.exports = { redisClient, connectRedis, PRODUCTS_CACHE_TTL };
