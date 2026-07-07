<div align="center">
  <h1>STEPUP.md</h1>
  <p>Agentic AI-powered civic issue reporting platform</p>
</div>

## 🎯 Prerequisites

Before starting, ensure you have the following:

- **Node.js** - Version **18.x or higher** (Recommended: 20.x LTS)
- **npm** - Comes bundled with Node.js
- **Git** - Latest version
- **Modern Browser** - Chrome or Firefox (for Geolocation and Leaflet map)
- **Accounts & API Keys**:
  - [Firebase Console](https://console.firebase.google.com)
  - [Google AI Studio](https://aistudio.google.com) (Gemini)
  - [Cloudinary Dashboard](https://cloudinary.com)
   
**Note:** Firebase configuration is used by the frontend, while Gemini and Cloudinary credentials are securely stored on the backend server.

---

## 📥 Cloning & Installation


### 1️ Clone the repository

```bash
git clone https://github.com/Aditya30ag/CivicPulse.git
```
```bash
cd CivicPulse
```

### 2. Install dependencies

Install frontend dependencies:
```bash
npm install
```

Install backend dependencies:

```bash
cd server
npm install
```

### 3. Verify installation

```bash
npm run lint
```

This will install all required packages including React 19, Tailwind v4, Leaflet, Firebase SDK, and `@google/genai`.

---

## 🔑 Environment Variables Setup

### Frontend Environment

Copy the frontend template:

```bash
cp .env.example .env
```

#### 1️⃣ Firebase (Authentication + Firestore)
1. Go to [Firebase Console](https://console.firebase.google.com) → Create a new project
2. Enable **Firestore Database** (Start in test mode initially)
3. Enable **Authentication** → Google Sign-In provider
4. Go to Project Settings → General → Your apps → Web App
5. Copy the config values

Configure Firebase:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123...
```

---

## Backend Environment

Navigate to the server folder and create a `.env` file.

```bash
cd server
cp .env.example .env
```

#### 2️⃣ Gemini AI (Core Intelligence)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it here:

Configure Gemini:

```env
GEMINI_API_KEY=your_gemini_api_key
```

#### 3️⃣ Cloudinary (Image & Video Upload)
1. Create account at [Cloudinary](https://cloudinary.com)
2. Go to Dashboard → Copy **Cloud Name**
3. Create a new API key → Copy **API key** and **API secret**
4. Add it here:

Configure Cloudinary:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> These credentials remain on the server and are never exposed to the browser.

---

## 🔥 Firestore Setup

After creating your Firebase project:

### 1. Create Firestore Database

- Open **Firebase Console**
- Select your project
- Navigate to **Firestore Database**
- Click **Create database**
- Start in **Test mode** for local development

### 2. Enable Google Authentication

- Go to **Authentication → Sign-in method**
- Enable the **Google** provider

### 3. Firestore Collections

The application uses the following collections:

- `reports` – Stores civic issue reports.
- `users` – Stores authenticated user profiles and leaderboard data.
- `wards` – Stores ward-level prediction and analytics data.

> Documents are created automatically by the application as data is added.

#### Firestore Indexes

The current implementation primarily relies on Firestore's automatically created single-field indexes.

At the time of writing, no manual composite indexes are required for the existing Firestore queries.

If Firestore displays an index creation prompt while testing new features, simply follow the generated Firebase Console link and create the suggested composite index.


---

### ▶️ Running the Project

#### Start the backend

```bash
cd server
npm run dev
```

The backend will run at:

```
http://localhost:5000
```

#### Start the frontend

Open another terminal:

```bash
npm run dev
```

The frontend will run at:

```
http://localhost:3000
```

The frontend communicates with the backend proxy for AI requests and image uploads.

---

**Available Scripts:**

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - TypeScript check


#### Backend

```bash
cd server
npm run dev
```
Starts the Express development server.

---

### 🔒 Security

Sensitive credentials such as the Gemini API key and Cloudinary API credentials are stored only on the backend server.

The frontend communicates with secure backend API endpoints instead of accessing these services directly.

---

## 🛠️ Troubleshooting

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| **Firebase Auth fails** | Google provider not enabled | Firebase Console → Authentication → Sign-in method → Enable Google |
| **AI features not working** | Backend not running or `GEMINI_API_KEY` missing | Verify `server/.env` and restart the backend |
| **Image upload fails** | Cloudinary credentials incorrect | Verify Cloudinary credentials in `server/.env` |
| **Map not loading** | Leaflet CSS missing | Confirm `import 'leaflet/dist/leaflet.css'` exists in `main.tsx` |
| **CORS issues** | Backend URL incorrect or backend offline | Ensure the Express server is running |
| **Location issues** | Browser restrictions | Allow location + run on `localhost` |
| **Styling broken** | Tailwind not processing | Restart dev server (`Ctrl+C` then `npm run dev`) |
| **TypeScript errors** | Cache issue | Run `npm run lint` or delete `node_modules` + reinstall |

**Pro Tip**: Always keep the browser DevTools (F12) open while developing.

---

**You're now fully set up!** 🎉

You can now start reporting civic issues, testing AI-powered analysis, image uploads, community verification, and admin forecasting features locally.

---

**Made with care for clean, maintainable civic tech.**