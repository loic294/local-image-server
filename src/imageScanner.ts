import * as fs from 'fs';
import * as path from 'path';
import sizeOf from 'image-size';
import logger from './logger';

/**
 * Checks if an image is horizontal (width > height)
 * @param filePath - Path to the image file
 * @returns true if the image is horizontal, false otherwise
 */
async function isHorizontalImage(filePath: string): Promise<boolean> {
  try {
    const buffer = await fs.promises.readFile(filePath);
    const dimensions = sizeOf(buffer);
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
 * Recursively finds all JPG files in a directory and its subdirectories
 * @param dirPath - The directory path to scan
 * @param onlyHorizontal - If true, only return horizontal images
 * @returns Array of absolute file paths to JPG files
 */
export async function findJpgFiles(dirPath: string, onlyHorizontal: boolean = false): Promise<string[]> {
  const jpgFiles: string[] = [];
  
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subDirFiles = await findJpgFiles(fullPath, onlyHorizontal);
        jpgFiles.push(...subDirFiles);
      } else if (entry.isFile()) {
        // Check if file has .jpg or .jpeg extension (case-insensitive)
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
          // If filtering for horizontal images, check dimensions
          if (onlyHorizontal) {
            if (await isHorizontalImage(fullPath)) {
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
