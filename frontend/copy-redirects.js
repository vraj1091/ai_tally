// Script to copy _redirects file to dist after build
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.join(__dirname, 'public', '_redirects');
const dest = path.join(__dirname, 'dist', '_redirects');

if (fs.existsSync(source)) {
  if (!fs.existsSync(path.dirname(dest))) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
  }
  fs.copyFileSync(source, dest);
  console.log('✓ Copied _redirects to dist/');
} else {
  console.log('⚠ _redirects file not found in public/');
}
