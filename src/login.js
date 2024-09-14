import React from 'react';
import { auth, provider } from './firebase';

const Login = () => {
  const signInWithGoogle = () => {
    auth.signInWithPopup(provider)
      .catch(error => {
        console.error("Error signing in with Google: ", error);
      });
  };

  return (
    <div>
      <h2>Welcome to Live Video App</h2>
      <button onClick={signInWithGoogle}>היכנס עם חשבון גוגל</button>
    </div>
  );
};

export default Login;