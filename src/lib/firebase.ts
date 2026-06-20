import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAI, GoogleAIBackend } from 'firebase/ai';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "simple-tool-visualisation",
  appId: "1:664427860688:web:68289fd31577dd7c4c84d5",
  storageBucket: "simple-tool-visualisation.firebasestorage.app",
  apiKey: "AIzaSyDVICiYQIMNePK_Px20b_U8i04S_qiJuaE",
  authDomain: "simple-tool-visualisation.firebaseapp.com",
  messagingSenderId: "664427860688",
  measurementId: "G-5CGFZV4QML",
};

// Prevent duplicate Firebase app initialisation in Next.js dev (HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Firebase AI Logic — Gemini Developer API (free tier)
export const ai = getAI(app, { backend: new GoogleAIBackend() });

export default app;
