# Cloudflare Pages Setup Instructions

## Critical Configuration

Your site is currently serving source files instead of built files. Follow these steps:

### 1. Cloudflare Pages Dashboard Settings

Go to your Cloudflare Pages project settings and configure:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** 
  - If your GitHub repo root is `Plex.Final/`, leave this empty or set to `/`
  - If your GitHub repo root is the parent directory, set to `Plex.Final`

### 2. Node Version

Set Node.js version to **18** or higher in the build environment variables.

### 3. Verify Build

After deploying, check the build logs to ensure:
- `npm install` runs successfully
- `npm run build` completes without errors
- Files are generated in the `dist/` directory

### 4. Common Issues

**Problem:** Site loads but shows 404 for `/js/populate.js`
**Solution:** Cloudflare Pages is serving source files. Verify the "Build output directory" is set to `dist` (not `src` or empty).

**Problem:** Build fails
**Solution:** Check build logs. Common issues:
- Missing `package.json` or `node_modules`
- Node version too old (need 18+)
- Build command incorrect

**Problem:** Pages load but assets are 404
**Solution:** Ensure `dist/` contains the built files with correct paths. The build process should copy `assets/`, `css/`, and `data/` to `dist/`.

### 5. File Structure After Build

After a successful build, your `dist/` folder should contain:
```
dist/
├── index.html (built, with correct asset paths)
├── assets/
│   └── js/
│       ├── main.js
│       ├── populate--[hash].js
│       └── ...
├── css/
├── data/
└── [movies|tvshows|music]/
    └── index.html
```

### 6. Testing Locally

Before deploying, test the build locally:
```bash
cd Plex.Final
npm install
npm run build
npm run preview  # Test the built site
```

The preview should show the site working correctly with all assets loading.

