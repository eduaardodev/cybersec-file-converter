FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build assets and bundle server
RUN npm run build

# Expose HTTP port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
