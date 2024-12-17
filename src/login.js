// Login.js
import React, { useEffect } from 'react';
import { auth, provider } from './firebase'; // ייבוא auth ו-provider מהקובץ firebase.js
import { signInWithPopup } from 'firebase/auth'; // ייבוא ישיר של signInWithPopup מ-firebase/auth
import { sessionManager } from './services/sessionService'; // ייבוא sessionManager מהקובץ sessionService.js

const Login = () => {
  useEffect(() => {
    // דיווח על מיקום נוכחי
    sessionManager.updateLastActive('דף התחברות', false);
  }, []);

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
