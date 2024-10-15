import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import LiveVideo from './LiveVideo';
import Navbar from './Navbar';
import UserApproval from './UserApproval'; // ייבוא רכיב אישור משתמש
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import AdminDashboard from './AdminDashboard';
import { logAction, logRealTimeAction } from './utils/logging';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(null); // מצב עבור isApproved

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        setUser(authUser);
  
        // יצירת משתמש חדש אם לא קיים
        await createUserIfNotExists(authUser);
  
        // משיכת פרטי המשתמש מ-Firestore
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
  
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserData(userData);
          setIsAdmin(userData.isAdmin || false);
          setIsApproved(userData.isApproved || false);
  
          if (userData.isApproved) {
            await logAction(authUser.uid, 'Login successful', { email: authUser.email });
          } else {
            await logAction(authUser.uid, 'User not approved');
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
  
  const createUserIfNotExists = async (user) => {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
  
    if (!userDoc.exists()) {
      // רישום משתמש חדש במצב חסום (isApproved: false)
      await setDoc(userDocRef, {
        displayName: user.displayName || 'Unknown',
        email: user.email,
        isAdmin: false,
        isApproved: false,
        createdAt: serverTimestamp(),
      });
      console.log('New user registered and blocked:', user.uid);
    }
  };
  
  const handleLogout = async () => {
    if (user) {
      try {
        // רישום לוג יציאה לפני ביצוע פעולת ה-signOut
        await logAction(user.uid, 'Logout', { status: 'success' });
        await logRealTimeAction(user.uid, 'Logged out');
        await auth.signOut();
        setUser(null);
        setIsAdmin(false);
        setIsApproved(false);
      } catch (error) {
        console.error("Error signing out: ", error);
        // רישום לוג אם יש שגיאה ביציאה
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
              loading ? (
                <div>Loading...</div>
              ) : !user ? (
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
