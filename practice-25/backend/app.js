const express = require("express");
const http = require("http");
const cors = require("cors");

const { initSocket } = require("./socket");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const productsRoutes = require("./routes/products.routes");
const pushRoutes = require("./routes/push.routes");
const remindersRoutes = require("./routes/reminders.routes");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/reminders", remindersRoutes);

const server = http.createServer(app);
initSocket(server);

module.exports = { app, server };