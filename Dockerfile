# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json package-lock.json* ./

# Install production dependencies with strict-ssl disabled to work around cert issues
RUN npm config set strict-ssl false && \
    (npm ci --omit=dev || npm install --production) && \
    npm config set strict-ssl true

# Copy the built application
COPY dist ./dist

# Create a volume mount point for images
VOLUME ["/images"]

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV IMAGE_DIR=/images

# Run the application
CMD ["node", "dist/index.js"]
