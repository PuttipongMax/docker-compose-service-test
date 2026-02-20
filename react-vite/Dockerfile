FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host"] 
# ต้องมั่นใจว่า vite.config.js ตั้ง server: { host: true }