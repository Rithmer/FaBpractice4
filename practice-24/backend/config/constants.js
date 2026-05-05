const ROLES = Object.freeze({ USER: "user", SELLER: "seller", ADMIN: "admin" });
const VIEWER_ROLES = [ROLES.USER, ROLES.SELLER, ROLES.ADMIN];
const SELLER_ROLES = [ROLES.SELLER, ROLES.ADMIN];
const ALLOWED_PRODUCT_CATEGORIES = ["Смартфоны Apple", "Периферия Apple"];
const ACCESS_SECRET = process.env.ACCESS_SECRET || "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";
const PRODUCTS_CACHE_TTL = 60;

module.exports = {
  ROLES,
  VIEWER_ROLES,
  SELLER_ROLES,
  ALLOWED_PRODUCT_CATEGORIES,
  ACCESS_SECRET,
  REFRESH_SECRET,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  PRODUCTS_CACHE_TTL,
};
