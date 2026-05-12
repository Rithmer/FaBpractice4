const { Router } = require("express");
const { pool } = require("../db/postgres");
const { Product } = require("../db/mongo");
const { redisClient } = require("../db/redis");
const { authMiddleware } = require("../middleware/auth.middleware");
const { rolesMiddleware } = require("../middleware/roles.middleware");
const { generateId } = require("../helpers/user");
const { VIEWER_ROLES, ROLES } = require("../config/constants");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

const router = Router();

router.post("/", authMiddleware, rolesMiddleware(VIEWER_ROLES), async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items обязателен и не должен быть пустым" });

  try {
    let total = 0;
    const enrichedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ error: `Товар ${item.productId} не найден` });
      if (product.stock < item.quantity)
        return res.status(400).json({ error: `Недостаточно товара "${product.title}" на складе` });

      const lineTotal = product.price * item.quantity;
      total += lineTotal;
      enrichedItems.push({
        productId: product._id,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        lineTotal,
      });
    }

    let paymentIntentId = null;
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_placeholder") {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: "rub",
        metadata: { userId: req.user.sub },
      });
      paymentIntentId = paymentIntent.id;
    }

    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }
    await redisClient.del("products:all");

    const orderId = generateId("o");
    await pool.query(
      `INSERT INTO orders (id, user_id, items, total, status, stripe_payment_intent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, req.user.sub, JSON.stringify(enrichedItems), total, "paid", paymentIntentId],
    );

    res.status(201).json({ id: orderId, items: enrichedItems, total, status: "paid" });
  } catch (err) {
    console.error("Ошибка создания заказа:", err);
    res.status(500).json({ error: "Ошибка создания заказа" });
  }
});

router.get("/my", authMiddleware, rolesMiddleware(VIEWER_ROLES), async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.sub],
    );
    res.json(rows.map((o) => ({ ...o, items: o.items })));
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения заказов" });
  }
});

router.get("/", authMiddleware, rolesMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения заказов" });
  }
});

module.exports = router;
