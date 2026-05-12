const { Router } = require("express");
const amqplib = require("amqplib");
const { generateId } = require("../helpers/user");

const router = Router();
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";
const QUEUE = "tasks";

let channel = null;

async function getChannel() {
  if (channel) return channel;
  const connection = await amqplib.connect(RABBITMQ_URL);
  channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "tasks_dlx",
      "x-dead-letter-routing-key": "dead",
    },
  });
  return channel;
}

router.post("/", async (req, res) => {
  const { type, payload } = req.body;

  if (!type) return res.status(400).json({ error: "type обязателен" });

  try {
    const ch = await getChannel();
    const task = {
      id: generateId("t"),
      type,
      payload: payload || {},
      createdAt: new Date().toISOString(),
    };

    ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(task)), {
      persistent: true,
      headers: { "x-retry-count": 0 },
    });

    console.log(`[Producer] Задача отправлена в очередь:`, task);
    res.status(201).json({ ok: true, task });
  } catch (err) {
    console.error("Ошибка отправки задачи:", err);
    channel = null;
    res.status(500).json({ error: "Не удалось поставить задачу в очередь" });
  }
});

module.exports = router;