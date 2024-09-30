import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import LiveVideo from './LiveVideo';
import Navbar from './Navbar';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // מצב לנתוני המשתמש
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        
        // משיכת פרטי המשתמש מ-Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data()); // שמירת נתוני המשתמש במצב
          const userData = userDoc.data();
          setIsAdmin(userData.isAdmin || false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    auth.signOut().then(() => {
      setUser(null);
      setIsAdmin(false);
      setUserData(null); // איפוס נתוני המשתמש לאחר יציאה
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
        {user && <Navbar user={user} isAdmin={isAdmin} onLogout={handleLogout} />}
        
        <Routes>
          <Route path="/" element={!user ? <Login /> : <LiveVideo user={user} userData={userData} onLogout={handleLogout} />} />
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <div>Access Denied</div>} />
        </Routes>
      
      </div>
    </Router>
  );
}

export default App;
