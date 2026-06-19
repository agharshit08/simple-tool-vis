import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAI, getTemplateGenerativeModel } from 'firebase/ai';

const firebaseConfig = {
  apiKey: "AIzaSyDVICiYQIMNePK_Px20b_U8i04S_qiJuaE",
  authDomain: "simple-tool-visualisation.firebaseapp.com",
  projectId: "simple-tool-visualisation",
  storageBucket: "simple-tool-visualisation.firebasestorage.app",
  messagingSenderId: "664427860688",
  appId: "1:664427860688:web:68289fd31577dd7c4c84d5",
  measurementId: "G-5CGFZV4QML"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Ensure AI is initialized correctly
const vertexAI = getAI(app);

export { app, vertexAI, getTemplateGenerativeModel };
