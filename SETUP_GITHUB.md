# Quick Setup: GitHub + Cloudflare Pages

## Prerequisites

- Git installed on your computer
- GitHub account (you already have: https://github.com/Pey-K/PK-Media)
- Cloudflare account with Pages access

## Step 1: Initialize Git Repository (if not done)

Open PowerShell in the `Plex.Final` directory and run:

```powershell
# Check if git is already initialized
git status

# If not initialized, run:
git init
git add .
git commit -m "Initial commit - PK Collection site"
```

## Step 2: Connect to GitHub

```powershell
# Add your GitHub repository
git remote add origin https://github.com/Pey-K/PK-Media.git

# If remote already exists, update it:
# git remote set-url origin https://github.com/Pey-K/PK-Media.git

# Push to GitHub
git branch -M main
git push -u origin main
```

If you get authentication errors, you may need to:
- Use a Personal Access Token instead of password
- Or set up SSH keys

## Step 3: Configure Cloudflare Pages

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com/
   - Navigate to: **Pages** → **Create a project**

2. **Connect Your Repository**
   - Click **Connect to Git**
   - Select **GitHub** and authorize Cloudflare
   - Choose repository: `Pey-K/PK-Media`
   - Click **Begin setup**

3. **Build Settings** (CRITICAL - Get these right!)

   ```
   Project name: PK-Media
   Production branch: main
   
   Build settings:
   ├─ Framework preset: None (or Vite)
   ├─ Build command: npm run build
   ├─ Build output directory: dist  ⚠️ MUST BE "dist"
   └─ Root directory: (leave EMPTY if Plex.Final is your repo root)
                     (or set to: Plex.Final if repo root is parent)
   ```

4. **Environment Variables**
   - Go to: Settings → Environment variables
   - Add: `NODE_VERSION` = `18` (or higher)

5. **Save and Deploy**
   - Click **Save and Deploy**
   - Wait for build to complete (check build logs)

## Step 4: Verify Deployment

After deployment:

1. **Check Build Logs**
   - Should see: `npm install` ✓
   - Should see: `npm run build` ✓
   - Should see: Files in `dist/` ✓

2. **Test Your Site**
   - Visit: `https://pkcollection.net` (or your Cloudflare Pages URL)
   - Open DevTools (F12) → Network tab
   - Verify:
     - ✅ JavaScript loads from `/assets/js/` (NOT `/src/js/`)
     - ✅ CSS loads from `/assets/`
     - ✅ No 404 errors

## Step 5: Custom Domain (if not already set)

1. In Cloudflare Pages → Your project → **Custom domains**
2. Add `pkcollection.net`
3. Follow DNS instructions if needed

## Troubleshooting

### "404 for /js/populate.js"
**Fix:** Set "Build output directory" to `dist` in Cloudflare Pages settings

### Build fails
**Check:**
- Build logs for specific error
- Node version is 18+ (set in environment variables)
- All files are committed to GitHub

### Assets don't load
**Check:**
- Build logs show `dist/assets/` being created
- Asset paths in built HTML are `/assets/js/` (not `/src/js/`)

## Future Updates

After making changes locally:

```powershell
git add .
git commit -m "Your commit message"
git push origin main
```

Cloudflare Pages will automatically rebuild and deploy!

## Quick Test Locally

Before pushing, test the build:

```powershell
npm run build
npm run preview
```

Visit `http://localhost:4173` - this should match what Cloudflare serves.


