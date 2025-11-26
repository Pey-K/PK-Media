# 🚀 Deploy Now - Step by Step

Your site is ready! Follow these steps:

## Step 1: Push to GitHub

Open PowerShell in the `Plex.Final` directory and run:

```powershell
# Check if git is initialized
git status

# If not initialized, run:
git init
git add .
git commit -m "Ready for deployment - PK Collection site"

# Connect to GitHub (if not already connected)
git remote add origin https://github.com/Pey-K/PK-Media.git
# OR if remote exists, update it:
# git remote set-url origin https://github.com/Pey-K/PK-Media.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**If you get authentication errors:**
- You may need a GitHub Personal Access Token
- Go to: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Use the token as your password when pushing

## Step 2: Configure Cloudflare Pages

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
   Project name: PK-Media (or pkcollection)
   Production branch: main
   
   Build settings:
   ├─ Framework preset: None (or Vite if available)
   ├─ Build command: npm run build
   ├─ Build output directory: dist  ⚠️ MUST BE "dist" (not "src" or empty)
   └─ Root directory: (leave EMPTY)
   ```

4. **Environment Variables**
   - Go to: Settings → Environment variables
   - Add: `NODE_VERSION` = `18` (or higher)
   - Or set Node.js version to **18** in build settings

5. **Save and Deploy**
   - Click **Save and Deploy**
   - Wait for build to complete (~2-3 minutes)
   - Check build logs to verify success

## Step 3: Custom Domain (if needed)

1. In Cloudflare Pages → Your project → **Custom domains**
2. Add `pkcollection.net`
3. Follow DNS setup instructions if needed

## Step 4: Verify Deployment

After deployment completes:

1. **Check Build Logs**
   - Should see: `npm install` ✓
   - Should see: `npm run build` ✓
   - Should see: Files in `dist/` ✓

2. **Test Your Site**
   - Visit: `https://pkcollection.net` (or your Cloudflare Pages URL)
   - Open DevTools (F12) → Network tab
   - Verify:
     - ✅ Homepage loads with totals
     - ✅ `/movies`, `/tvshows`, `/music` pages load
     - ✅ Images load (check Network tab for `/assets/images/`)
     - ✅ No 404 errors in console
     - ✅ JavaScript loads from `/assets/js/`

## Troubleshooting

### Build fails
- Check build logs for specific error
- Verify Node version is 18+ (set in environment variables)
- Ensure all files are committed to GitHub

### 404 errors
- Verify "Build output directory" is set to `dist` (not `src`)
- Check that `dist/` folder structure matches expected output
- Verify `_redirects` file is in `dist/`

### Images don't load
- Check build logs show `Copied assets (including images) to dist`
- Verify `dist/assets/images/` exists after build
- Check Network tab for image request URLs

### Pages don't load
- Verify `dist/index.html` and `dist/movies/index.html` exist
- Check that `_redirects` file is copied to `dist/`
- Cloudflare Pages should handle clean URLs automatically

## Future Updates

After making changes:

```powershell
git add .
git commit -m "Your commit message"
git push origin main
```

Cloudflare Pages will automatically rebuild and deploy!

