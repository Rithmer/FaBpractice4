# Практика 20 (MongoDB + API) — личная инструкция

Этот файл сделан как личная шпаргалка: от нуля до полного тестирования API.

## 1) Что нужно установить

- Node.js 18+
- MongoDB 6/7+

Проверка версий:

```bash
node -v
npm -v
mongod --version
mongosh --version
```

## 2) Установка зависимостей проекта

Из папки `practice-20`:

```bash
npm install
```

## 3) Подготовка MongoDB

### 3.1 Запуск MongoDB (macOS, Homebrew)

```bash
brew services start mongodb-community
```

Проверить статус:

```bash
brew services list | rg mongodb
```

## 4) Связка БД с API

Создать `.env` на основе шаблона:

```bash
cp .env.example .env
```

Проверить `.env`:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/practice20
```

## 5) Запуск API

```bash
npm start
```

Если всё ок, в логах будет:

`Practice 20 API запущено на http://localhost:3001`

## 6) Полное тестирование API (curl)

Ниже — команды в правильном порядке для полного прогона CRUD и проверок ошибок.

### 6.1 Создать пользователя (Create)

```bash
curl -i -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Илья","last_name":"Константинов","age":20}'
```

Ожидается: `201 Created` и JSON с полями `id`, `first_name`, `last_name`, `age`, `created_at`, `updated_at`.

### 6.2 Получить список пользователей (Read all)

```bash
curl -i http://localhost:3001/api/users
```

Ожидается: `200 OK` и массив пользователей.

### 6.3 Получить пользователя по id (Read one)

```bash
curl -i http://localhost:3001/api/users/1
```

Ожидается: `200 OK` и объект пользователя.

### 6.4 Обновить пользователя (Update)

```bash
curl -i -X PATCH http://localhost:3001/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"age":20,"last_name":"Петров"}'
```

Ожидается: `200 OK` и обновленный объект.

### 6.5 Удалить пользователя (Delete)

```bash
curl -i -X DELETE http://localhost:3001/api/users/1
```

Ожидается: `200 OK` и сообщение `Пользователь успешно удален.`

### 6.6 Проверка, что удален

```bash
curl -i http://localhost:3001/api/users/1
```

Ожидается: `404 Not Found` и `Пользователь не найден.`

## 7) Негативные тесты (обязательно)

### 7.1 Создание без обязательных полей

```bash
curl -i -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Илья"}'
```

Ожидается: `400 Bad Request`.

### 7.2 Обновление с нечисловым age

```bash
curl -i -X PATCH http://localhost:3001/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"age":"Тест"}'
```

Ожидается: `400 Bad Request` и сообщение про `age`.

### 7.3 Обновление без полей

```bash
curl -i -X PATCH http://localhost:3001/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{}'
```

Ожидается: `400 Bad Request`.

## 8) Быстрый сброс данных для повторного теста

Подключиться к Mongo shell:

```bash
mongosh
```

Очистить коллекции:

```javascript
use practice20
db.users.deleteMany({})
db.counters.deleteMany({})
```

Выйти:

```javascript
exit
```
