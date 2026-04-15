require("dotenv").config();

const express = require("express");
const { pool, initDb } = require("./db");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post("/api/users", async (req, res) => {
  try {
    const { first_name, last_name, age } = req.body;

    if (!first_name || !last_name || Number.isNaN(Number(age))) {
      return res.status(400).json({
        message: "Для создания пользователя нужны поля: first_name, last_name и age.",
      });
    }

    const insertQuery = `
      INSERT INTO users (first_name, last_name, age)
      VALUES ($1, $2, $3)
      RETURNING id, first_name, last_name, age, created_at, updated_at;
    `;
    const { rows } = await pool.query(insertQuery, [
      first_name,
      last_name,
      Number(age),
    ]);

    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({
      message: "Не удалось создать пользователя. Попробуйте позже.",
    });
  }
});

app.get("/api/users", async (_req, res) => {
  try {
    const query = `
      SELECT id, first_name, last_name, age, created_at, updated_at
      FROM users
      ORDER BY id ASC;
    `;
    const { rows } = await pool.query(query);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({
      message: "Не удалось получить список пользователей. Попробуйте позже.",
    });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const query = `
      SELECT id, first_name, last_name, age, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const { rows } = await pool.query(query, [Number(req.params.id)]);

    if (!rows[0]) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({
      message: "Не удалось получить пользователя. Попробуйте позже.",
    });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  try {
    const { first_name, last_name, age } = req.body;
    const fields = [];
    const values = [];

    if (first_name !== undefined) {
      fields.push(`first_name = $${values.length + 1}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      fields.push(`last_name = $${values.length + 1}`);
      values.push(last_name);
    }
    if (age !== undefined) {
      if (Number.isNaN(Number(age))) {
        return res.status(400).json({ message: "Поле age должно быть числом." });
      }
      fields.push(`age = $${values.length + 1}`);
      values.push(Number(age));
    }

    if (fields.length === 0) {
      return res.status(400).json({
        message: "Передайте хотя бы одно поле для обновления: first_name, last_name или age.",
      });
    }

    fields.push("updated_at = CAST(EXTRACT(EPOCH FROM NOW()) AS BIGINT)");
    values.push(Number(req.params.id));

    const query = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, first_name, last_name, age, created_at, updated_at;
    `;

    const { rows } = await pool.query(query, values);

    if (!rows[0]) {
      return res.status(404).json({ message: "Пользователь не найден." });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({
      message: "Не удалось обновить пользователя. Попробуйте позже.",
    });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const query = "DELETE FROM users WHERE id = $1 RETURNING id;";
    const { rows } = await pool.query(query, [Number(req.params.id)]);

    if (!rows[0]) {
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
    await initDb();
    app.listen(port, () => {
      console.log(`Practice 19 API запущено на http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Ошибка запуска сервера Practice 19:", error);
    process.exit(1);
  }
}

start();
