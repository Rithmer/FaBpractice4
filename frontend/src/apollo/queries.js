import { gql } from "@apollo/client";

export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      title
      price
      description
      inStock
      category {
        id
        name
      }
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      title
      price
      description
      inStock
      category {
        id
        name
        description
        products {
          id
          title
          price
        }
      }
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
      description
      products {
        id
        title
        price
        inStock
      }
    }
  }
`;

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($name: String!, $description: String) {
    createCategory(name: $name, description: $description) {
      id
      name
      description
      products {
        id
      }
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct(
    $title: String!
    $price: Float!
    $description: String
    $inStock: Boolean
    $categoryId: ID!
  ) {
    createProduct(
      title: $title
      price: $price
      description: $description
      inStock: $inStock
      categoryId: $categoryId
    ) {
      id
      title
      price
      description
      inStock
      category {
        id
        name
      }
    }
  }
`;
