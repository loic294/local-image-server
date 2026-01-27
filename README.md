# Local Image Server

A simple Node.js TypeScript application that serves random JPG images from a local directory. Every time the `/image` endpoint is called, it randomly selects one image from the configured directory and its subdirectories.

## Features

- 🎲 Random image selection from directory and subdirectories
- 🖼️ Supports JPG/JPEG files
- 📝 Logging for errors and debugging (using Winston)
- 🐳 Docker and Docker Compose support
- 🔄 GitHub Actions CI/CD pipeline
- ⚡ Fast image directory caching
- 🏥 Health check endpoint
- 🛡️ Rate limiting protection (100 requests per minute per IP)
- 🔒 Path traversal protection

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/loic294/local-image-server.git
cd local-image-server
```

2. Create a directory with your JPG images or use an existing one:
```bash
mkdir -p images
# Copy your JPG files to the images directory
```

3. Run with Docker Compose:
```bash
docker-compose up -d
```

4. Access the server:
- Random image: http://localhost:3000/image
- Health check: http://localhost:3000/health
- API info: http://localhost:3000/

### Using Docker

Build and run the Docker container:

```bash
# Build the image
docker build -t local-image-server .

# Run the container
docker run -d \
  -p 3000:3000 \
  -v /path/to/your/images:/images:ro \
  --name local-image-server \
  local-image-server
```

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (optional):
```bash
cp .env.example .env
# Edit .env to configure your settings
```

3. Build the project:
```bash
npm run build
```

4. Start the server:
```bash
# Set the image directory
export IMAGE_DIR=/path/to/your/images

# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

## Configuration

The application can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `IMAGE_DIR` | Directory containing JPG images | `/images` |
| `ONLY_HORIZONTAL` | Only select horizontal images (width > height) | `false` |
| `SKIP_PATTERNS` | Comma-separated list of strings to skip files/directories containing them (e.g., `.backup,thumbnail,temp`) | `` (empty) |
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | `info` |
| `SCAN_CACHE_TTL` | Cache TTL for image list in milliseconds | `60000` (60 seconds) |

## API Endpoints

### GET /
Returns basic API information and available endpoints.

**Response:**
```json
{
  "name": "Local Image Server",
  "version": "1.0.0",
  "endpoints": {
    "/": "This info page",
    "/health": "Health check",
    "/image": "Get a random image from the configured directory"
  }
}
```

### GET /health
Health check endpoint that returns server status.

**Response:**
```json
{
  "status": "ok",
  "imageCount": 42,
  "imageDir": "/images"
}
```

### GET /image
Returns a random JPG image from the configured directory.

**Response:**
- Content-Type: `image/jpeg`
- Body: Binary image data

**Errors:**
- `404`: No JPG files found in the directory
- `500`: Internal server error

## Docker Compose Example

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  local-image-server:
    image: ghcr.io/loic294/local-image-server:latest
    container_name: local-image-server
    ports:
      - "3000:3000"
    volumes:
      # Mount your local image directory
      - /path/to/your/images:/images:ro
    environment:
      - PORT=3000
      - IMAGE_DIR=/images
      - LOG_LEVEL=info
      - SCAN_CACHE_TTL=60000
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d
```

## Development

### Building

```bash
npm run build
```

### Cleaning

```bash
npm run clean
```

## GitHub Actions

The project includes two GitHub Actions workflows:

1. **Build and Test** (`.github/workflows/build.yml`)
   - Runs on push and pull requests
   - Tests on Node.js 18.x and 20.x
   - Validates TypeScript compilation

2. **Docker Build and Publish** (`.github/workflows/docker.yml`)
   - Runs only after PR is merged (on push to main/master)
   - Builds TypeScript code before Docker image
   - Publishes to GitHub Container Registry
   - Supports semantic versioning with tags

## License

ISC
