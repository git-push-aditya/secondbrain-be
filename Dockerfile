FROM node:20-alpine

WORKDIR /app

COPY ./package.json ./

COPY ./package-lock.json ./

RUN npm install

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 2233

CMD ["npm","run","container:start"]