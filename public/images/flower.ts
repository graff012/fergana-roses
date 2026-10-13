import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Function to ensure upload directory exists
export function ensureUploadDirectory() {
  const uploadDir = join(process.cwd(), 'public', 'images');

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
    console.log('Created upload directory:', uploadDir);
  } else {
    console.log('Upload directory exists:', uploadDir);
  }
}
