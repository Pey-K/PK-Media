#!/usr/bin/env node
/**
 * Post-build script to move HTML files from dist/src/ to dist/
 * This ensures Cloudflare Pages can find index.html at the root
 */
import { copyFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, rmdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');
const srcDir = resolve(distDir, 'src');

console.log('📦 Post-build: Moving HTML files...');

// Move index.html from dist/src/ to dist/
const srcIndexPath = resolve(srcDir, 'index.html');
const distIndexPath = resolve(distDir, 'index.html');
if (existsSync(srcIndexPath)) {
  try {
    copyFileSync(srcIndexPath, distIndexPath);
    unlinkSync(srcIndexPath);
    console.log('✓ Moved index.html from dist/src/ to dist/');
  } catch (err) {
    console.error('✗ Error moving index.html:', err);
    process.exit(1);
  }
} else {
  console.warn('⚠ index.html not found in dist/src/');
}

// Move and restructure other HTML files for clean URLs
const htmlFiles = ['movies.html', 'tvshows.html', 'music.html'];
htmlFiles.forEach(file => {
  const srcHtmlPath = resolve(srcDir, file);
  if (existsSync(srcHtmlPath)) {
    try {
      const dirName = file.replace('.html', '');
      const dirPath = resolve(distDir, dirName);
      const indexPath = resolve(dirPath, 'index.html');
      
      // Create directory
      mkdirSync(dirPath, { recursive: true });
      
      // Move HTML file to directory/index.html
      copyFileSync(srcHtmlPath, indexPath);
      
      // Remove original file
      unlinkSync(srcHtmlPath);
      
      console.log(`✓ Restructured ${file} -> ${dirName}/index.html`);
    } catch (err) {
      console.error(`✗ Error restructuring ${file}:`, err);
      process.exit(1);
    }
  }
});

// Remove empty src directory if it exists
try {
  if (existsSync(srcDir)) {
    const remainingFiles = readdirSync(srcDir);
    if (remainingFiles.length === 0) {
      rmdirSync(srcDir);
      console.log('✓ Removed empty dist/src/ directory');
    } else {
      console.warn(`⚠ dist/src/ directory still contains: ${remainingFiles.join(', ')}`);
    }
  }
} catch (err) {
  // Ignore errors removing directory
}

console.log('✅ Post-build complete!');

