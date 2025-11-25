import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, cpSync, mkdirSync, unlinkSync, readFileSync, readdirSync, rmdirSync } from 'fs';

export default defineConfig({
  root: '.',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        movies: resolve(__dirname, 'src/movies.html'),
        tvshows: resolve(__dirname, 'src/tvshows.html'),
        music: resolve(__dirname, 'src/music.html')
      },
      output: {
        entryFileNames: 'assets/js/[name].js',
        chunkFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    assetsDir: 'assets',
    copyPublicDir: false
  },
    server: {
    port: 3000,
    open: true,
    fs: {
      allow: ['..']
    }
  },
  plugins: [
    {
      name: 'clean-urls-dev',
      configureServer(server) {
        // Handle clean URLs in development and ensure src/index.html is served for root
        server.middlewares.use((req, res, next) => {
          // Serve src/index.html for root path
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/src/index.html';
          }
          
          // Handle clean URLs in development
          const cleanUrlMap = {
            '/movies': '/src/movies.html',
            '/tvshows': '/src/tvshows.html',
            '/music': '/src/music.html',
            '/test': '/src/test.html'
          };
          
          if (cleanUrlMap[req.url]) {
            req.url = cleanUrlMap[req.url];
          }
          
          next();
        });
      }
    },
    {
      name: 'copy-static-assets',
      buildEnd() {
        // Copy static assets to dist folder after build
        const staticAssets = ['assets', 'css', 'data'];
        const staticFiles = ['favicon.ico', 'apple-bookmark.png', 'manifest.json'];
        
        staticAssets.forEach(asset => {
          const src = resolve(__dirname, asset);
          const dest = resolve(__dirname, 'dist', asset);
          if (existsSync(src)) {
            try {
              cpSync(src, dest, { recursive: true, force: true });
              console.log(`Copied ${asset} to dist`);
            } catch (err) {
              console.error(`Error copying ${asset}:`, err);
            }
          }
        });
        
        staticFiles.forEach(file => {
          const src = resolve(__dirname, file);
          const dest = resolve(__dirname, 'dist', file);
          if (existsSync(src)) {
            try {
              copyFileSync(src, dest);
              console.log(`Copied ${file} to dist`);
            } catch (err) {
              console.error(`Error copying ${file}:`, err);
            }
          }
        });
        
        // Copy redirect files if they exist
        const redirectFiles = ['_redirects', '.htaccess'];
        redirectFiles.forEach(file => {
          const src = resolve(__dirname, 'public', file);
          const dest = resolve(__dirname, 'dist', file);
          if (existsSync(src)) {
            try {
              copyFileSync(src, dest);
              console.log(`Copied ${file} to dist`);
            } catch (err) {
              console.error(`Error copying ${file}:`, err);
            }
          }
        });
        
        // Move HTML files from dist/src/ to dist/ and restructure for clean URLs
        const distDir = resolve(__dirname, 'dist');
        const srcDir = resolve(distDir, 'src');
        
        // Move index.html from dist/src/ to dist/
        const srcIndexPath = resolve(srcDir, 'index.html');
        const distIndexPath = resolve(distDir, 'index.html');
        if (existsSync(srcIndexPath)) {
          try {
            copyFileSync(srcIndexPath, distIndexPath);
            unlinkSync(srcIndexPath);
            console.log(`Moved index.html from dist/src/ to dist/`);
          } catch (err) {
            console.error(`Error moving index.html:`, err);
          }
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
              
              console.log(`Restructured ${file} -> ${dirName}/index.html`);
            } catch (err) {
              console.error(`Error restructuring ${file}:`, err);
            }
          }
        });
        
        // Remove empty src directory if it exists
        try {
          if (existsSync(srcDir)) {
            const remainingFiles = readdirSync(srcDir);
            if (remainingFiles.length === 0) {
              rmdirSync(srcDir);
              console.log(`Removed empty dist/src/ directory`);
            }
          }
        } catch (err) {
          // Ignore errors removing directory
        }
      }
    }
  ]
});

