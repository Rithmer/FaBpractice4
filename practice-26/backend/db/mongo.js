const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  _id: String,
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true },
});

const Product = mongoose.model("Product", productSchema);

async function connectMongo() {
  await mongoose.connect(
    process.env.MONGO_URL || "mongodb://mongo:27017/techmarket",
  );
  console.log("MongoDB: подключена");
}

async function initMongo() {
  const count = await Product.countDocuments();
  if (count === 0) {
    try {
      await Product.insertMany([
        {
          _id: "prd001",
          title: "iPhone 16 Pro 256GB",
          category: "Смартфоны Apple",
          description: "Флагман Apple с титановым корпусом и камерой Pro.",
          price: 149990,
        },
        {
          _id: "prd002",
          title: "iPhone 15 128GB",
          category: "Смартфоны Apple",
          description: "Смартфон Apple с Dynamic Island и разъемом USB-C.",
          price: 89990,
        },
        {
          _id: "prd003",
          title: "AirPods Pro (2-го поколения, USB-C)",
          category: "Периферия Apple",
          description: "Беспроводные наушники Apple с активным шумоподавлением.",
          price: 28990,
        },
        {
          _id: "prd004",
          title: "Apple Watch Series 10 (GPS)",
          category: "Периферия Apple",
          description: "Умные часы Apple для спорта, здоровья и уведомлений.",
          price: 46990,
        },
        {
          _id: "prd005",
          title: "MagSafe Charger",
          category: "Периферия Apple",
          description: "Магнитная беспроводная зарядка Apple для iPhone.",
          price: 5990,
        },
      ], { ordered: false });
      console.log("MongoDB: товары созданы");
    } catch (err) {
      if (err.code !== 11000) throw err;
      console.log("MongoDB: товары уже существуют");
    }
  }
}

module.exports = { Product, connectMongo, initMongo };