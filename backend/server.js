const express = require("express");
const http = require("http");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { nanoid } = require("nanoid");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const jwt = require("jsonwebtoken");
const socketIo = require("socket.io");
const webpush = require("web-push");

const app = express();
const port = 3000;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: ["http://localhost:5173", "http://127.0.0.1:5173"] },
});

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

const vapidKeys = {
  publicKey:
    "BNSzB_cYrPRpiwP67-Q4nyu81mZHlq-acMcO0oo5m-yve3maWH0NlkN7Ht9YpNXwFk-tZB2B5UhfYNWW3YQyG_c",
  privateKey: "LrW4c3ShUQytys1hWfolBYPeASRX1Cyxh99VNI0yKWA",
};

webpush.setVapidDetails(
  "mailto:student@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

let subscriptions = [];
const reminders = new Map();
let reminderSequence = 1;
const userVisibilityBySocket = new Map();

function normalizeProductText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-zа-я0-9]/gi, "");
}

function isReminderMatched(reminderQuery, productTitle) {
  const queryNorm = normalizeProductText(reminderQuery);
  const titleNorm = normalizeProductText(productTitle);
  if (!queryNorm || !titleNorm) return false;
  return titleNorm.includes(queryNorm);
}

function sendPushToUser(userId, payload) {
  subscriptions
    .filter((sub) => sub.userId === userId)
    .forEach((sub) => {
      webpush.sendNotification(sub.subscription, payload).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          subscriptions = subscriptions.filter((s) => s.endpoint !== sub.endpoint);
        }
      });
    });
}

function isUserCurrentlyVisible(userId) {
  for (const state of userVisibilityBySocket.values()) {
    if (state.userId === String(userId) && state.visible) {
      return true;
    }
  }
  return false;
}

function triggerReminderIfMatched(product) {
  for (const [reminderId, reminder] of reminders.entries()) {
    if (!reminder || !reminder.active) {
      continue;
    }
    if (!isReminderMatched(reminder.productQuery, product.title)) {
      continue;
    }

    const notificationData = {
      title: "Товар появился в каталоге",
      body: `${product.title}`,
      reminderId,
    };
    const payload = JSON.stringify(notificationData);

    io.emit("availabilityAlertTriggered", {
      reminderId,
      userId: reminder.userId,
      query: reminder.productQuery,
      productTitle: product.title,
    });

    if (!isUserCurrentlyVisible(reminder.userId)) {
      sendPushToUser(reminder.userId, payload);
    }
    reminders.delete(reminderId);
  }
}

const ROLES = Object.freeze({
  USER: "user",
  SELLER: "seller",
  ADMIN: "admin",
});

const VIEWER_ROLES = [ROLES.USER, ROLES.SELLER, ROLES.ADMIN];
const SELLER_ROLES = [ROLES.SELLER, ROLES.ADMIN];
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
    },
    servers: [{ url: `http://localhost:${port}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./server.js"],
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

app.get("/api/users", authMiddleware, rolesMiddleware([ROLES.ADMIN]), (req, res) => {
  res.json(users.map(toPublicUser));
});

app.get(
  "/api/users/:id",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(toPublicUser(user));
  }
);

app.put(
  "/api/users/:id",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  (req, res) => {
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
        (candidate) => candidate.email === normalizedEmail && candidate.id !== user.id
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

    res.json(toPublicUser(user));
  }
);

app.delete(
  "/api/users/:id",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.id === req.user.sub) {
      return res.status(400).json({ error: "Нельзя заблокировать самого себя" });
    }

    user.isBlocked = true;
    revokeRefreshTokensByUserId(user.id);

    res.json({ message: "Пользователь заблокирован", user: toPublicUser(user) });
  }
);

app.get(
  "/api/products",
  authMiddleware,
  rolesMiddleware(VIEWER_ROLES),
  (req, res) => {
    res.json(products);
  }
);

app.post(
  "/api/products",
  authMiddleware,
  rolesMiddleware(SELLER_ROLES),
  (req, res) => {
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
    triggerReminderIfMatched(product);
    res.status(201).json(product);
  }
);

app.get(
  "/api/products/:id",
  authMiddleware,
  rolesMiddleware(VIEWER_ROLES),
  (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (product) {
      res.json(product);
    }
  }
);

app.put(
  "/api/products/:id",
  authMiddleware,
  rolesMiddleware(SELLER_ROLES),
  (req, res) => {
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

    triggerReminderIfMatched(product);
    res.json(product);
  }
);

app.delete(
  "/api/products/:id",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  (req, res) => {
    const exists = products.some((p) => p.id === req.params.id);
    if (!exists) {
      return res.status(404).json({ error: "Товар не найден" });
    }

    products = products.filter((p) => p.id !== req.params.id);
    res.status(204).send();
  }
);

app.get("/api/push/public-key", authMiddleware, (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post("/api/push/subscribe", authMiddleware, (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Некорректная подписка" });
  }
  const exists = subscriptions.some((sub) => sub.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push({
      endpoint: subscription.endpoint,
      userId: req.user.sub,
      subscription,
    });
  }
  return res.status(201).json({ message: "Подписка сохранена" });
});

app.post("/api/push/unsubscribe", authMiddleware, (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint обязателен" });
  }
  subscriptions = subscriptions.filter((sub) => sub.endpoint !== endpoint);
  return res.status(200).json({ message: "Подписка удалена" });
});

app.post("/api/reminders", authMiddleware, (req, res) => {
  const { productTitle } = req.body;
  const cleanTitle = String(productTitle || "").trim();
  if (!cleanTitle) {
    return res.status(400).json({ error: "productTitle обязателен" });
  }

  const reminderId = reminderSequence++;
  reminders.set(reminderId, {
    id: reminderId,
    userId: req.user.sub,
    userEmail: req.currentUser.email,
    productQuery: cleanTitle,
    active: true,
    createdAt: Date.now(),
  });

  return res.status(201).json({ id: reminderId, productTitle: cleanTitle });
});

app.get("/api/reminders", authMiddleware, (req, res) => {
  const userReminders = Array.from(reminders.values())
    .filter((reminder) => reminder.userId === req.user.sub)
    .map((reminder) => ({
      id: reminder.id,
      productTitle: reminder.productQuery,
      createdAt: reminder.createdAt,
    }));
  return res.json({ reminders: userReminders });
});

app.post("/api/reminders/dismiss", (req, res) => {
  const reminderId = Number.parseInt(req.query.reminderId, 10);
  if (!reminderId || !reminders.has(reminderId)) {
    return res.status(200).json({ message: "Already dismissed" });
  }

  reminders.delete(reminderId);
  io.emit("availabilityAlertDismissed", { reminderId });
  return res.status(200).json({ message: "Dismissed" });
});

io.on("connection", (socket) => {
  userVisibilityBySocket.set(socket.id, { userId: null, visible: false });

  socket.on("userVisibility", (payload) => {
    const userId = String(payload?.userId || "");
    if (!userId) return;
    userVisibilityBySocket.set(socket.id, {
      userId,
      visible: Boolean(payload?.visible),
    });
  });

  socket.on("deliveryReminderCreated", (payload) => {
    io.emit("deliveryReminderCreated", payload);
  });

  socket.on("disconnect", () => {
    userVisibilityBySocket.delete(socket.id);
  });
});

server.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api-docs`);
  console.log("Тестовые аккаунты:");
  console.log("admin@techmarket.local / admin12345");
  console.log("seller@techmarket.local / seller12345");
  console.log("user@techmarket.local / user12345");
});