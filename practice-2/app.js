const express = require('express');
const app = express();
const port = 3000;

let products = [
  { id: 1, name: 'Ноутбук', price: 50000 },
  { id: 2, name: 'Смартфон', price: 25000 },
  { id: 3, name: 'Наушники', price: 3000 },
];

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Главная страница API товаров');
});

app.get('/products', (req, res) => {
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).send({ message: 'Товар не найден' });
  }
});

app.post('/products', (req, res) => {
  const { name, price } = req.body;
  const newProduct = {
    id: Date.now(),
    name,
    price
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.patch('/products/:id', (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  if (!product) {
    return res.status(404).send({ message: 'Товар не найден' });
  }
  const { name, price } = req.body;
  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = price;
  res.json(product);
});

app.delete('/products/:id', (req, res) => {
  const initialLength = products.length;
  products = products.filter(p => p.id != req.params.id);
  if (products.length === initialLength) {
    return res.status(404).send({ message: 'Товар не найден' });
  }
  res.send({ message: 'Товар удалён' });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
