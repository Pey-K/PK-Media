import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, cpSync, mkdirSync, unlinkSync, readdirSync, rmdirSync } from 'fs';

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
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/src/index.html';
          }
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
        const redirectFiles = ['_redirects', '.htaccess'];
        redirectFiles.forEach(file => {
          let src = resolve(__dirname, 'public', file);
          if (!existsSync(src)) {
            src = resolve(__dirname, file);
          }
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
      },
      writeBundle() {
        const distDir = resolve(__dirname, 'dist');
        const assetsSrc = resolve(__dirname, 'assets');
        const assetsDest = resolve(distDir, 'assets');
        if (existsSync(assetsSrc) && (!existsSync(assetsDest) || !existsSync(resolve(assetsDest, 'images')))) {
          try {
            cpSync(assetsSrc, assetsDest, { recursive: true, force: true });
            console.log('Copied assets (including images) to dist (in writeBundle)');
          } catch (err) {
            console.error('Error copying assets in writeBundle:', err);
          }
        }
        const dataSrc = resolve(__dirname, 'data');
        const dataDest = resolve(distDir, 'data');
        if (existsSync(dataSrc) && (!existsSync(dataDest) || readdirSync(dataDest).length === 0)) {
          try {
            cpSync(dataSrc, dataDest, { recursive: true, force: true });
            console.log('Copied data to dist (in writeBundle)');
          } catch (err) {
            console.error('Error copying data in writeBundle:', err);
          }
        }
        const srcIndexPath = resolve(distDir, 'src', 'index.html');
        const distIndexPath = resolve(distDir, 'index.html');
        if (existsSync(srcIndexPath)) {
          try {
            copyFileSync(srcIndexPath, distIndexPath);
            unlinkSync(srcIndexPath);
            console.log('Moved index.html to dist root');
          } catch (err) {
            console.error('Error moving index.html:', err);
          }
        }
        const srcDir = resolve(distDir, 'src');
        const htmlFiles = ['movies.html', 'tvshows.html', 'music.html'];
        htmlFiles.forEach(file => {
          const htmlPath = resolve(srcDir, file);
          if (existsSync(htmlPath)) {
            try {
              const dirName = file.replace('.html', '');
              const dirPath = resolve(distDir, dirName);
              const indexPath = resolve(dirPath, 'index.html');
              mkdirSync(dirPath, { recursive: true });
              copyFileSync(htmlPath, indexPath);
              unlinkSync(htmlPath);
              console.log(`Restructured ${file} -> ${dirName}/index.html`);
            } catch (err) {
              console.error(`Error restructuring ${file}:`, err);
            }
          }
        });
        try {
          const srcDirCheck = resolve(distDir, 'src');
          if (existsSync(srcDirCheck)) {
            const remainingFiles = readdirSync(srcDirCheck);
            if (remainingFiles.length === 0) {
              rmdirSync(srcDirCheck);
              console.log('Removed empty src directory');
            }
          }
        } catch (err) {
        }
      }
    }
  ]
});