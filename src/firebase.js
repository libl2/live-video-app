import { initializeApp } from 'firebase/app';
<<<<<<< HEAD
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // ייבוא Firestore
=======
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';  // Firestore
>>>>>>> 4eeee05fb1167de4337429c6d46e198f4f62768b

// פרטי Firebase שלך
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// אתחול Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
<<<<<<< HEAD
const db = getFirestore(app); // אתחול Firestore

export { auth, provider, db }; // ייצוא Firestore (db)
=======
const db = getFirestore(app);  // Firestore

export { auth, provider, signInWithPopup, db };
>>>>>>> 4eeee05fb1167de4337429c6d46e198f4f62768b
