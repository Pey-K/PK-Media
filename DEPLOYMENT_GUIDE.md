# Complete Deployment Guide for GitHub + Cloudflare Pages

## Step 1: Prepare Your Repository

### 1.1 Initialize Git (if not already done)

```bash
cd Plex.Final
git init
```

### 1.2 Add All Files

```bash
# Make sure .gitignore is correct (it should exclude node_modules, dist, etc.)
git add .
git commit -m "Initial commit - PK Collection site"
```

### 1.3 Connect to GitHub

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/Pey-K/PK-Media.git

# Or if you prefer SSH:
# git remote add origin git@github.com:Pey-K/PK-Media.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Verify Your Project Structure

Your repository should have these files committed:
- ✅ `package.json`
- ✅ `vite.config.js`
- ✅ `src/` directory (all HTML and JS files)
- ✅ `css/` directory
- ✅ `data/` directory (JSON files)
- ✅ `assets/` directory (images)
- ✅ `public/_redirects` (for clean URLs)
- ✅ `.gitignore` (excludes `node_modules/`, `dist/`, etc.)

**DO NOT commit:**
- ❌ `node_modules/` (in .gitignore)
- ❌ `dist/` (in .gitignore - built by Cloudflare)

## Step 3: Configure Cloudflare Pages

### 3.1 Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create a project**
3. Select **Connect to Git**
4. Choose **GitHub** and authorize
5. Select repository: `Pey-K/PK-Media`
6. Click **Begin setup**

### 3.2 Build Configuration (CRITICAL)

In the build settings, configure:

```
Project name: PK-Media (or pkcollection)
Production branch: main

Build settings:
├─ Framework preset: None (or Vite if available)
├─ Build command: npm run build
├─ Build output directory: dist
└─ Root directory: (leave empty if Plex.Final is your repo root)
                  (or set to: Plex.Final if repo root is parent)
```

**⚠️ CRITICAL:** The "Build output directory" **MUST** be `dist` (not `src`, not empty)

### 3.3 Environment Variables

Add these in Cloudflare Pages → Settings → Environment variables:

```
NODE_VERSION = 18
```

Or in the build settings, set Node.js version to **18** or higher.

### 3.4 Custom Domain

1. Go to **Custom domains** in your Pages project
2. Add `pkcollection.net`
3. Follow DNS setup instructions if needed

## Step 4: Verify Build Process

After your first deployment, check the build logs:

1. Go to **Deployments** tab in Cloudflare Pages
2. Click on the latest deployment
3. Check **Build logs**

You should see:
```
✓ npm install
✓ npm run build
✓ Files generated in dist/
```

## Step 5: Test Your Deployment

After deployment completes:

1. Visit `https://pkcollection.net`
2. Open browser DevTools (F12) → Network tab
3. Verify:
   - ✅ JavaScript loads from `/assets/js/` (not `/src/js/`)
   - ✅ CSS loads from `/assets/` (hashed filenames)
   - ✅ Data files load from `/data/`
   - ✅ Images load from `/assets/images/`

## Step 6: Clean URLs Configuration

Your `_redirects` file in `public/` should be copied to `dist/` during build.

The vite.config.js plugin handles this automatically. Verify in build logs that `_redirects` is copied.

If clean URLs don't work, check:
- `dist/_redirects` exists after build
- Cloudflare Pages supports `_redirects` file format
- Routes are: `/movies`, `/tvshows`, `/music`

## Troubleshooting

### Issue: 404 for `/js/populate.js` or `/src/js/*`

**Problem:** Cloudflare is serving source files instead of built files

**Solution:**
1. Go to Cloudflare Pages → Settings → Builds & deployments
2. Verify "Build output directory" is set to `dist`
3. Save and trigger a new deployment
4. Check build logs to confirm `dist/` is generated

### Issue: Build fails

**Check:**
- Build logs for specific error
- `package.json` exists and has `build` script
- Node version is 18+ (set in environment variables)
- All source files are committed to GitHub

### Issue: Pages load but assets are 404

**Check:**
- Build logs show `dist/assets/` being created
- `vite.config.js` plugin is copying assets correctly
- Asset paths in built HTML are correct (`/assets/js/` not `/src/js/`)

### Issue: Clean URLs don't work

**Check:**
- `public/_redirects` exists and is committed
- Build logs show `_redirects` being copied to `dist/`
- Cloudflare Pages supports the redirect format

## Local Testing Before Deploy

Always test the build locally first:

```bash
cd Plex.Final
npm install
npm run build
npm run preview
```

Visit `http://localhost:4173` and verify:
- ✅ All pages load (`/`, `/movies`, `/tvshows`, `/music`)
- ✅ All assets load correctly
- ✅ No 404 errors in console

This should match exactly what Cloudflare Pages serves.

## Quick Reference

**GitHub Repository:** https://github.com/Pey-K/PK-Media  
**Cloudflare Pages:** https://dash.cloudflare.com/ → Pages  
**Live Site:** https://pkcollection.net

**Build Command:** `npm run build`  
**Output Directory:** `dist`  
**Node Version:** 18+


