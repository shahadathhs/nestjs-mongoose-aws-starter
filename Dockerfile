# ====== BUILD STAGE ======
FROM node:24-slim AS builder

# Enable corepack and activate pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Install system dependencies for build
RUN apt update && apt install -y

# Copy package, lock file
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy rest of the project files
COPY . .

# Build the app (NestJS -> dist/)
RUN pnpm build

# ====== PRODUCTION STAGE ======
FROM node:24-slim AS production

# Enable corepack and activate pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Install system dependencies needed at runtime
RUN apt update && apt install -y curl

# Copy necessary files from builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/dist ./dist

# Install dependencies
RUN pnpm install --frozen-lockfile

# Expose the port
EXPOSE 3000

# Run the app
CMD ["pnpm", "start"]
