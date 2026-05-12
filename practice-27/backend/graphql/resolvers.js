const { categories, products } = require("./data");

const resolvers = {
  Query: {
    products: () => products,

    product: (_, { id }) => products.find((p) => p.id === id) ?? null,

    categories: () => categories,

    category: (_, { id }) => categories.find((c) => c.id === id) ?? null,
  },

  Mutation: {
    createCategory: (_, { name, description }) => {
      const category = {
        id: String(categories.length + 1),
        name,
        description: description ?? null,
      };
      categories.push(category);
      return category;
    },

    createProduct: (_, { title, price, description, inStock, categoryId }) => {
      const categoryExists = categories.find((c) => c.id === categoryId);
      if (!categoryExists) {
        throw new Error("Категория с id=" + categoryId + " не найдена");
      }

      const product = {
        id: String(products.length + 1),
        title,
        price,
        description: description ?? null,
        inStock: inStock ?? true,
        categoryId,
      };
      products.push(product);
      return product;
    },
  },

  Product: {
    category: (parent) => categories.find((c) => c.id === parent.categoryId),
  },

  Category: {
    products: (parent) => products.filter((p) => p.categoryId === parent.id),
  },
};

module.exports = { resolvers };
