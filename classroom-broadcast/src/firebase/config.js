// =============================================================
// Firebase Configuration
// =============================================================
// SETUP: Replace values below with your Firebase project config.
// Console: https://console.firebase.google.com
// Project Settings → General → Your Apps → Web App → Config
// =============================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDpHeTtWQw5c6BWGz5431EK4PtpS75n0Ic",
  authDomain: "educast-demo.firebaseapp.com",
  projectId: "educast-demo",
  storageBucket: "educast-demo.firebasestorage.app",
  messagingSenderId: "983698755208",
  appId: "1:983698755208:web:9fc7ad3e9894ed0ca4d93d",
  measurementId: "G-LZQSR2V90V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
