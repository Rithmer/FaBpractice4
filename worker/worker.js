const amqplib = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";
const WORKER_ID = process.env.WORKER_ID || "1";
const MAIN_QUEUE = "tasks";
const DLQ = "tasks_dead";
const DLX = "tasks_dlx";
const MAX_RETRIES = 3;

async function setup(channel) {
  await channel.assertExchange(DLX, "direct", { durable: true });
  await channel.assertQueue(DLQ, { durable: true });
  await channel.bindQueue(DLQ, DLX, "dead");

  await channel.assertQueue(MAIN_QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": DLX,
      "x-dead-letter-routing-key": "dead",
    },
  });
}

async function processTask(task) {
  console.log(`[Worker ${WORKER_ID}] Обработка: тип=${task.type} id=${task.id}`);

  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

  if (Math.random() < 0.3) {
    throw new Error("Временная ошибка обработки задачи");
  }

  console.log(`[Worker ${WORKER_ID}] Задача ${task.id} выполнена успешно`);
}

async function startWorker() {
  let connection;
  for (let i = 0; i < 10; i++) {
    try {
      connection = await amqplib.connect(RABBITMQ_URL);
      break;
    } catch {
      console.log(`[Worker ${WORKER_ID}] Ожидание RabbitMQ... (${i + 1}/10)`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const channel = await connection.createChannel();
  channel.prefetch(1);

  await setup(channel);

  console.log(`[Worker ${WORKER_ID}] Запущен, ожидание задач в очереди "${MAIN_QUEUE}"...`);

  channel.consume(MAIN_QUEUE, async (msg) => {
    if (!msg) return;

    const task = JSON.parse(msg.content.toString());
    const retryCount = msg.properties.headers?.["x-retry-count"] || 0;

    console.log(`[Worker ${WORKER_ID}] Попытка ${retryCount + 1}/${MAX_RETRIES + 1} для задачи ${task.id}`);

    try {
      await processTask(task);
      channel.ack(msg);
    } catch (err) {
      console.error(`[Worker ${WORKER_ID}] Ошибка: ${err.message}`);

      if (retryCount < MAX_RETRIES) {
        const delay = 1000 * 2 ** retryCount;
        console.warn(`[Worker ${WORKER_ID}] Повтор через ${delay}ms (попытка ${retryCount + 1}/${MAX_RETRIES})`);

        channel.nack(msg, false, false);
        await new Promise((r) => setTimeout(r, delay));

        channel.sendToQueue(MAIN_QUEUE, msg.content, {
          persistent: true,
          headers: { "x-retry-count": retryCount + 1 },
        });
      } else {
        console.error(`[Worker ${WORKER_ID}] Задача ${task.id} отправлена в DLQ после ${MAX_RETRIES} попыток`);
        channel.nack(msg, false, false);
      }
    }
  });
}

startWorker().catch((err) => {
  console.error("Ошибка запуска воркера:", err);
  process.exit(1);
});