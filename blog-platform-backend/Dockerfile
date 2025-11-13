FROM node:22 AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev

FROM gcr.io/distroless/nodejs22

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .

CMD [ "index.js" ]