require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    created_at: { type: Number, required: true },
    updated_at: { type: Number, required: true },
  },
  { versionKey: false }
);

const Counter = mongoose.model("Counter", counterSchema);
const User = mongoose.model("User", userSchema);

async function getNextUserId() {
  const counter = await Counter.findOneAndUpdate(
    { key: "users" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return counter.value;
}

app.post("/api/users", async (req, res) => {
  try {
    const { first_name, last_name, age } = req.body;
    if (!first_name || !last_name || Number.isNaN(Number(age))) {
      return res.status(400).json({
        message: "Для создания пользователя нужны поля: first_name, last_name и age.",
      });
    }

    const unixNow = Math.floor(Date.now() / 1000);
    const user = await User.create({
      id: await getNextUserId(),
      first_name,
      last_name,
      age: Number(age),
      created_at: unixNow,
      updated_at: unixNow,
    });

    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({
      message: "Не удалось создать пользователя. Попробуйте позже.",
    });
  }
});

app.get("/api/users", async (_req, res) => {
  try {
    const users = await User.find().sort({ id: 1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({
      message: "Не удалось получить список пользователей. Попробуйте позже.",
    });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findOne({ id: Number(req.params.id) });
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({
      message: "Не удалось получить пользователя. Попробуйте позже.",
    });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  try {
    const { first_name, last_name, age } = req.body;
    const update = { updated_at: Math.floor(Date.now() / 1000) };

    if (first_name !== undefined) {
      update.first_name = first_name;
    }
    if (last_name !== undefined) {
      update.last_name = last_name;
    }
    if (age !== undefined) {
      if (Number.isNaN(Number(age))) {
        return res.status(400).json({ message: "Поле age должно быть числом." });
      }
      update.age = Number(age);
    }

    if (Object.keys(update).length === 1) {
      return res.status(400).json({
        message: "Передайте хотя бы одно поле для обновления: first_name, last_name или age.",
      });
    }

    const user = await User.findOneAndUpdate({ id: Number(req.params.id) }, update, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({
      message: "Не удалось обновить пользователя. Попробуйте позже.",
    });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ id: Number(req.params.id) });
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    return res.json({ message: "Пользователь успешно удален." });
  } catch (error) {
    return res.status(500).json({
      message: "Не удалось удалить пользователя. Попробуйте позже.",
    });
  }
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    app.listen(port, () => {
      console.log(`Practice 20 API запущено на http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Ошибка запуска сервера Practice 20:", error);
    process.exit(1);
  }
}

start();
