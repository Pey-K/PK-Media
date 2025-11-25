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
        // Move data files to assets/data/ to avoid routing conflicts
        const staticAssets = ['assets', 'css'];
        const staticFiles = ['favicon.ico', 'apple-bookmark.png', 'manifest.json'];
        
        staticAssets.forEach(asset => {
          const src = resolve(__dirname, asset);
          const dest = resolve(__dirname, 'dist', asset);
          if (existsSync(src)) {
            try {
              cpSync(src, dest, { recursive: true, force: true });
              console.log(`✓ Copied ${asset} to dist`);
            } catch (err) {
              console.error(`✗ Error copying ${asset}:`, err);
            }
          }
        });
        
        // Copy data files to assets/data/ instead of dist/data/
        const dataSrc = resolve(__dirname, 'data');
        const dataDest = resolve(__dirname, 'dist', 'assets', 'data');
        if (existsSync(dataSrc)) {
          try {
            mkdirSync(dataDest, { recursive: true });
            cpSync(dataSrc, dataDest, { recursive: true, force: true });
            console.log(`✓ Copied data to dist/assets/data`);
          } catch (err) {
            console.error(`✗ Error copying data:`, err);
          }
        }
        
        staticFiles.forEach(file => {
          const src = resolve(__dirname, file);
          const dest = resolve(__dirname, 'dist', file);
          if (existsSync(src)) {
            try {
              copyFileSync(src, dest);
              console.log(`✓ Copied ${file} to dist`);
            } catch (err) {
              console.error(`✗ Error copying ${file}:`, err);
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
              console.log(`✓ Copied ${file} to dist`);
            } catch (err) {
              console.error(`✗ Error copying ${file}:`, err);
            }
          }
        });
        
        // Verify data files were copied
        const dataDir = resolve(__dirname, 'dist', 'data');
        if (existsSync(dataDir)) {
          const dataFiles = readdirSync(dataDir).filter(f => f.endsWith('.json'));
          console.log(`✓ Data files in dist/data/: ${dataFiles.join(', ')}`);
        } else {
          console.warn('⚠ dist/data/ directory not found!');
        }
      }
    }
  ]
});





