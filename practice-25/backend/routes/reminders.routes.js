const { Router } = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  createReminder,
  getUserReminders,
  dismissReminder,
} = require("../services/reminders.service");
const { getIo } = require("../socket");

const router = Router();

router.post("/", authMiddleware, (req, res) => {
  const { productTitle } = req.body;
  const cleanTitle = String(productTitle || "").trim();
  if (!cleanTitle) {
    return res.status(400).json({ error: "productTitle обязателен" });
  }

  const reminder = createReminder(
    req.user.sub,
    req.currentUser.email,
    cleanTitle,
  );

  getIo().emit("deliveryReminderCreated", reminder);

  return res.status(201).json(reminder);
});

router.get("/", authMiddleware, (req, res) => {
  const userReminders = getUserReminders(req.user.sub);
  return res.json({ reminders: userReminders });
});

router.post("/dismiss", (req, res) => {
  const dismissed = dismissReminder(req.query.reminderId);
  if (dismissed) {
    getIo().emit("availabilityAlertDismissed", {
      reminderId: Number(req.query.reminderId),
    });
  }
  return res.status(200).json({ message: dismissed ? "Dismissed" : "Already dismissed" });
});

module.exports = router;