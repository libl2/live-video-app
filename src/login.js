// Login.js
import React from 'react';
import { auth, provider } from './firebase'; // הסר את signInWithPopup
import { signInWithPopup } from 'firebase/auth'; // ייבוא ישיר מ-firebase/auth

const Login = () => {
  const signInWithGoogle = () => {
    signInWithPopup(auth, provider)
      .catch(error => {
        console.error("שגיאה בכניסה עם חשבון גוגל: ", error);
      });
  };

  return (
    <div>
      <h2>ברוכים הבאים לאפליקציית וידאו חי</h2>
      <button onClick={signInWithGoogle}>היכנס עם חשבון גוגל</button>
    </div>
  );
};

export default Login;
