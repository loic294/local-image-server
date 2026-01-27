import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import * as path from 'path';
import * as fs from 'fs';
import logger from './logger';
import { findJpgFiles, selectRandomFile } from './imageScanner';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const IMAGE_DIR = process.env.IMAGE_DIR || '/images';
const ONLY_HORIZONTAL = process.env.ONLY_HORIZONTAL === 'true';

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

// Cache for image files
let imageFiles: string[] = [];
let lastScanTime: number = 0;
const SCAN_CACHE_TTL = parseInt(process.env.SCAN_CACHE_TTL || '60000', 10); // Default 60 seconds

/**
 * Scans the image directory and updates the cache
 */
async function scanImageDirectory(): Promise<void> {
  const now = Date.now();
  
  // Use cache if it's still valid
  if (imageFiles.length > 0 && now - lastScanTime < SCAN_CACHE_TTL) {
    logger.debug('Using cached image list');
    return;
  }
  
  logger.info(`Scanning directory: ${IMAGE_DIR}${ONLY_HORIZONTAL ? ' (horizontal images only)' : ''}`);
  try {
    imageFiles = await findJpgFiles(IMAGE_DIR, ONLY_HORIZONTAL);
    lastScanTime = now;
    logger.info(`Found ${imageFiles.length} JPG files`);
  } catch (error) {
    logger.error('Failed to scan image directory:', error);
    throw error;
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    imageCount: imageFiles.length,
    imageDir: IMAGE_DIR
  });
});

/**
 * Main endpoint that serves a random image
 */
app.get('/image', async (_req: Request, res: Response) => {
  try {
    await scanImageDirectory();
    
    if (imageFiles.length === 0) {
      logger.warn('No JPG files found in directory');
      return res.status(404).json({ 
        error: 'No images found',
        message: `No JPG files found in directory: ${IMAGE_DIR}`
      });
    }
    
    const randomImage = selectRandomFile(imageFiles);
    
    if (!randomImage) {
      logger.error('Failed to select random image');
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to select random image'
      });
    }
    
    // Verify that the selected file is still within the IMAGE_DIR to prevent path traversal
    const resolvedImage = path.resolve(randomImage);
    const resolvedImageDir = path.resolve(IMAGE_DIR);
    
    if (!resolvedImage.startsWith(resolvedImageDir)) {
      logger.error(`Path traversal attempt detected: ${randomImage}`);
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Invalid file path'
      });
    }
    
    // Verify that the file exists before attempting to send it
    // This prevents serving HTML error pages when cached files no longer exist
    try {
      await fs.promises.access(resolvedImage, fs.constants.R_OK);
    } catch (accessError) {
      logger.warn(`Cached file no longer accessible: ${path.basename(randomImage)}`, accessError);
      // Remove the file from cache and rescan
      imageFiles = imageFiles.filter(f => f !== randomImage);
      if (imageFiles.length > 0) {
        // Try serving a different image
        const alternativeImage = selectRandomFile(imageFiles);
        if (alternativeImage) {
          const resolvedAlternative = path.resolve(alternativeImage);
          logger.debug(`Serving alternative image: ${path.basename(alternativeImage)}`);
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.sendFile(resolvedAlternative, (err) => {
            if (err) {
              logger.error(`Failed to send alternative file:`, err);
              if (!res.headersSent) {
                return res.status(500).json({ 
                  error: 'Failed to send image',
                  message: err.message
                });
              }
            }
          });
        }
      }
      return res.status(404).json({ 
        error: 'Image not found',
        message: 'The selected image file is no longer available'
      });
    }
    
    logger.debug(`Serving image: ${path.basename(randomImage)}`);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Send the image file with proper error handling
    res.sendFile(resolvedImage, (err) => {
      if (err) {
        logger.error(`Failed to send file ${path.basename(randomImage)}:`, err);
        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Failed to send image',
            message: err.message
          });
        }
      }
    });
  } catch (error) {
    logger.error('Error serving image:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Root endpoint with basic info
 */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Local Image Server',
    version: '1.0.0',
    endpoints: {
      '/': 'This info page',
      '/health': 'Health check',
      '/image': 'Get a random image from the configured directory'
    }
  });
});

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initial scan to validate directory exists
    await scanImageDirectory();
    
    app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
      logger.info(`Image directory: ${IMAGE_DIR}`);
      logger.info(`Only horizontal images: ${ONLY_HORIZONTAL}`);
      logger.info(`Cache TTL: ${SCAN_CACHE_TTL}ms`);
      logger.info(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

startServer();
