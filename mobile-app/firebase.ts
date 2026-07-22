import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCez36I2XdAPglGbg45LyH7Sk_P0KuicYw",
  authDomain: "gen-lang-client-0044267372.firebaseapp.com",
  projectId: "gen-lang-client-0044267372",
  storageBucket: "gen-lang-client-0044267372.firebasestorage.app",
  messagingSenderId: "901953259613",
  appId: "1:901953259613:web:20bd329a83ce1b5ed065b4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
