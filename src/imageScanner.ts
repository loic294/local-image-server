import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';

/**
 * Recursively finds all JPG files in a directory and its subdirectories
 * @param dirPath - The directory path to scan
 * @returns Array of absolute file paths to JPG files
 */
export async function findJpgFiles(dirPath: string): Promise<string[]> {
  const jpgFiles: string[] = [];
  
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subDirFiles = await findJpgFiles(fullPath);
        jpgFiles.push(...subDirFiles);
      } else if (entry.isFile()) {
        // Check if file has .jpg or .jpeg extension (case-insensitive)
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
          jpgFiles.push(fullPath);
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
