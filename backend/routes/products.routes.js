const { Router } = require("express");
const { Product } = require("../db/mongo");
const { redisClient, PRODUCTS_CACHE_TTL } = require("../db/redis");
const { authMiddleware } = require("../middleware/auth.middleware");
const { rolesMiddleware } = require("../middleware/roles.middleware");
const {
  toPublicProduct,
  validateProductPayload,
} = require("../helpers/product");
const { generateId } = require("../helpers/user");
const { VIEWER_ROLES, SELLER_ROLES, ROLES } = require("../config/constants");

const router = Router();

router.get(
  "/",
  authMiddleware,
  rolesMiddleware(VIEWER_ROLES),
  async (req, res) => {
    try {
      const cached = await redisClient.get("products:all");
      if (cached) {
        res.set("X-Cache", "HIT"); // ← кэш
        return res.json(JSON.parse(cached));
      }
      const products = await Product.find().sort({ title: 1 });
      const result = products.map(toPublicProduct);
      await redisClient.setEx(
        "products:all",
        PRODUCTS_CACHE_TTL,
        JSON.stringify(result),
      );
      res.set("X-Cache", "MISS");
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Ошибка получения товаров" });
    }
  },
);

router.get(
  "/:id",
  authMiddleware,
  rolesMiddleware(VIEWER_ROLES),
  async (req, res) => {
    try {
      const cacheKey = `products:${req.params.id}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        res.set("X-Cache", "HIT");
        return res.json(JSON.parse(cached));
      }
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: "Товар не найден" });
      const result = toPublicProduct(product);
      await redisClient.setEx(
        cacheKey,
        PRODUCTS_CACHE_TTL,
        JSON.stringify(result),
      );
      res.set("X-Cache", "MISS");
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Ошибка получения товара" });
    }
  },
);

router.post(
  "/",
  authMiddleware,
  rolesMiddleware(SELLER_ROLES),
  async (req, res) => {
    try {
      const { title, category, description, price } = req.body;
      const error = validateProductPayload({ title, category, price });
      if (error) return res.status(400).json({ error });
      const product = new Product({
        _id: generateId("p"),
        title: String(title).trim(),
        category: String(category).trim(),
        description: String(description || "").trim(),
        price: Number(price),
      });
      await product.save();
      await redisClient.del("products:all");
      res.status(201).json(toPublicProduct(product));
    } catch (err) {
      res.status(500).json({ error: "Ошибка создания товара" });
    }
  },
);

router.put(
  "/:id",
  authMiddleware,
  rolesMiddleware(SELLER_ROLES),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: "Товар не найден" });
      const error = validateProductPayload(req.body, { partial: true });
      if (error) return res.status(400).json({ error });
      if (req.body.title !== undefined)
        product.title = String(req.body.title).trim();
      if (req.body.category !== undefined)
        product.category = String(req.body.category).trim();
      if (req.body.description !== undefined)
        product.description = String(req.body.description).trim();
      if (req.body.price !== undefined) product.price = Number(req.body.price);
      await product.save();
      await redisClient.del("products:all");
      await redisClient.del(`products:${req.params.id}`);
      res.json(toPublicProduct(product));
    } catch (err) {
      res.status(500).json({ error: "Ошибка обновления товара" });
    }
  },
);

router.delete(
  "/:id",
  authMiddleware,
  rolesMiddleware([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) return res.status(404).json({ error: "Товар не найден" });
      await redisClient.del("products:all");
      await redisClient.del(`products:${req.params.id}`);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Ошибка удаления товара" });
    }
  },
);

module.exports = router;
