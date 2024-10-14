import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import LiveVideo from './LiveVideo';
import Navbar from './Navbar';
import UserApproval from './UserApproval'; // ייבוא רכיב אישור משתמש
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import AdminDashboard from './AdminDashboard';
import { logAction, logRealTimeAction } from './logging';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(null); // מצב עבור isApproved

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
          setIsApproved(userData.isApproved || false); // שמירת מצב isApproved

          if (userData.isApproved) {
            // רישום לוג התחברות מוצלחת ב-Firestore
            await logAction(user.uid, 'Login successful', { email: user.email });
          } else {
            // רישום לוג שהמשתמש אינו מאושר
            await logAction(user.uid, 'User not approved');
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsApproved(false);
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
        setIsApproved(false);
      } catch (error) {
        console.error("Error signing out: ", error);
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
          <Route
            path="/"
            element={
              !user ? (
                <Login />
              ) : !isApproved ? (
                <UserApproval />
              ) : (
                <LiveVideo user={user} userData={userData} onLogout={handleLogout} />
              )
            }
          />
          <Route
            path="/admin"
            element={
              user && isAdmin ? (
                <AdminDashboard />
              ) : !user ? (
                <Navigate to="/" replace />
              ) : (
                <div>Access Denied</div>
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
