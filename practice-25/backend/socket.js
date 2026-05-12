const socketIo = require("socket.io");

let io = null;

const userVisibilityBySocket = new Map();

function initSocket(server) {
  const frontendOrigins = (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  io = socketIo(server, {
    cors: {
      origin: frontendOrigins.length ? frontendOrigins : "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    userVisibilityBySocket.set(socket.id, { userId: null, visible: false });

    socket.on("userVisibility", (payload) => {
      const userId = String(payload?.userId || "");
      if (!userId) return;
      userVisibilityBySocket.set(socket.id, {
        userId,
        visible: Boolean(payload?.visible),
      });
    });

    socket.on("deliveryReminderCreated", (payload) => {
      io.emit("deliveryReminderCreated", payload);
    });

    socket.on("disconnect", () => {
      userVisibilityBySocket.delete(socket.id);
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error("Socket.io не инициализирован. Вызови initSocket(server) сначала.");
  return io;
}

function isUserCurrentlyVisible(userId) {
  for (const state of userVisibilityBySocket.values()) {
    if (state.userId === String(userId) && state.visible) return true;
  }
  return false;
}

module.exports = { initSocket, getIo, isUserCurrentlyVisible };