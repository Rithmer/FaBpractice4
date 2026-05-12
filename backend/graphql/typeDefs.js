const typeDefs = `#graphql

  """Категория товаров (один автор → много книг ≡ одна категория → много товаров)"""
  type Category {
    id: ID!
    name: String!
    description: String
    """Все товары данной категории (вложенный резолвер)"""
    products: [Product!]!
  }

  """Товар в каталоге"""
  type Product {
    id: ID!
    title: String!
    price: Float!
    description: String
    inStock: Boolean!
    """Категория товара (вложенный резолвер)"""
    category: Category!
  }

  # ── Запросы (чтение) ──────────────────────────────────
  type Query {
    """Получить все товары"""
    products: [Product!]!

    """Получить товар по id"""
    product(id: ID!): Product

    """Получить все категории"""
    categories: [Category!]!

    """Получить категорию по id"""
    category(id: ID!): Category
  }

  # ── Мутации (изменение данных) ────────────────────────
  type Mutation {
    """Создать новую категорию"""
    createCategory(name: String!, description: String): Category!

    """Создать новый товар"""
    createProduct(
      title: String!
      price: Float!
      description: String
      inStock: Boolean
      categoryId: ID!
    ): Product!
  }
`;

module.exports = { typeDefs };
