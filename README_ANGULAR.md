# فندق الأرض المتميزة — نظام إدارة الحجاج (Angular + Node.js)

## Project Structure

```
d:\Dev\Haj\
├── Backend/               ← Node.js + Express API
│   ├── src/
│   │   ├── auth.js        ← Login, JWT, time-PIN validation
│   │   └── dataRouter.js  ← Protected /api/data endpoints
│   ├── data/
│   │   └── pilgrims.json  ← Pilgrim records (generated, gitignored)
│   ├── scripts/
│   │   ├── convert-data.js   ← data.js → pilgrims.json
│   │   └── hash-password.js  ← bcrypt password hasher
│   ├── .env               ← Credentials & secrets (gitignored)
│   ├── .env.example       ← Template for deployment
│   └── index.js           ← Entry point
│
└── haj-app/               ← Angular 17 frontend
    └── src/app/
        ├── core/
        │   ├── services/  ← auth.service, pilgrims.service
        │   ├── guards/    ← authGuard (route protection)
        │   └── interceptors/ ← JWT injection + 401 auto-logout
        └── features/
            ├── login/     ← Login page (exact original style)
            └── pilgrims/  ← Main data table
```

---

## Quick Start (Development)

### 1. Backend

```bash
cd Backend

# First time only: convert data
node scripts/convert-data.js

# Start dev server
npm run dev
# → http://localhost:3000
```

### 2. Angular Frontend

```bash
cd haj-app
npm install
npx ng serve
# → http://localhost:4200
```

---

## Login Credentials

| Field | Value |
|-------|-------|
| اسم المستخدم | `admin26` |
| كلمة المرور | `Admin@Haj26#` |
| رمز الوقت | الدقيقة الحالية من الساعة (مثال: 07 إذا الوقت 4:07) |

> رمز الوقت يقبل فارق ±2 دقيقة من الوقت الفعلي للخادم.

---

## Security Features

- **JWT Tokens** — 30-minute expiry, stored in sessionStorage only
- **Bcrypt passwords** — salted with cost factor 12
- **Time PIN** — current clock minute, validated server-side (±2 min tolerance)
- **Rate limiting** — max 10 login attempts per 15 minutes per IP
- **Helmet.js** — HTTP security headers (XSS, CSRF, clickjacking protection)
- **CORS** — restricted to Angular origin only
- **Route guard** — Angular `canActivate` blocks unauthenticated access
- **Auto-logout** — 30-minute inactivity timeout, resets on mouse/key activity
- **HTTP interceptor** — auto-attaches JWT; logs out on 401/403 response
- **Data on server only** — pilgrim records never bundled into frontend

---

## Changing Credentials

1. Generate new hash:
   ```bash
   cd Backend
   node scripts/hash-password.js YourNewPassword
   ```
2. Copy the output and update `.env`:
   ```
   APP_USERNAME=newusername
   APP_PASSWORD_HASH=$2b$12$...
   ```

---

## Production Deployment

### Backend (Node.js host like Railway, Render, VPS)

1. Set environment variables from `.env.example`
2. Upload `Backend/` (exclude `node_modules/` and `.env`)
3. Run `node scripts/convert-data.js` once to generate `data/pilgrims.json`
4. Start with `npm start`

### Frontend (Static host like Netlify, Vercel, or same VPS)

1. Update `src/environments/environment.prod.ts` with your backend URL:
   ```ts
   export const environment = {
     production: true,
     apiUrl: 'https://your-backend.com/api',
   };
   ```
2. Build:
   ```bash
   npx ng build --configuration=production
   ```
3. Deploy `dist/haj-app/browser/` to your static host

### Serve Angular from Node.js (single server)

Add to `Backend/index.js`:
```js
const path = require('path');
const distPath = path.join(__dirname, '../haj-app/dist/haj-app/browser');
app.use(express.static(distPath));
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
```
Then set `CORS_ORIGIN` to your domain and `apiUrl` to `/api`.

---

## Updating Pilgrim Data

When you have a new PDF:
1. Run the Python script: `python scripts/pdf_to_data.py`
2. Then: `cd Backend && node scripts/convert-data.js`
3. Restart the backend server
