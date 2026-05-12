FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY graphql/ ./graphql/

EXPOSE 4000

CMD ["node", "graphql/server.js"]