const { Router } = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  getPublicKey,
  addSubscription,
  removeSubscription,
} = require("../services/push.service");

const router = Router();

router.get("/public-key", authMiddleware, (req, res) => {
  res.json({ publicKey: getPublicKey() });
});

router.post("/subscribe", authMiddleware, (req, res) => {
  const subscription = req.body;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: "Некорректная подписка" });
  }
  addSubscription(req.user.sub, subscription);
  return res.status(201).json({ message: "Подписка сохранена" });
});

router.post("/unsubscribe", authMiddleware, (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint обязателен" });
  }
  removeSubscription(endpoint);
  return res.status(200).json({ message: "Подписка удалена" });
});

module.exports = router;