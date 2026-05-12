const reminders = new Map();
let reminderSequence = 1;

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-zа-я0-9]/gi, "");
}

function isReminderMatched(reminderQuery, productTitle) {
  const queryNorm = normalizeText(reminderQuery);
  const titleNorm = normalizeText(productTitle);
  if (!queryNorm || !titleNorm) return false;
  return titleNorm.includes(queryNorm);
}

function createReminder(userId, userEmail, productTitle) {
  const id = reminderSequence++;
  reminders.set(id, {
    id,
    userId,
    userEmail,
    productQuery: productTitle,
    active: true,
    createdAt: Date.now(),
  });
  return { id, productTitle };
}

function getUserReminders(userId) {
  return Array.from(reminders.values())
    .filter((r) => r.userId === userId)
    .map((r) => ({ id: r.id, productTitle: r.productQuery, createdAt: r.createdAt }));
}

function dismissReminder(reminderId) {
  const id = Number.parseInt(reminderId, 10);
  if (!id || !reminders.has(id)) return false;
  reminders.delete(id);
  return true;
}

function matchRemindersForProduct(product) {
  const matched = [];
  for (const [reminderId, reminder] of reminders.entries()) {
    if (!reminder?.active) continue;
    if (!isReminderMatched(reminder.productQuery, product.title)) continue;
    matched.push({
      reminderId,
      userId: reminder.userId,
      query: reminder.productQuery,
      productTitle: product.title,
    });
    reminders.delete(reminderId);
  }
  return matched;
}

module.exports = {
  createReminder,
  getUserReminders,
  dismissReminder,
  matchRemindersForProduct,
};