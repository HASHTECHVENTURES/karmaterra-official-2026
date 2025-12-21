# Google Analytics Setup Guide

## Step 1: Get Your Google Analytics Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account
3. Click **"Admin"** (gear icon) in the bottom left
4. In the **Property** column, click **"Create Property"** (if you don't have one)
   - Enter property name: "KarmaTerra"
   - Select timezone and currency
   - Click **"Next"**
   - Fill in business information
   - Click **"Create"**
5. After creating, you'll see **"Data Streams"** → Click **"Add stream"** → Select **"Web"**
6. Enter your website URL: `https://www.karmaterra.in`
7. Enter stream name: "KarmaTerra Website"
8. Click **"Create stream"**
9. You'll see your **Measurement ID** (format: `G-XXXXXXXXXX`)
10. **Copy this Measurement ID** - you'll need it in the next step

## Step 2: Add Measurement ID to Environment Variables

1. Open the `.env` file in the root of your project
2. Add this line (replace `G-XXXXXXXXXX` with your actual Measurement ID):
   ```
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
3. Save the file

## Step 3: Enable Analytics in the Code

The analytics code is already implemented but currently disabled. Follow these steps:

### 3.1: Enable Analytics Initialization in App.tsx

1. Open `src/App.tsx`
2. Find line 16 (currently commented):
   ```typescript
   // import { initAnalytics, trackPageView } from "@/lib/analytics"; // Disabled for now
   ```
3. Uncomment it:
   ```typescript
   import { initAnalytics, trackPageView } from "@/lib/analytics";
   ```

### 3.2: Initialize Analytics on App Start

1. In `src/App.tsx`, find the `useEffect` hook that runs on mount (around line 145)
2. Add this code inside the `useEffect`:
   ```typescript
   // Initialize Google Analytics
   initAnalytics();
   ```

### 3.3: Enable Page Tracking

1. Open `src/components/PageTracker.tsx`
2. Find line 3 (currently commented):
   ```typescript
   // import { trackPageView } from '@/lib/analytics'; // Disabled for now
   ```
3. Uncomment it:
   ```typescript
   import { trackPageView } from '@/lib/analytics';
   ```
4. Find lines 15-16 (currently commented):
   ```typescript
   // Track page view for analytics - Disabled for now
   // trackPageView(location.pathname);
   ```
5. Uncomment them:
   ```typescript
   // Track page view for analytics
   trackPageView(location.pathname);
   ```

## Step 4: Restart Your Development Server

1. Stop your current dev server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```
   or
   ```bash
   yarn dev
   ```

## Step 5: Verify It's Working

1. Open your website in a browser
2. Open **Developer Tools** (F12 or Right-click → Inspect)
3. Go to the **Network** tab
4. Filter by "gtag" or "analytics"
5. You should see requests to `google-analytics.com` or `googletagmanager.com`
6. Alternatively, go to **Console** tab - you should NOT see "Analytics disabled" message
7. In Google Analytics dashboard, go to **Reports** → **Realtime** - you should see your visit within a few seconds

## Step 6: Test Event Tracking (Optional)

You can track custom events anywhere in your code:

```typescript
import { trackEvent } from '@/lib/analytics';

// Example: Track button click
trackEvent('click', 'button', 'signup_button', 1);

// Example: Track form submission
trackEvent('submit', 'form', 'contact_form', 1);
```

## Troubleshooting

### Analytics not working?
- Check that `VITE_GA_MEASUREMENT_ID` is set in `.env` file
- Make sure you restarted the dev server after adding the env variable
- Check browser console for errors
- Verify the Measurement ID format is correct (starts with `G-`)
- In development mode, analytics is disabled by default - it only works in production builds

### Analytics works in dev but not production?
- Make sure `.env` file is included in your build process
- For Vite, environment variables starting with `VITE_` are automatically included
- Check your hosting platform's environment variable settings

### Want to test in development?
- Edit `src/lib/analytics.ts` line 14
- Change `import.meta.env.DEV` to `false` temporarily
- Remember to change it back before deploying!


