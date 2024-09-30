import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import LiveVideo from './LiveVideo';
<<<<<<< HEAD
import Navbar from './Navbar'; // ייבוא ה-Navbar
import { auth, db } from './firebase'; // ייבוא Firestore
import { doc, getDoc } from 'firebase/firestore';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // ייבוא הניתובים
import AdminDashboard from './AdminDashboard'; // ייבוא דף המנהל

=======
import { auth, db } from './firebase'; // ייבוא Firestore
import { doc, getDoc } from 'firebase/firestore';
>>>>>>> 4eeee05fb1167de4337429c6d46e198f4f62768b

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [isAdmin, setIsAdmin] = useState(false); // מצב לבדיקה אם המשתמש הוא מנהל
=======
  const [userData, setUserData] = useState(null); // מצב חדש לאחסון נתוני המשתמש
>>>>>>> 4eeee05fb1167de4337429c6d46e198f4f62768b

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);

<<<<<<< HEAD
        // משיכת פרטי המשתמש מ-Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.isAdmin || false); // בדיקה אם המשתמש הוא מנהל
        }
      } else {
        setUser(null);
        setIsAdmin(false);
=======
        // טעינת נתוני המשתמש מ-Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data()); // שמירת נתוני המשתמש במצב
        }
>>>>>>> 4eeee05fb1167de4337429c6d46e198f4f62768b
      }
      setLoading(false);
    });

    // ביטול המנוי כשקומפוננטה מתפרקת
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    auth.signOut().then(() => {
      setUser(null);
<<<<<<< HEAD
      setIsAdmin(false);
=======
      setUserData(null); // איפוס נתוני המשתמש לאחר יציאה
>>>>>>> 4eeee05fb1167de4337429c6d46e198f4f62768b
    }).catch((error) => {
      console.error("Error signing out: ", error);
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
<<<<<<< HEAD
    <Router>
      <div className="App">
        <Navbar user={user} isAdmin={isAdmin} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={!user ? <Login /> : <LiveVideo user={user} />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <div>Access Denied</div>} />
        </Routes>
      </div>
    </Router>
=======
    <div className="App">
      {!user ? (
        <Login />
      ) : (
        <LiveVideo user={user} userData={userData} onLogout={handleLogout} /> // העברת נתוני המשתמש ל-LiveVideo
      )}
    </div>
>>>>>>> 4eeee05fb1167de4337429c6d46e198f4f62768b
  );
}

export default App;
