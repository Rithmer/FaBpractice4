const jwt = require("jsonwebtoken");
const {
  ACCESS_SECRET,
  REFRESH_SECRET,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  ROLES,
} = require("../config/constants");

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}
function generateId(prefix = "") {
  return prefix + Math.random().toString(36).substring(2, 8);
}
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    is_blocked: user.is_blocked,
  };
}

module.exports = { normalizeEmail, isValidRole, generateId, toPublicUser };
