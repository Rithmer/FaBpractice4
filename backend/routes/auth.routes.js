const { Router } = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../db/postgres");
const { authMiddleware } = require("../middleware/auth.middleware");
const { rolesMiddleware } = require("../middleware/roles.middleware");
const {
  normalizeEmail,
  isValidRole,
  generateId,
  toPublicUser,
} = require("../helpers/user");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../helpers/auth");
const { VIEWER_ROLES } = require("../config/constants");

const router = Router();

router.post("/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !first_name || !last_name || !password)
    return res.status(400).json({ error: "Все поля обязательны" });
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    normalizedEmail,
  ]);
  if (existing.rows.length > 0)
    return res.status(409).json({ error: "Email уже используется" });
  const password_hash = await bcrypt.hash(password, 10);
  const id = generateId("u");
  const { rows } = await pool.query(
    `INSERT INTO users (id, email, first_name, last_name, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [
      id,
      normalizedEmail,
      String(first_name).trim(),
      String(last_name).trim(),
      password_hash,
    ],
  );
  res.status(201).json(toPublicUser(rows[0]));
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    normalizeEmail(email),
  ]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Неверные учетные данные" });
  if (user.is_blocked)
    return res.status(403).json({ error: "Пользователь заблокирован" });
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid)
    return res.status(401).json({ error: "Неверные учетные данные" });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await pool.query(
    "INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)",
    [refreshToken, user.id],
  );
  res.json({ accessToken, refreshToken });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "refreshToken is required" });
  const { rows } = await pool.query(
    "SELECT * FROM refresh_tokens WHERE token = $1",
    [refreshToken],
  );
  if (rows.length === 0)
    return res.status(401).json({ error: "Invalid refresh token" });
  try {
    const payload = require("jsonwebtoken").verify(
      refreshToken,
      require("../config/constants").REFRESH_SECRET,
    );
    if (payload.sub !== rows[0].user_id) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
        refreshToken,
      ]);
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [
      payload.sub,
    ]);
    const user = userRes.rows[0];
    if (!user) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
        refreshToken,
      ]);
      return res.status(401).json({ error: "User not found" });
    }
    if (user.is_blocked) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
        refreshToken,
      ]);
      return res.status(403).json({ error: "Пользователь заблокирован" });
    }
    await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
      refreshToken,
    ]);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await pool.query(
      "INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)",
      [newRefreshToken, user.id],
    );
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
      refreshToken,
    ]);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.get("/me", authMiddleware, rolesMiddleware(VIEWER_ROLES), (req, res) => {
  res.json(toPublicUser(req.currentUser));
});

module.exports = router;
