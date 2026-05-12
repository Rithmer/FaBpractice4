const { Router } = require("express");
const { pool } = require("../db/postgres");
const { authMiddleware } = require("../middleware/auth.middleware");
const { rolesMiddleware } = require("../middleware/roles.middleware");
const {
  normalizeEmail,
  isValidRole,
  toPublicUser,
} = require("../helpers/user");
const { ROLES } = require("../config/constants");

const router = Router();
router.use(authMiddleware, rolesMiddleware([ROLES.ADMIN]));

router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users ORDER BY created_at");
  res.json(rows.map(toPublicUser));
});

router.get("/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
    req.params.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  res.json(toPublicUser(rows[0]));
});

router.put("/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
    req.params.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  const user = rows[0];
  const { email, first_name, last_name, role } = req.body;
  let newEmail = user.email,
    newFirstName = user.first_name,
    newLastName = user.last_name,
    newRole = user.role;
  if (email !== undefined) {
    newEmail = normalizeEmail(email);
    if (!newEmail)
      return res.status(400).json({ error: "Email не может быть пустым" });
    const dup = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [newEmail, user.id],
    );
    if (dup.rows.length > 0)
      return res.status(409).json({ error: "Email уже используется" });
  }
  if (first_name !== undefined) {
    newFirstName = String(first_name).trim();
    if (!newFirstName)
      return res.status(400).json({ error: "first_name не может быть пустым" });
  }
  if (last_name !== undefined) {
    newLastName = String(last_name).trim();
    if (!newLastName)
      return res.status(400).json({ error: "last_name не может быть пустым" });
  }
  if (role !== undefined) {
    if (!isValidRole(role))
      return res.status(400).json({ error: "Недопустимая роль" });
    newRole = role;
  }
  const updated = await pool.query(
    `UPDATE users SET email=$1, first_name=$2, last_name=$3, role=$4 WHERE id=$5 RETURNING *`,
    [newEmail, newFirstName, newLastName, newRole, user.id],
  );
  res.json(toPublicUser(updated.rows[0]));
});

router.delete("/:id", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
    req.params.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  if (rows[0].id === req.user.sub)
    return res.status(400).json({ error: "Нельзя заблокировать самого себя" });
  const updated = await pool.query(
    "UPDATE users SET is_blocked = TRUE WHERE id = $1 RETURNING *",
    [req.params.id],
  );
  await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
    req.params.id,
  ]);
  res.json({
    message: "Пользователь заблокирован",
    user: toPublicUser(updated.rows[0]),
  });
});

module.exports = router;
