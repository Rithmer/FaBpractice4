const { toPublicProduct, validateProductPayload } = require("../helpers/product");

describe("toPublicProduct", () => {
  test("возвращает корректные поля", () => {
    const doc = { _id: "p1", title: "iPhone", category: "Смартфоны", description: "Тест", price: 99999, stock: 5 };
    const result = toPublicProduct(doc);
    expect(result).toEqual({ id: "p1", title: "iPhone", category: "Смартфоны", description: "Тест", price: 99999, stock: 5 });
  });

  test("stock по умолчанию 0", () => {
    const doc = { _id: "p2", title: "Test", category: "Cat", description: "", price: 1000 };
    expect(toPublicProduct(doc).stock).toBe(0);
  });
});

describe("validateProductPayload", () => {
  test("валидный товар возвращает null", () => {
    expect(validateProductPayload({ title: "iPhone", category: "Смартфоны", price: 1000 })).toBeNull();
  });

  test("пустой title — ошибка", () => {
    expect(validateProductPayload({ title: "", category: "Cat", price: 100 })).toBeTruthy();
  });

  test("пустая category — ошибка", () => {
    expect(validateProductPayload({ title: "Test", category: "", price: 100 })).toBeTruthy();
  });

  test("отрицательная цена — ошибка", () => {
    expect(validateProductPayload({ title: "Test", category: "Cat", price: -1 })).toBeTruthy();
  });

  test("нулевая цена — ошибка", () => {
    expect(validateProductPayload({ title: "Test", category: "Cat", price: 0 })).toBeTruthy();
  });

  test("partial — не проверяет отсутствующие поля", () => {
    expect(validateProductPayload({ price: 500 }, { partial: true })).toBeNull();
  });
});
