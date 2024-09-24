import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import LiveVideo from './LiveVideo';
import { auth, db } from './firebase'; // ייבוא Firestore
import { doc, getDoc } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null); // מצב חדש לאחסון נתוני המשתמש

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);

        // טעינת נתוני המשתמש מ-Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data()); // שמירת נתוני המשתמש במצב
        }
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    auth.signOut().then(() => {
      setUser(null);
      setUserData(null); // איפוס נתוני המשתמש לאחר יציאה
    }).catch((error) => {
      console.error("Error signing out: ", error);
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      {!user ? (
        <Login />
      ) : (
        <LiveVideo user={user} userData={userData} onLogout={handleLogout} /> // העברת נתוני המשתמש ל-LiveVideo
      )}
    </div>
  );
}

export default App;
