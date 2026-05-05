const jwt = require("jsonwebtoken");
const { pool } = require("../db/postgres");
const { ACCESS_SECRET } = require("../config/constants");

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token)
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      payload.sub,
    ]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.is_blocked)
      return res.status(403).json({ error: "User is blocked" });
    req.user = { sub: user.id, email: user.email, role: user.role };
    req.currentUser = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authMiddleware };
