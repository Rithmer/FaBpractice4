const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { nanoid } = require("nanoid");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
let users = [];
let products = [];
const JWT_SECRET = "access_secret";
const ACCESS_EXPIRES_IN = "15m";

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function findUserByEmail(email) {
  return users.find((u) => u.email === email);
}

function findUserById(id) {
  return users.find((u) => u.id === id);
}

function findProductOr404(id, res) {
  const product = products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Товар не найден" });
    return null;
  }
  return product;
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Missing or invalid Authorization header",
    });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
}

const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "API интернет-магазина с авторизацией",
      version: "1.0.0",
      description:
        "REST API с регистрацией пользователей и CRUD-операциями для товаров",
    },
    servers: [
      { url: `http://localhost:${port}`, description: "Локальный сервер" },
    ],
    tags: [
      { name: "Auth", description: "Операции авторизации" },
      { name: "Products", description: "Операции с товарами" },
    ],
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "abc123" },
            email: { type: "string", example: "user@mail.ru" },
            first_name: { type: "string", example: "Иван" },
            last_name: { type: "string", example: "Иванов" },
          },
        },
        UserRegister: {
          type: "object",
          required: ["email", "first_name", "last_name", "password"],
          properties: {
            email: { type: "string" },
            first_name: { type: "string" },
            last_name: { type: "string" },
            password: { type: "string" },
          },
        },
        UserLogin: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string" },
            password: { type: "string" },
          },
        },
        AccessToken: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", example: "abc123" },
            title: { type: "string", example: "Ноутбук Lenovo" },
            category: { type: "string", example: "Ноутбуки" },
            description: {
              type: "string",
              example: "Игровой ноутбук с мощной видеокартой",
            },
            price: { type: "number", example: 79990 },
          },
        },
        ProductCreate: {
          type: "object",
          required: ["title", "category", "price"],
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            description: { type: "string" },
            price: { type: "number" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Ошибка запроса" },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
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
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     tags: [Auth]
 *     description: Создает нового пользователя с хешированным паролем
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 *       400:
 *         description: Некорректные данные
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;
  if (!email || !first_name || !last_name || !password)
    return res.status(400).json({ error: "Все поля обязательны" });
  if (findUserByEmail(email))
    return res.status(400).json({ error: "Пользователь уже существует" });
  const newUser = {
    id: nanoid(6),
    email,
    first_name,
    last_name,
    password: await hashPassword(password),
  };
  users.push(newUser);
  res.status(201).json({
    id: newUser.id,
    email,
    first_name,
    last_name,
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     description: Проверяет email и пароль пользователя, выдает JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccessToken'
 *       401:
 *         description: Неверные учетные данные
 *       404:
 *         description: Пользователь не найден
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return res.status(401).json({ error: "Неверный пароль" });
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN,
    }
  );
  res.json({ accessToken });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить данные текущего пользователя
 *     tags: [Auth]
 *     description: Возвращает данные аутентифицированного пользователя
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Пользователь не найден
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const userId = req.user.sub;
  const user = findUserById(userId);
  if (!user) {
    return res.status(404).json({
      error: "User not found",
    });
  }
  res.json({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  });
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get("/api/products", (req, res) => {
  res.json(products);
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
 *       400:
 *         description: Некорректные данные
 */
app.post("/api/products", (req, res) => {
  const { title, category, description, price } = req.body;
  if (!title || !category || !price)
    return res
      .status(400)
      .json({ error: "title, category и price обязательны" });
  const product = {
    id: nanoid(6),
    title,
    category,
    description: description || "",
    price: Number(price),
  };
  products.push(product);
  res.status(201).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (product) res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар полностью
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
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
 *             $ref: '#/components/schemas/ProductCreate'
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Товар не найден
 */
app.put("/api/products/:id", authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  const { title, category, description, price } = req.body;
  product.title = title || product.title;
  product.category = category || product.category;
  product.description = description || product.description;
  product.price = price ? Number(price) : product.price;
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Товар удален
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", authMiddleware, (req, res) => {
  const exists = products.some((p) => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Товар не найден" });
  products = products.filter((p) => p.id !== req.params.id);
  res.status(204).send();
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Частично обновить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
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
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Товар обновлен частично
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Товар не найден
 */
app.patch("/api/products/:id", authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  const { title, category, description, price } = req.body;

  if (title !== undefined) product.title = title;
  if (category !== undefined) product.category = category;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price);

  res.json(product);
});

app.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
  console.log(`Swagger документация: http://localhost:${port}/api-docs`);
});
