
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCa1niuXtMH2XO_E7mh-3vClEipYkYQc7E",
  authDomain: "al-msna.firebaseapp.com",
  databaseURL: "https://al-msna-default-rtdb.firebaseio.com",
  projectId: "al-msna",
  storageBucket: "al-msna.firebasestorage.app",
  messagingSenderId: "617511209609",
  appId: "1:617511209609:web:ef499e8e2573a2b6799458",
  measurementId: "G-167XMJKMF1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
