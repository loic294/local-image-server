import * as fs from 'fs';
import * as path from 'path';
import sizeOf from 'image-size';
import logger from './logger';

// Buffer size for reading image headers (512KB - enough for most images including those with large EXIF data)
const IMAGE_HEADER_BUFFER_SIZE = 524288;

/**
 * Checks if an image is horizontal (width > height)
 * @param filePath - Path to the image file
 * @returns true if the image is horizontal, false otherwise
 */
function isHorizontalImage(filePath: string): boolean {
  try {
    // Read the first 512KB which is enough for most image headers including large EXIF data
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(IMAGE_HEADER_BUFFER_SIZE);
    const bytesRead = fs.readSync(fd, buffer, 0, IMAGE_HEADER_BUFFER_SIZE, 0);
    fs.closeSync(fd);
    
    const dimensions = sizeOf(buffer.slice(0, bytesRead));
    if (dimensions.width && dimensions.height) {
      return dimensions.width > dimensions.height;
    }
    return false;
  } catch (error) {
    logger.warn(`Failed to read dimensions for ${filePath}:`, error);
    return false;
  }
}

/**
 * Checks if a path should be skipped based on skip patterns
 * @param pathToCheck - The path to check
 * @param skipPatterns - Array of patterns to match against
 * @returns true if the path should be skipped, false otherwise
 */
function shouldSkipPath(pathToCheck: string, skipPatterns: string[]): boolean {
  if (skipPatterns.length === 0) {
    return false;
  }
  
  return skipPatterns.some(pattern => pathToCheck.includes(pattern));
}

/**
 * Recursively finds all JPG files in a directory and its subdirectories
 * @param dirPath - The directory path to scan
 * @param onlyHorizontal - If true, only return horizontal images
 * @param skipPatterns - Array of string patterns to skip files/directories containing them
 * @returns Array of absolute file paths to JPG files
 */
export async function findJpgFiles(dirPath: string, onlyHorizontal: boolean = false, skipPatterns: string[] = []): Promise<string[]> {
  const jpgFiles: string[] = [];
  
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip if the path contains any of the skip patterns
      if (shouldSkipPath(fullPath, skipPatterns)) {
        logger.debug(`Skipping path: ${fullPath}`);
        continue;
      }
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subDirFiles = await findJpgFiles(fullPath, onlyHorizontal, skipPatterns);
        jpgFiles.push(...subDirFiles);
      } else if (entry.isFile()) {
        // Check if file has .jpg or .jpeg extension (case-insensitive)
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
          // If filtering for horizontal images, check dimensions
          if (onlyHorizontal) {
            if (isHorizontalImage(fullPath)) {
              jpgFiles.push(fullPath);
            }
          } else {
            jpgFiles.push(fullPath);
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error reading directory ${dirPath}:`, error);
    throw error;
  }
  
  return jpgFiles;
}

/**
 * Selects a random file from an array of file paths
 * @param files - Array of file paths
 * @returns A randomly selected file path, or null if array is empty
 */
export function selectRandomFile(files: string[]): string | null {
  if (files.length === 0) {
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * files.length);
  return files[randomIndex];
}
