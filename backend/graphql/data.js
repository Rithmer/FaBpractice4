const categories = [
  {
    id: "1",
    name: "Смартфоны Apple",
    description: "iPhone всех поколений и конфигураций",
  },
  {
    id: "2",
    name: "Периферия Apple",
    description: "Наушники, часы, зарядки и аксессуары Apple",
  },
  {
    id: "3",
    name: "Ноутбуки",
    description: "MacBook и другие ноутбуки",
  },
];

const products = [
  {
    id: "1",
    title: "iPhone 16 Pro 256GB",
    price: 149990,
    description: "Флагман Apple с титановым корпусом и камерой Pro.",
    inStock: true,
    categoryId: "1",
  },
  {
    id: "2",
    title: "iPhone 15 128GB",
    price: 89990,
    description: "Смартфон Apple с Dynamic Island и разъёмом USB-C.",
    inStock: true,
    categoryId: "1",
  },
  {
    id: "3",
    title: "AirPods Pro (2-го поколения)",
    price: 28990,
    description: "Беспроводные наушники Apple с активным шумоподавлением.",
    inStock: true,
    categoryId: "2",
  },
  {
    id: "4",
    title: "Apple Watch Series 10",
    price: 46990,
    description: "Умные часы Apple для спорта, здоровья и уведомлений.",
    inStock: false,
    categoryId: "2",
  },
  {
    id: "5",
    title: "MacBook Air M3 13\"",
    price: 139990,
    description: "Тонкий и лёгкий ноутбук Apple на чипе M3.",
    inStock: true,
    categoryId: "3",
  },
];

module.exports = { categories, products };
