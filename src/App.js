import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import LiveVideo from './LiveVideo';
import Navbar from './Navbar';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { logAction, logRealTimeAction } from './logging'; // ייבוא פונקציות הלוג

function App() {  // כאן הוספתי את ההגדרה של פונקציית App
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
          const userData = userDoc.data();
          setUserData(userData);
          setIsAdmin(userData.isAdmin || false);

          // רישום לוג התחברות מוצלחת ב-Firestore
          await logAction(user.uid, 'Login successful', { email: user.email });
          //await logRealTimeAction(user.uid, 'Logged in and viewing main page');
        }
      } else {
        setUser(null);
        setIsAdmin(false);

        // רישום לוג ניסיון התחברות כושל ב-Firestore
        await logAction(null, 'Login failed');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (user) {
      try {
        await logAction(user.uid, 'Logout', { status: 'success' });
        await logRealTimeAction(user.uid, 'Logged out');
        await auth.signOut();
        setUser(null);
        setIsAdmin(false);
      } catch (error) {
        console.error("Error signing out: ", error);
        
        // רישום ניסיון יציאה כושל
        await logAction(user.uid, 'Logout', { status: 'failed', error: error.message });
      }
    }
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
