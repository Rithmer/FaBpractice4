FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --ignore-scripts && npm rebuild bcrypt

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]