# Vercel Deployment Guide

## Main App Deployment

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy Main App**:
   ```bash
   cd /Users/sujalpatel/Documents/karmaterra\ offical\ App/KARMATERRA-OFFICAL-2025-APP
   vercel
   ```
   - Follow the prompts to link your project
   - Set root directory as `.` (current directory)
   - The `vercel.json` is already configured

3. **Or deploy via Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - Set root directory to the project root
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

## Admin Panel Deployment

### Option 1: Separate Project (Recommended)

1. **Deploy Admin Panel as separate project**:
   ```bash
   cd admin-panel
   vercel
   ```
   - Follow the prompts
   - Set root directory as `admin-panel`
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

### Option 2: Monorepo with Subdirectory

If deploying from the same repository:

1. In Vercel Dashboard, create a new project
2. Set root directory to `admin-panel`
3. Framework preset: Vite
4. Build command: `npm run build`
5. Output directory: `dist`

## Environment Variables

Make sure to add all required environment variables in Vercel Dashboard:
- Go to Project Settings → Environment Variables
- Add variables for both production and preview environments

## Custom Domains

After deployment, you can add custom domains:
- Main app: Add domain in Vercel project settings
- Admin panel: Add domain in separate Vercel project settings



