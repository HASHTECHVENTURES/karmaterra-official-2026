# Debug Google Analytics - Step by Step

## 🔍 Step 1: Verify Environment Variable in Vercel

1. Go to: https://vercel.com/dashboard
2. Click your project: **karmaterra-official-2026**
3. Go to: **Settings** → **Environment Variables**
4. Check if `VITE_GA_MEASUREMENT_ID` exists
5. Value should be: `G-2S4KF81CQC`
6. Make sure it's set for **Production** environment

**If missing or wrong:**
- Click "Add" or "Edit"
- Key: `VITE_GA_MEASUREMENT_ID`
- Value: `G-2S4KF81CQC`
- Environment: Select **Production** (and Preview/Development if needed)
- Click "Save"
- **Redeploy** your project

---

## 🔍 Step 2: Check if Analytics is Loading on Your Site

1. Visit: `https://karmaterra-official-2026.vercel.app`
2. Open **Developer Tools** (Press F12)
3. Go to **Console** tab
4. Look for any errors (red text)
5. Type this in console and press Enter:
   ```javascript
   window.gtag
   ```
6. **If you see**: `function(...)` = ✅ Analytics is loaded!
7. **If you see**: `undefined` = ❌ Analytics is NOT loaded

---

## 🔍 Step 3: Check Network Requests

1. Visit: `https://karmaterra-official-2026.vercel.app`
2. Open **Developer Tools** (F12)
3. Go to **Network** tab
4. **Reload the page** (Cmd+R or Ctrl+R)
5. In the filter box, type: `gtag`
6. **You should see**:
   - `gtag/js?id=G-2S4KF81CQC` (Status: 200)
   - Requests to `google-analytics.com`
7. **If you see these** = ✅ Analytics is working!
8. **If you DON'T see these** = ❌ Analytics is not loading

---

## 🔍 Step 4: Verify in Google Analytics

1. Go to: https://analytics.google.com/
2. Make sure you're in the **correct property**: `karmaterra-auth`
3. Click: **Reports** → **Realtime overview** (NOT "Reports snapshot")
4. **Keep this tab open**
5. Open a **NEW tab** (or incognito window)
6. Visit: `https://karmaterra-official-2026.vercel.app`
7. Browse 2-3 pages
8. **Wait 20-30 seconds**
9. Go back to Google Analytics tab
10. **You should see**: "1 user in last 30 minutes"

---

## 🔍 Step 5: Check Which Report You're Looking At

**Important:** Make sure you're looking at **Realtime**, not regular reports!

- ✅ **Realtime overview** = Shows data in 10-20 seconds
- ❌ **Reports snapshot** = Takes 24-48 hours to show data
- ❌ **User reports** = Takes 24-48 hours to show data

**To see live data:**
- Google Analytics → **Reports** → **Realtime overview**

---

## 🐛 Common Issues

### Issue 1: Environment Variable Not Set
**Solution:** Add `VITE_GA_MEASUREMENT_ID=G-2S4KF81CQC` in Vercel and redeploy

### Issue 2: Looking at Wrong Report
**Solution:** Use **Realtime overview**, not regular reports

### Issue 3: Analytics Not Loading
**Solution:** Check browser console for errors, check Network tab for gtag requests

### Issue 4: Wrong Property
**Solution:** Make sure you're in `karmaterra-auth` property, not Firebase

### Issue 5: Ad Blocker
**Solution:** Disable ad blockers or try incognito mode

---

## ✅ Quick Test Checklist

- [ ] Environment variable set in Vercel: `VITE_GA_MEASUREMENT_ID=G-2S4KF81CQC`
- [ ] Vercel deployment completed after setting env var
- [ ] Visiting: `https://karmaterra-official-2026.vercel.app` (NOT localhost)
- [ ] Browser console shows `window.gtag` is a function
- [ ] Network tab shows `gtag/js?id=G-2S4KF81CQC` request
- [ ] Looking at **Realtime overview** in Google Analytics
- [ ] Waited 20-30 seconds after visiting site
- [ ] Tried in incognito/private window (to avoid ad blockers)

---

## 🆘 Still Not Working?

If you've checked everything above and still don't see data:

1. **Check Vercel deployment logs:**
   - Vercel Dashboard → Your Project → Deployments
   - Click on latest deployment
   - Check "Build Logs" for any errors

2. **Check browser console:**
   - F12 → Console tab
   - Look for red errors
   - Share any errors you see

3. **Verify Measurement ID:**
   - Google Analytics → Admin → Data Streams
   - Click on "KarmaTerra Website" web stream
   - Verify Measurement ID is: `G-2S4KF81CQC`






