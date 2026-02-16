# PVTAIR FRAT — Flight Risk Assessment Tool
## 14 CFR Part 5 SMS Compliance Tool

---

## What This Is

A web-based Flight Risk Assessment Tool (FRAT) for PVTAIR Part 135 operations. Pilots access it from any device (phone, iPad, computer) to assess flight risk before departure. Scores are calculated automatically based on weighted risk factors across five categories: Weather, Pilot/Crew, Aircraft, Environment, and Operational.

- **Open access**: Any pilot can submit a FRAT without logging in
- **Password-protected**: History, Dashboard, and Reports require admin password
- **PWA**: Pilots can "install" it to their phone home screen for app-like access
- **Exportable**: CSV and summary reports for §5.97 recordkeeping

---

## How to Deploy (5 minutes)

### Option A: Vercel (Recommended — Free)

1. Go to https://vercel.com and sign up with your GitHub account
2. Push this folder to a new GitHub repository:
   ```
   cd pvtair-frat
   git init
   git add .
   git commit -m "Initial FRAT deployment"
   git remote add origin https://github.com/YOUR-USERNAME/pvtair-frat.git
   git push -u origin main
   ```
3. In Vercel, click "New Project" → Import your GitHub repo
4. Click "Deploy" — that's it
5. Vercel gives you a URL like `pvtair-frat.vercel.app`
6. (Optional) Add a custom domain like `frat.pvtair.com`

### Option B: Netlify (Also Free)

1. Go to https://netlify.com and sign up
2. Same GitHub steps as above
3. Click "Add new site" → Import from Git → Select your repo
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Click Deploy

---

## Configuration

### Change the Admin Password

Open `pages/index.js` and find this line near the top:

```javascript
const ADMIN_PASSWORD = "pvtair2026"; // CHANGE THIS before deploying
```

Change `"pvtair2026"` to whatever password you want. This protects the History, Dashboard, and Reports tabs.

### Change Company Name

```javascript
const COMPANY_NAME = "PVTAIR";
```

### Adjust Risk Factors or Scores

All risk factors and their point values are defined in the `RISK_CATEGORIES` array in `pages/index.js`. You can add, remove, or adjust scoring weights.

### Adjust Risk Thresholds

The `RISK_LEVELS` object defines the score ranges:
- LOW: 0–15
- MODERATE: 16–30
- HIGH: 31–45
- CRITICAL: 46+

---

## How Pilots Use It

1. Open the URL on their phone or iPad
2. (First time) Tap "Add to Home Screen" for app-like access
3. Fill in flight info: name, aircraft, departure, destination
4. Check any applicable risk factors
5. Review the score and risk level
6. Tap SUBMIT FRAT
7. Get confirmation with risk level and required action

### Risk Level Actions
- **LOW (0–15)**: Flight authorized, standard procedures
- **MODERATE (16–30)**: Enhanced awareness, brief crew on elevated factors
- **HIGH (31–45)**: Requires management approval before departure
- **CRITICAL (46+)**: Flight should not depart without mitigation and executive approval

---

## Data Storage

Currently uses browser localStorage — each device stores its own data. This means:
- Data persists on the same device/browser
- Different pilots on different devices have separate data
- Admin can see all data submitted from the device they're viewing

**For a shared database** (all pilots' FRATs visible in one dashboard), you'd need to add a backend database. This can be done later as a Phase 2 enhancement.

---

## SMS Compliance Notes

This tool supports several Part 5 requirements:
- **§5.51–5.55 (SRM)**: Structured risk assessment before operations
- **§5.71 (Safety Performance Monitoring)**: Trend data from FRAT submissions
- **§5.91 (Training)**: Standardizes risk assessment competencies
- **§5.97 (Records)**: Exportable CSV reports for recordkeeping

---

## Technical Details

- Built with Next.js 14 + React 18
- Charts: Recharts
- PWA-capable with manifest.json
- Mobile-responsive design
- No external database required for basic operation
- Zero recurring costs on Vercel/Netlify free tier
