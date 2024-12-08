import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './Login';
import LiveVideo from './LiveVideo';
import Navbar from './Navbar';
import UserApproval from './UserApproval';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import AdminDashboard from './AdminDashboard';
import { logAction, logRealTimeAction } from './utils/logging';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { sessionManager } from './services/sessionService'; // הוסף את זה
import EventManagement from './EventManagement';
import ViewershipDashboard from './ViewershipDashboard';
import PaymentGateway from './PaymentGateway';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        setUser(authUser);

        // יצירת משתמש חדש אם לא קיים
        await createUserIfNotExists(authUser);

        // יצירת sessionId חדש
        const newSessionId = uuidv4();
        setSessionId(newSessionId);

        // אתחול מנגנון הסשן
        await sessionManager.initSession(authUser.uid, newSessionId);

        // משיכת פרטי המשתמש
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
        sessionManager.cleanup();
        await logAction(null, 'Login failed');
      }
      setLoading(false);
    });

    const checkForceLogout = async () => {
      if (!auth.currentUser) return;

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // בודק אם יש דגל של ניתוק מיידי
      if (userData?.forceLogoutImmediate || userData?.forceLogout) {
        await sessionManager.forceLogout();
      }
    };

    // בדיקה כל 5 שניות
    const interval = setInterval(checkForceLogout, 5000);
    
    // בדיקה ראשונית מיד
    checkForceLogout();

    // עדכון lastActive ומיקום נוכחי כל 30 שניות
    const activeInterval = setInterval(() => {
      if (user) {
        const currentPath = window.location.pathname;
        // מציאת שם הדף הנוכחי
        let pageName = 'Unknown Page';
        
        if (currentPath === '/') {
          pageName = 'דף הבית';
        } else if (currentPath === '/admin') {
          pageName = 'דשבורד ניהול';
        } else if (currentPath.startsWith('/room/')) {
          const roomId = currentPath.split('/')[2];
          pageName = `חדר שידור ${roomId}`;
        } else if (currentPath === '/rooms') {
          pageName = 'רשימת חדרים';
        } else if (currentPath === '/profile') {
          pageName = 'פרופיל משתמש';
        } else if (currentPath === '/live-video') {
          pageName = 'שידור חי';
        }

        sessionManager.updateLastActive(pageName, isApproved);
      }
    }, 30000);

    // מנקה סשנים לא פעילים כל 2 דקות
    const cleanupInterval = setInterval(() => {
      if (user?.isAdmin) {
        sessionManager.cleanupInactiveSessions();
      }
    }, 120000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      clearInterval(activeInterval);
      clearInterval(cleanupInterval);
      sessionManager.cleanup();
    };
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

  const createSessionForUser = async (user, sessionId) => {
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      sessionId,
      lastLogin: serverTimestamp(),
    });
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await logAction(user.uid, 'Logout', { status: 'success' });
        await logRealTimeAction(user.uid, 'Logged out');
        sessionManager.cleanup();
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
          <Route
            path="/event-management"
            element={
              user && isAdmin ? (
                <EventManagement user={userData} />
              ) : !user ? (
                <Navigate to="/" replace />
              ) : (
                <div>Access Denied</div>
              )
            }
          />
          <Route
            path="/viewership-dashboard"
            element={
              user && isAdmin ? (
                <ViewershipDashboard user={userData} />
              ) : !user ? (
                <Navigate to="/" replace />
              ) : (
                <div>Access Denied</div>
              )
            }
          />
          <Route
            path="/payment/:eventId"
            element={
              user ? (
                <PaymentGateway user={user} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
