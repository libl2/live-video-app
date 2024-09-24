import React from 'react';
import { auth, provider, signInWithPopup, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const Login = () => {
  const signInWithGoogle = async () => {
    try {
      // כניסה עם Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // בדיקה אם המסמך של המשתמש קיים ב-Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // שמירת המשתמש ב-Firestore אם הוא חדש
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          isApproved: false, // ברירת מחדל - לא מאושר
          hasPaid: false     // ברירת מחדל - לא שילם
        });
      } else {
        console.log("המשתמש כבר קיים ב-Firestore");
      }
    } catch (error) {
      console.error("שגיאה בכניסה עם חשבון גוגל: ", error);
    }
  };

  return (
    <div>
      <h2>היכנס עם חשבון Google</h2>
      <button onClick={signInWithGoogle}>התחבר עם Google</button>
    </div>
  );
};

export default Login;
