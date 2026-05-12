const webpush = require("web-push");

const vapidKeys = {
  publicKey:
    "BNSzB_cYrPRpiwP67-Q4nyu81mZHlq-acMcO0oo5m-yve3maWH0NlkN7Ht9YpNXwFk-tZB2B5UhfYNWW3YQyG_c",
  privateKey: "LrW4c3ShUQytys1hWfolBYPeASRX1Cyxh99VNI0yKWA",
};

webpush.setVapidDetails(
  "mailto:student@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

let subscriptions = [];

function getPublicKey() {
  return vapidKeys.publicKey;
}

function addSubscription(userId, subscription) {
  const exists = subscriptions.some(
    (sub) => sub.endpoint === subscription.endpoint,
  );
  if (!exists) {
    subscriptions.push({ endpoint: subscription.endpoint, userId, subscription });
  }
}

function removeSubscription(endpoint) {
  subscriptions = subscriptions.filter((sub) => sub.endpoint !== endpoint);
}

function sendPushToUser(userId, payload) {
  subscriptions
    .filter((sub) => sub.userId === userId)
    .forEach((sub) => {
      webpush.sendNotification(sub.subscription, payload).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          subscriptions = subscriptions.filter(
            (s) => s.endpoint !== sub.endpoint,
          );
        }
      });
    });
}

module.exports = { getPublicKey, addSubscription, removeSubscription, sendPushToUser };