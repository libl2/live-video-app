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
  const [authCheckInterval, setAuthCheckInterval] = useState(null);
  const [authRequestSent, setAuthRequestSent] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      try {
        if (authUser) {
          setUser(authUser);
          setLoading(true);  // מגדיר loading כ-true בזמן שמחכים למידע

          // יצירת משתמש חדש אם לא קיים
          const isApproved = await createUserIfNotExists(authUser);

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
            setIsApproved(isApproved);

            if (isApproved) {
              await logAction(authUser.uid, 'Login successful', { email: authUser.email });
            } else {
              await logAction(authUser.uid, 'User not approved');
            }
          }
        } else {
          // אם אין משתמש מחובר, מאפס את כל המצבים
          setUser(null);
          setUserData(null);
          setIsAdmin(false);
          setIsApproved(false);
          setSessionId(null);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);  // מסיים את הטעינה בכל מקרה
      }
    });

    const checkForceLogout = async () => {
      if (!auth.currentUser) return;

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // בודק אם יש דגל של ניתוק מיידי
      if (userData?.forceLogoutImmediate || userData?.forceLogout) {
        // בדוק אם המשתמש הוא משתמש חדש שטרם אושר
        const firstLoginAttempt = userData.firstLoginAttempt?.toDate();
        const now = new Date();
        const timeSinceFirstLogin = firstLoginAttempt 
          ? (now.getTime() - firstLoginAttempt.getTime()) / (1000 * 60) // דקות
          : Infinity;

        // אפשר למשתמש חדש 30 דקות להתאשר
        if (timeSinceFirstLogin > 30 || !userData.firstLoginAttempt) {
          await sessionManager.forceLogout();
        }
      }
    };

    // בדיקה כל 5 שניות
    const interval = setInterval(checkForceLogout, 5000);
    
    // בדיקה ראשונית מיד
    checkForceLogout();

    // מנקה סשנים לא פעילים כל 2 דקות
    const cleanupInterval = setInterval(() => {
      if (user?.isAdmin) {
        sessionManager.cleanupInactiveSessions();
      }
    }, 120000);

    return () => {
      unsubscribe();
      clearInterval(interval);
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
        firstLoginAttempt: serverTimestamp(), // הוספת שדה זמן התחברות ראשונה
      });
      console.log('New user registered and blocked:', user.uid);
      return false; // מציין שהמשתמש טרם אושר
    }

    // אם המשתמש כבר קיים, בדוק את סטטוס האישור
    const userData = userDoc.data();
    return userData.isApproved || false;
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

  const checkUserAuthorization = async () => {
    if (!user || isApproved) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setIsApproved(userData.isApproved || false);
        
        if (userData.isApproved) {
          // Stop checking if user is now approved
          clearInterval(authCheckInterval);
          setAuthCheckInterval(null);
        }
      }
    } catch (error) {
      console.error("Error checking user authorization:", error);
    }
  };

  const sendAdminApprovalRequest = async () => {
    if (!user) return;

    try {
      const approvalRequestRef = doc(db, 'approvalRequests', user.uid);
      await setDoc(approvalRequestRef, {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        requestTimestamp: serverTimestamp(),
        status: 'pending'
      });

      setAuthRequestSent(true);
      logAction(user.uid, 'sent_approval_request');
    } catch (error) {
      console.error("Error sending approval request:", error);
    }
  };

  useEffect(() => {
    if (user && !isApproved && !authCheckInterval) {
      const interval = setInterval(checkUserAuthorization, 10000); // Check every 10 seconds
      setAuthCheckInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [user, isApproved]);

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
                <div>
                  <UserApproval />
                  {!isApproved && (
                    <div className="approval-request-container">
                      <p>You do not have access to this application. Request approval from an admin.</p>
                      <button 
                        onClick={sendAdminApprovalRequest} 
                        disabled={authRequestSent}
                        className="btn btn-primary"
                      >
                        {authRequestSent ? 'Request Sent' : 'Request Admin Approval'}
                      </button>
                    </div>
                  )}
                </div>
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
