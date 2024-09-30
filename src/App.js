import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import LiveVideo from './LiveVideo';
import Navbar from './Navbar'; // ייבוא ה-Navbar
import { auth, db } from './firebase'; // ייבוא Firestore
import { doc, getDoc } from 'firebase/firestore';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // ייבוא הניתובים
import AdminDashboard from './AdminDashboard'; // ייבוא דף המנהל


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // מצב לבדיקה אם המשתמש הוא מנהל

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);

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
      }
      setLoading(false);
    });

    // ביטול המנוי כשקומפוננטה מתפרקת
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    auth.signOut().then(() => {
      setUser(null);
      setIsAdmin(false);
    }).catch((error) => {
      console.error("Error signing out: ", error);
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Navbar user={user} isAdmin={isAdmin} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={!user ? <Login /> : <LiveVideo user={user} />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <div>Access Denied</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
