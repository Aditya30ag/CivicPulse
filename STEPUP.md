<div align="center">
  <h1>⚙️ STEPUP.md</h1>
  <p><strong>Local Development Setup — Civic Pulse</strong></p>
  <p>Agentic AI-powered civic issue reporting platform</p>
</div>

---

## 📋 Table of Contents
- [Prerequisites](#-prerequisites)
- [Cloning & Installation](#-cloning--installation)
- [Environment Variables Setup](#-environment-variables-setup)
- [Running the Project](#-running-the-project)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Additional Tips](#-additional-tips)

---

## 🎯 Prerequisites

Before starting, ensure you have the following:

- **Node.js** — Version **18.x or higher** (Recommended: 20.x LTS)
- **npm** — Comes bundled with Node.js
- **Git** — Latest version
- **Modern Browser** — Chrome or Firefox (for Geolocation and Leaflet map)
- **Accounts & API Keys**:
  - [Firebase Console](https://console.firebase.google.com)
  - [Google AI Studio](https://aistudio.google.com) (Gemini)
  - [Cloudinary Dashboard](https://cloudinary.com)

---

## 📥 Cloning & Installation


### 1️⃣ Clone the repository

```bash
git clone https://github.com/Aditya30ag/CivicPulse.git
```
```bash
cd CivicPulse
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Verify installation
```bash
npm run lint
```

This will install all required packages including React 19, Tailwind v4, Leaflet, Firebase SDK, and `@google/genai`.

---

## 🔑 Environment Variables Setup


### Copy the template
```bash
cp .env.example .env
```

### Detailed Configuration:

#### 1️⃣ Firebase (Authentication + Firestore)
1. Go to [Firebase Console](https://console.firebase.google.com) → Create a new project
2. Enable **Firestore Database** (Start in test mode initially)
3. Enable **Authentication** → Google Sign-In provider
4. Go to Project Settings → General → Your apps → Web App
5. Copy the config values

```env
VITE_FIREBASE_API_KEY=AIzaSy...

VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com

VITE_FIREBASE_PROJECT_ID=your-project-id

VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com

VITE_FIREBASE_MESSAGING_SENDER_ID=123456789

VITE_FIREBASE_APP_ID=1:123456789:web:abc123...
```

#### 2️⃣ Gemini AI (Core Intelligence)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it here:

```env
VITE_GEMINI_API_KEY=AIzaSy...
```

#### 3️⃣ Cloudinary (Image & Video Upload)
1. Create account at [Cloudinary](https://cloudinary.com)
2. Go to Dashboard → Copy **Cloud Name**
3. Go to Settings → Upload Presets → Create new (Unsigned)
4. Copy the preset name

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name

VITE_CLOUDINARY_UPLOAD_PRESET=ml_default
```

---

### ▶️ Running the Project

```bash
npm run dev
```

The app will start at **`http://localhost:3000`**

**Available Scripts:**
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run preview` — Preview production build
- `npm run lint` — TypeScript check

---

## 🗂️ Project Structure

```text
CivicPulse/
├── src/
│   ├── pages/           # Main pages (Login, Report, Home, Admin, Profile, etc.)
│   ├── components/      # Reusable UI (Layout, ProtectedRoute)
│   ├── contexts/        # AuthContext
│   ├── lib/
│   │   └── gemini.ts    # Perception, Deduplication, Forecasting agents
│   ├── firebase.ts      # Firebase initialization
│   └── App.tsx          # React Router setup
├── public/
├── .env.example
├── vite.config.ts
└── package.json
```

---

## 🛠️ Troubleshooting

| Issue | Possible Cause | Solution |
|------|----------------|----------|
| **Firebase Auth fails** | Google provider not enabled | Firebase Console → Authentication → Sign-in method → Enable Google |
| **AI features not working** | Missing Gemini key | Check `VITE_GEMINI_API_KEY` and console for errors |
| **Upload fails** | Cloudinary misconfigured | Ensure upload preset is **unsigned** and active |
| **Map not loading** | Leaflet CSS missing | Confirm `import 'leaflet/dist/leaflet.css'` in `main.tsx` |
| **CORS / Location issues** | Browser restrictions | Allow location + run on `localhost` |
| **Styling broken** | Tailwind not processing | Restart dev server (`Ctrl+C` then `npm run dev`) |
| **TypeScript errors** | Cache issue | Run `npm run lint` or delete `node_modules` + reinstall |

**Pro Tip**: Always keep the browser DevTools (F12) open while developing.

---

**You're now fully set up!** 🎉

You can start reporting issues, testing AI deduplication, community verification, and admin forecasting features locally.

---

**Made with care for clean, maintainable civic tech.**
