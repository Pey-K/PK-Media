# 🚀 Quick Start: Deploy to GitHub + Cloudflare Pages

## What You Need to Do

### 1️⃣ Push to GitHub (5 minutes)

```powershell
cd Plex.Final

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Connect to GitHub
git remote add origin https://github.com/Pey-K/PK-Media.git
git branch -M main
git push -u origin main
```

**Note:** If you get authentication errors, you may need a GitHub Personal Access Token.

### 2️⃣ Configure Cloudflare Pages (5 minutes)

1. Go to: https://dash.cloudflare.com/ → **Pages** → **Create a project**
2. Click **Connect to Git** → Select **GitHub** → Choose `Pey-K/PK-Media`
3. **CRITICAL SETTINGS:**
   ```
   Build command: npm run build
   Build output directory: dist  ⚠️ MUST BE "dist"
   Root directory: (leave empty)
   ```
4. Set Node version to **18** (in Environment variables)
5. Click **Save and Deploy**

### 3️⃣ Wait for Build

- Check build logs in Cloudflare Pages
- Should see: `npm install` ✓ and `npm run build` ✓
- Build takes ~2-3 minutes

### 4️⃣ Test Your Site

Visit your Cloudflare Pages URL or `pkcollection.net`

**Verify:**
- ✅ Pages load (`/`, `/movies`, `/tvshows`, `/music`)
- ✅ No 404 errors in browser console
- ✅ JavaScript loads from `/assets/js/` (check Network tab)

## Common Issues

| Problem | Solution |
|---------|----------|
| 404 for `/js/populate.js` | Set "Build output directory" to `dist` in Cloudflare |
| Build fails | Check Node version is 18+, check build logs |
| Assets don't load | Verify `dist/assets/` exists in build logs |

## Need More Help?

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## Test Locally First

```powershell
npm run build
npm run preview
```

Visit `http://localhost:4173` - should match production!


