const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const port = 3000;

let users = [
  { id: nanoid(6), name: 'Петр', age: 16 },
  { id: nanoid(6), name: 'Иван', age: 18 },
  { id: nanoid(6), name: 'Дарья', age: 20 },
];

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      console.log('Body:', req.body);
    }
  });
  next();
});

function findUserOr404(id, res) {
  const user = users.find(u => u.id == id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }
  return user;
}

app.post("/api/users", (req, res) => {
  const { name, age } = req.body;
  const newUser = { id: nanoid(6), name: name.trim(), age: Number(age) };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.get("/api/users", (req, res) => res.json(users));
app.get("/api/users/:id", (req, res) => {
  const user = findUserOr404(req.params.id, res);
  if (!user) return;
  res.json(user);
});

app.patch("/api/users/:id", (req, res) => {
  const user = findUserOr404(req.params.id, res);
  if (!user) return;
  if (req.body?.name === undefined && req.body?.age === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  const { name, age } = req.body;
  if (name !== undefined) user.name = name.trim();
  if (age !== undefined) user.age = Number(age);
  res.json(user);
});

app.delete("/api/users/:id", (req, res) => {
  const exists = users.some(u => u.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "User not found" });
  users = users.filter(u => u.id !== req.params.id);
  res.status(204).send();
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => console.log(`Сервер запущен: http://localhost:${port}`));