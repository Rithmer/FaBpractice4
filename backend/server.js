const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { nanoid } = require("nanoid");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const jwt = require("jsonwebtoken");
const { createClient } = require("redis");

const app = express();
const port = 3000;

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const ROLES = Object.freeze({
  USER: "user",
  SELLER: "seller",
  ADMIN: "admin",
});

const VIEWER_ROLES = [ROLES.USER, ROLES.SELLER, ROLES.ADMIN];
const SELLER_ROLES = [ROLES.SELLER, ROLES.ADMIN];
const ALLOWED_PRODUCT_CATEGORIES = Object.freeze([
  "Смартфоны Apple",
  "Периферия Apple",
]);

const USERS_CACHE_TTL_SECONDS = 60;
const PRODUCTS_CACHE_TTL_SECONDS = 600;

let users = [
  {
    id: nanoid(6),
    email: "admin@techmarket.local",
    first_name: "System",
    last_name: "Admin",
    role: ROLES.ADMIN,
    isBlocked: false,
    passwordHash: bcrypt.hashSync("admin12345", 10),
  },
  {
    id: nanoid(6),
    email: "seller@techmarket.local",
    first_name: "Default",
    last_name: "Seller",
    role: ROLES.SELLER,
    isBlocked: false,
    passwordHash: bcrypt.hashSync("seller12345", 10),
  },
  {
    id: nanoid(6),
    email: "user@techmarket.local",
    first_name: "Default",
    last_name: "User",
    role: ROLES.USER,
    isBlocked: false,
    passwordHash: bcrypt.hashSync("user12345", 10),
  },
];

let products = [
  {
    id: nanoid(6),
    title: "iPhone 16 Pro 256GB",
    category: "Смартфоны Apple",
    description: "Флагман Apple с титановым корпусом и камерой Pro.",
    price: 149990,
  },
  {
    id: nanoid(6),
    title: "iPhone 15 128GB",
    category: "Смартфоны Apple",
    description: "Смартфон Apple с Dynamic Island и разъемом USB-C.",
    price: 89990,
  },
  {
    id: nanoid(6),
    title: "AirPods Pro (2-го поколения, USB-C)",
    category: "Периферия Apple",
    description: "Беспроводные наушники Apple с активным шумоподавлением.",
    price: 28990,
  },
  {
    id: nanoid(6),
    title: "Apple Watch Series 10 (GPS)",
    category: "Периферия Apple",
    description: "Умные часы Apple для спорта, здоровья и уведомлений.",
    price: 46990,
  },
  {
    id: nanoid(6),
    title: "MagSafe Charger",
    category: "Периферия Apple",
    description: "Магнитная беспроводная зарядка Apple для iPhone.",
    price: 5990,
  },
];

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const refreshTokens = new Map();

const redisClient = createClient({
  url: "redis://127.0.0.1:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

async function initRedis() {
  await redisClient.connect();
  console.log("Redis connected: redis://127.0.0.1:6379");
}

function cacheMiddleware(keyBuilder, ttlSeconds) {
  return async (req, res, next) => {
    try {
      const key = keyBuilder(req);
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        return res.json({
          source: "cache",
          data: JSON.parse(cachedData),
        });
      }

      req.cacheKey = key;
      req.cacheTTL = ttlSeconds;
      next();
    } catch (err) {
      console.error("Cache read error:", err.message);
      next();
    }
  };
}

async function saveToCache(key, data, ttlSeconds) {
  try {
    await redisClient.set(key, JSON.stringify(data), {
      EX: ttlSeconds,
    });
  } catch (err) {
    console.error("Cache save error:", err.message);
  }
}

async function invalidateUsersCache(userId = null) {
  try {
    await redisClient.del("users:all");
    if (userId) {
      await redisClient.del(`users:${userId}`);
    }
  } catch (err) {
    console.error("Users cache invalidate error:", err.message);
  }
}

async function invalidateProductsCache(productId = null) {
  try {
    await redisClient.del("products:all");
    if (productId) {
      await redisClient.del(`products:${productId}`);
    }
  } catch (err) {
    console.error("Products cache invalidate error:", err.message);
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    is_blocked: user.isBlocked,
  };
}

function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

function revokeRefreshTokensByUserId(userId) {
  for (const [token, tokenOwnerId] of refreshTokens.entries()) {
    if (tokenOwnerId === userId) {
      refreshTokens.delete(token);
    }
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function findUserByEmail(email) {
  return users.find((u) => u.email === normalizeEmail(email));
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

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: "User is blocked" });
    }

    req.user = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    req.currentUser = user;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function rolesMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}

function validateProductPayload(payload, { partial = false } = {}) {
  const { title, category, price } = payload;

  if (!partial || title !== undefined) {
    if (!title || !String(title).trim()) {
      return "title обязателен";
    }
  }

  if (!partial || category !== undefined) {
    const cleanCategory = String(category || "").trim();

    if (!cleanCategory) {
      return "category обязателен";
    }

    if (!ALLOWED_PRODUCT_CATEGORIES.includes(cleanCategory)) {
      return `category должна быть одной из: ${ALLOWED_PRODUCT_CATEGORIES.join(
        ", "
      )}`;
    }
  }

  if (!partial || price !== undefined) {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return "price должен быть положительным числом";
    }
  }

  return null;
}

const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "ТехМаркет API",
      version: "1.0.0",
      description:
        "Практика 21: RBAC API с JWT и кэшированием Redis. Для кэшируемых GET-маршрутов ответ содержит source=server|cache.",
    },
    servers: [{ url: `http://localhost:${port}` }],
    tags: [
      { name: "Auth", description: "Регистрация, логин, refresh и профиль" },
      { name: "Users", description: "Управление пользователями (admin)" },
      { name: "Products", description: "Работа с товарами и кэшированием" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        RegisterRequest: {
          type: "object",
          required: ["email", "first_name", "last_name", "password"],
          properties: {
            email: { type: "string", format: "email", example: "new@techmarket.local" },
            first_name: { type: "string", example: "Ivan" },
            last_name: { type: "string", example: "Petrov" },
            password: { type: "string", example: "strongPass123" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "admin@techmarket.local" },
            password: { type: "string", example: "admin12345" },
          },
        },
        RefreshRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.example",
            },
          },
        },
        TokensResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.example" },
            refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.example" },
          },
        },
        UserPublic: {
          type: "object",
          properties: {
            id: { type: "string", example: "A1b2C3" },
            email: { type: "string", format: "email", example: "admin@techmarket.local" },
            first_name: { type: "string", example: "System" },
            last_name: { type: "string", example: "Admin" },
            role: { type: "string", enum: ["user", "seller", "admin"], example: "admin" },
            is_blocked: { type: "boolean", example: false },
          },
        },
        UserUpdateRequest: {
          type: "object",
          properties: {
            email: { type: "string", format: "email", example: "admin2@techmarket.local" },
            first_name: { type: "string", example: "NewName" },
            last_name: { type: "string", example: "NewLast" },
            role: { type: "string", enum: ["user", "seller", "admin"], example: "admin" },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", example: "Pr0dX1" },
            title: { type: "string", example: "iPhone 16 Pro 256GB" },
            category: {
              type: "string",
              enum: ["Смартфоны Apple", "Периферия Apple"],
              example: "Смартфоны Apple",
            },
            description: { type: "string", example: "Флагман Apple с титановым корпусом." },
            price: { type: "number", example: 149990 },
          },
        },
        ProductCreateRequest: {
          type: "object",
          required: ["title", "category", "price"],
          properties: {
            title: { type: "string", example: "AirPods Max" },
            category: {
              type: "string",
              enum: ["Смартфоны Apple", "Периферия Apple"],
              example: "Периферия Apple",
            },
            description: { type: "string", example: "Полноразмерные наушники Apple" },
            price: { type: "number", example: 62990 },
          },
        },
        ProductUpdateRequest: {
          type: "object",
          properties: {
            title: { type: "string", example: "iPhone 16 Pro Max" },
            category: {
              type: "string",
              enum: ["Смартфоны Apple", "Периферия Apple"],
              example: "Смартфоны Apple",
            },
            description: { type: "string", example: "Обновленное описание" },
            price: { type: "number", example: 159990 },
          },
        },
        CachedUsersResponse: {
          type: "object",
          properties: {
            source: { type: "string", enum: ["server", "cache"], example: "server" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/UserPublic" },
            },
          },
        },
        CachedUserResponse: {
          type: "object",
          properties: {
            source: { type: "string", enum: ["server", "cache"], example: "cache" },
            data: { $ref: "#/components/schemas/UserPublic" },
          },
        },
        CachedProductsResponse: {
          type: "object",
          properties: {
            source: { type: "string", enum: ["server", "cache"], example: "server" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Product" },
            },
          },
        },
        CachedProductResponse: {
          type: "object",
          properties: {
            source: { type: "string", enum: ["server", "cache"], example: "cache" },
            data: { $ref: "#/components/schemas/Product" },
          },
        },
        BlockUserResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Пользователь заблокирован" },
            user: { $ref: "#/components/schemas/UserPublic" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "Invalid or expired token" },
          },
        },
      },
    },
    paths: {
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Регистрация нового пользователя",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "Пользователь создан",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UserPublic" },
                },
              },
            },
            400: {
              description: "Ошибка валидации",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            409: {
              description: "Пользователь уже существует",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Авторизация пользователя",
          description: "Используйте один из тестовых аккаунтов из README для получения JWT токенов.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
                examples: {
                  admin: {
                    summary: "Вход под администратором",
                    value: { email: "admin@techmarket.local", password: "admin12345" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Токены доступа",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TokensResponse" },
                },
              },
            },
            401: {
              description: "Неверные данные",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            403: {
              description: "Пользователь заблокирован",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Обновление accessToken/refreshToken",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Новая пара токенов",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TokensResponse" },
                },
              },
            },
            400: {
              description: "Отсутствует refreshToken",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            401: {
              description: "Недействительный refreshToken",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Профиль текущего пользователя",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Данные пользователя",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UserPublic" },
                },
              },
            },
            401: {
              description: "Нет или недействительный токен",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/api/users": {
        get: {
          tags: ["Users"],
          summary: "Список пользователей (кэш 60с)",
          description: "Только admin. Для проверки кэша сравните source на первом и втором запросе.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Список пользователей с меткой источника",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CachedUsersResponse" },
                },
              },
            },
            403: {
              description: "Недостаточно прав",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/api/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Пользователь по id (кэш 60с)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              example: "A1b2C3",
            },
          ],
          responses: {
            200: {
              description: "Пользователь с меткой источника",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CachedUserResponse" },
                },
              },
            },
            404: {
              description: "Пользователь не найден",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
        put: {
          tags: ["Users"],
          summary: "Обновление пользователя (admin)",
          description: "После изменения происходит инвалидация users-кэша.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserUpdateRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Обновленные данные",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UserPublic" },
                },
              },
            },
            404: {
              description: "Пользователь не найден",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
        delete: {
          tags: ["Users"],
          summary: "Блокировка пользователя (admin)",
          description: "Пользователь помечается как заблокированный и users-кэш очищается.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Пользователь заблокирован",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BlockUserResponse" },
                },
              },
            },
            400: {
              description: "Нельзя заблокировать себя",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            404: {
              description: "Пользователь не найден",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/api/products": {
        get: {
          tags: ["Products"],
          summary: "Список товаров (кэш 600с)",
          description: "Доступно user/seller/admin. Для проверки кэша сравните source на повторном запросе.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Список товаров с меткой источника",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CachedProductsResponse" },
                },
              },
            },
            401: {
              description: "Нет токена",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
        post: {
          tags: ["Products"],
          summary: "Создать товар (seller/admin)",
          description: "После создания очищается products-кэш.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProductCreateRequest" },
                examples: {
                  sample: {
                    summary: "Пример создания",
                    value: {
                      title: "AirPods Max",
                      category: "Периферия Apple",
                      description: "Полноразмерные наушники Apple",
                      price: 62990,
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Товар создан",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Product" },
                },
              },
            },
            400: {
              description: "Ошибка валидации",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
      "/api/products/{id}": {
        get: {
          tags: ["Products"],
          summary: "Товар по id (кэш 600с)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              example: "Pr0dX1",
            },
          ],
          responses: {
            200: {
              description: "Товар с меткой источника",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CachedProductResponse" },
                },
              },
            },
            404: {
              description: "Товар не найден",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
        put: {
          tags: ["Products"],
          summary: "Обновить товар (seller/admin)",
          description: "После обновления очищается products-кэш.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProductUpdateRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Товар обновлен",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Product" },
                },
              },
            },
            400: {
              description: "Ошибка валидации",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
            404: {
              description: "Товар не найден",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
        delete: {
          tags: ["Products"],
          summary: "Удалить товар (admin)",
          description: "После удаления очищается products-кэш.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            204: {
              description: "Товар удален",
            },
            404: {
              description: "Товар не найден",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  const normalizedEmail = normalizeEmail(email);
  const cleanFirstName = String(first_name || "").trim();
  const cleanLastName = String(last_name || "").trim();

  if (!normalizedEmail || !cleanFirstName || !cleanLastName || !password) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  if (findUserByEmail(normalizedEmail)) {
    return res.status(409).json({ error: "Пользователь уже существует" });
  }

  const newUser = {
    id: nanoid(6),
    email: normalizedEmail,
    first_name: cleanFirstName,
    last_name: cleanLastName,
    role: ROLES.USER,
    isBlocked: false,
    passwordHash: await hashPassword(password),
  };

  users.push(newUser);
  await invalidateUsersCache();
  res.status(201).json(toPublicUser(newUser));
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);

  if (!user) {
    return res.status(401).json({ error: "Неверные учетные данные" });
  }

  if (user.isBlocked) {
    return res.status(403).json({ error: "Пользователь заблокирован" });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Неверные учетные данные" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.set(refreshToken, user.id);

  res.json({ accessToken, refreshToken });
});

app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  const tokenOwnerId = refreshTokens.get(refreshToken);
  if (!tokenOwnerId) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);

    if (payload.sub !== tokenOwnerId) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = findUserById(payload.sub);
    if (!user) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ error: "User not found" });
    }

    if (user.isBlocked) {
      refreshTokens.delete(refreshToken);
      return res.status(403).json({ error: "Пользователь заблокирован" });
    }

    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.set(newRefreshToken, user.id);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

app.get(
  "/api/auth/me",
  authMiddleware,
  rolesMiddleware(VIEWER_ROLES),
  (req, res) => {
    res.json(toPublicUser(req.currentUser));
  }
);

app.get(
  "/api/users",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  cacheMiddleware(() => "users:all", USERS_CACHE_TTL_SECONDS),
  async (req, res) => {
    const data = users.map(toPublicUser);
    await saveToCache(req.cacheKey, data, req.cacheTTL);

    res.json({
      source: "server",
      data,
    });
  }
);

app.get(
  "/api/users/:id",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  cacheMiddleware((req) => `users:${req.params.id}`, USERS_CACHE_TTL_SECONDS),
  async (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const data = toPublicUser(user);
    await saveToCache(req.cacheKey, data, req.cacheTTL);

    res.json({
      source: "server",
      data,
    });
  }
);

app.put(
  "/api/users/:id",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { email, first_name, last_name, role } = req.body;

    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return res.status(400).json({ error: "Email не может быть пустым" });
      }

      const exists = users.some(
        (candidate) =>
          candidate.email === normalizedEmail && candidate.id !== user.id
      );

      if (exists) {
        return res.status(409).json({ error: "Email уже используется" });
      }

      user.email = normalizedEmail;
    }

    if (first_name !== undefined) {
      const cleanFirstName = String(first_name).trim();
      if (!cleanFirstName) {
        return res.status(400).json({ error: "first_name не может быть пустым" });
      }
      user.first_name = cleanFirstName;
    }

    if (last_name !== undefined) {
      const cleanLastName = String(last_name).trim();
      if (!cleanLastName) {
        return res.status(400).json({ error: "last_name не может быть пустым" });
      }
      user.last_name = cleanLastName;
    }

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return res.status(400).json({ error: "Недопустимая роль" });
      }
      user.role = role;
    }

    await invalidateUsersCache(user.id);
    res.json(toPublicUser(user));
  }
);

app.delete(
  "/api/users/:id",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.id === req.user.sub) {
      return res.status(400).json({ error: "Нельзя заблокировать самого себя" });
    }

    user.isBlocked = true;
    revokeRefreshTokensByUserId(user.id);

    await invalidateUsersCache(user.id);
    res.json({ message: "Пользователь заблокирован", user: toPublicUser(user) });
  }
);

app.get(
  "/api/products",
  authMiddleware,
  rolesMiddleware(VIEWER_ROLES),
  cacheMiddleware(() => "products:all", PRODUCTS_CACHE_TTL_SECONDS),
  async (req, res) => {
    const data = products;
    await saveToCache(req.cacheKey, data, req.cacheTTL);

    res.json({
      source: "server",
      data,
    });
  }
);

app.post(
  "/api/products",
  authMiddleware,
  rolesMiddleware(SELLER_ROLES),
  async (req, res) => {
    const { title, category, description, price } = req.body;

    const validationError = validateProductPayload(
      { title, category, price },
      { partial: false }
    );
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const product = {
      id: nanoid(6),
      title: String(title).trim(),
      category: String(category).trim(),
      description: String(description || "").trim(),
      price: Number(price),
    };

    products.push(product);
    await invalidateProductsCache();

    res.status(201).json(product);
  }
);

app.get(
  "/api/products/:id",
  authMiddleware,
  rolesMiddleware(VIEWER_ROLES),
  cacheMiddleware(
    (req) => `products:${req.params.id}`,
    PRODUCTS_CACHE_TTL_SECONDS
  ),
  async (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (!product) return;

    const data = product;
    await saveToCache(req.cacheKey, data, req.cacheTTL);

    res.json({
      source: "server",
      data,
    });
  }
);

app.put(
  "/api/products/:id",
  authMiddleware,
  rolesMiddleware(SELLER_ROLES),
  async (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (!product) return;

    const { title, category, description, price } = req.body;

    const validationError = validateProductPayload(req.body, { partial: true });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (title !== undefined) product.title = String(title).trim();
    if (category !== undefined) product.category = String(category).trim();
    if (description !== undefined) product.description = String(description).trim();
    if (price !== undefined) product.price = Number(price);

    await invalidateProductsCache(product.id);
    res.json(product);
  }
);

app.delete(
  "/api/products/:id",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    const exists = products.some((p) => p.id === req.params.id);
    if (!exists) {
      return res.status(404).json({ error: "Товар не найден" });
    }

    products = products.filter((p) => p.id !== req.params.id);
    await invalidateProductsCache(req.params.id);

    res.status(204).send();
  }
);

async function startServer() {
  try {
    await initRedis();

    app.listen(port, () => {
      console.log(`Сервер запущен: http://localhost:${port}`);
      console.log(`Swagger: http://localhost:${port}/api-docs`);
      console.log("Тестовые аккаунты:");
      console.log("admin@techmarket.local / admin12345");
      console.log("seller@techmarket.local / seller12345");
      console.log("user@techmarket.local / user12345");
    });
  } catch (err) {
    console.error("Не удалось подключиться к Redis. Проверьте запуск Redis на порту 6379.");
    console.error(err.message);
    process.exit(1);
  }
}

startServer();
