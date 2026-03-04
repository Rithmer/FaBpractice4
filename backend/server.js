const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3000;

let products = [
  {
    id: nanoid(6),
    name: "Ноутбук Apple MacBook Pro 14",
    category: "Ноутбуки",
    description:
      "Мощный ноутбук с процессором Apple M1 Pro для профессионалов.",
    price: 199990,
    stock: 10,
    rating: 4.9,
  },
  {
    id: nanoid(6),
    name: "Смартфон Samsung Galaxy S23",
    category: "Смартфоны",
    description:
      "Флагманский смартфон с потрясающей камерой и производительностью.",
    price: 89990,
    stock: 25,
    rating: 4.8,
  },
  {
    id: nanoid(6),
    name: "Наушники Sony WH-1000XM5",
    category: "Аудиотехника",
    description:
      "Беспроводные наушники с шумоподавлением и высоким качеством звука.",
    price: 29990,
    stock: 15,
    rating: 4.7,
  },
  {
    id: nanoid(6),
    name: "Игровая консоль Sony PlayStation 5",
    category: "Игровые консоли",
    description: "Консоль нового поколения с поддержкой 4K-гейминга.",
    price: 59990,
    stock: 8,
    rating: 4.9,
  },
  {
    id: nanoid(6),
    name: "Смарт-часы Apple Watch Series 8",
    category: "Гаджеты",
    description: "Умные часы с функцией мониторинга здоровья и тренировок.",
    price: 45990,
    stock: 20,
    rating: 4.8,
  },
];

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

function findProductOr404(id, res) {
  const product = products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return product;
}

const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "ТехМаркет API",
      version: "1.0.0",
      description:
        "REST API интернет-магазина техники с полной документацией CRUD-операций",
    },
    servers: [
      { url: `http://localhost:${port}`, description: "Локальный сервер" },
    ],
    tags: [
      {
        name: "Products",
        description: "Операции с товарами",
      },
    ],
    components: {
      schemas: {
        Product: {
          type: "object",
          required: ["name", "category", "price"],
          properties: {
            id: { type: "string", example: "abc123", readOnly: true },
            name: { type: "string", example: "Ноутбук Apple MacBook Pro 14" },
            category: { type: "string", example: "Ноутбуки" },
            description: {
              type: "string",
              example: "Мощный ноутбук для профессионалов",
            },
            price: { type: "number", example: 199990 },
            stock: { type: "integer", example: 10 },
            rating: { type: "number", example: 4.9 },
          },
        },
        ProductCreate: {
          type: "object",
          required: ["name", "category", "price"],
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            description: { type: "string" },
            price: { type: "number" },
            stock: { type: "integer" },
            rating: { type: "number" },
          },
        },
        ProductUpdate: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            description: { type: "string" },
            price: { type: "number" },
            stock: { type: "integer" },
            rating: { type: "number" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Product not found" },
          },
        },
      },
    },
  },
  apis: ["./server.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара (6-символьный nanoid)
 *     responses:
 *       200:
 *         description: Найденный товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/api/products/:id", (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (product) res.json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *     responses:
 *       201:
 *         description: Товар создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Некорректные данные
 */
app.post("/api/products", (req, res) => {
  const { name, category, description, price, stock, rating } = req.body;
  if (!name || !category || !price) {
    return res
      .status(400)
      .json({ error: "name, category and price are required" });
  }

  const newProduct = {
    id: nanoid(6),
    name: name.trim(),
    category: category.trim(),
    description: description?.trim() || "",
    price: Number(price),
    stock: Number(stock) || 0,
    rating: Number(rating) || 0,
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Частично обновить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *     responses:
 *       200:
 *         description: Товар обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.patch("/api/products/:id", (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  Object.assign(product, req.body);
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Товар удалён
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", (req, res) => {
  const exists = products.some((p) => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Product not found" });

  products = products.filter((p) => p.id !== req.params.id);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api-docs`);
});