const { normalizeEmail, isValidRole, generateId, toPublicUser } = require("../helpers/user");

describe("normalizeEmail", () => {
  test("приводит к нижнему регистру и trim", () => {
    expect(normalizeEmail("  TEST@MAIL.COM  ")).toBe("test@mail.com");
  });
  test("пустая строка", () => {
    expect(normalizeEmail("")).toBe("");
  });
});

describe("isValidRole", () => {
  test("customer — валидная роль", () => {
    expect(isValidRole("customer")).toBe(true);
  });
  test("admin — валидная роль", () => {
    expect(isValidRole("admin")).toBe(true);
  });
  test("seller — валидная роль", () => {
    expect(isValidRole("seller")).toBe(true);
  });
  test("superuser — не валидная роль", () => {
    expect(isValidRole("superuser")).toBe(false);
  });
});

describe("generateId", () => {
  test("генерирует строку с префиксом", () => {
    const id = generateId("u");
    expect(id.startsWith("u")).toBe(true);
    expect(id.length).toBeGreaterThan(1);
  });
  test("два id не совпадают", () => {
    expect(generateId("x")).not.toBe(generateId("x"));
  });
});

describe("toPublicUser", () => {
  test("не включает password_hash", () => {
    const user = { id: "1", email: "a@b.com", first_name: "A", last_name: "B", role: "customer", is_blocked: false, password_hash: "secret" };
    const result = toPublicUser(user);
    expect(result.password_hash).toBeUndefined();
    expect(result.email).toBe("a@b.com");
  });
});
