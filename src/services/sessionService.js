// services/sessionService.js
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';

class SessionManager {
  constructor() {
    this.currentSessionId = null;
    this.unsubscribe = null;
    this.isForceLogoutActive = false;
  }

  async initSession(userId, sessionId) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // בדיקה ראשונית אם המשתמש נותק בכוח
    await this.checkForceLogout();

    this.currentSessionId = sessionId;
    const browserTabId = this.generateTabId();

    // עדכון הסשן הנוכחי
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    // בדיקה האם המשתמש פטור ממגבלת סשן יחיד
    if (!userData?.allowMultipleSessions) {
      await updateDoc(userDocRef, {
        sessionId,
        lastActive: serverTimestamp(),
        lastActiveTimestamp: Date.now(),
        browserTabId,
        status: 'active',
        currentPath: window.location.pathname,
        deviceInfo: {
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }
      });
    }

    // האזנה לשינויים בסשן
    this.unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      const data = snapshot.data();
      
      if (data.sessionId && 
          data.sessionId !== this.currentSessionId && 
          !this.isForceLogoutActive &&
          !userData?.allowMultipleSessions) {
        this.handleSessionConflict(data.browserTabId === browserTabId);
      }
    });

    // הוספת טיפול ביציאה מהדף
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  generateTabId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async handleSessionConflict(isSameTab) {
    this.isForceLogoutActive = true;

    if (isSameTab) {
      // אם זה אותו דפדפן, שמור את הטאב הנוכחי
      return;
    }

    // יצירת אלמנט מודאל מותאם
    const modalDiv = document.createElement('div');
    modalDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    `;

    modalContent.innerHTML = `
      <h3>Multiple Sessions Detected</h3>
      <p>You have another active session. You will be logged out from this session.</p>
      <p>Redirecting in <span id="countdown">3</span> seconds...</p>
    `;

    modalDiv.appendChild(modalContent);
    document.body.appendChild(modalDiv);

    // טיימר לספירה לאחור
    let count = 3;
    const countdownElement = modalContent.querySelector('#countdown');
    const countdown = setInterval(() => {
      count--;
      countdownElement.textContent = count;
      if (count <= 0) {
        clearInterval(countdown);
        this.forceLogout();
      }
    }, 1000);
  }

  async forceLogout() {
    // ניקוי וניתוק
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    await auth.signOut();
    window.location.href = '/';
  }

  async updateLastActive(currentPath, isApproved = true) {
    if (!auth.currentUser) return;

    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    if (userData?.allowMultipleSessions) return;

    // בדיקה אם המשתמש בדף הבית ולא מאושר - משמע בדף אישור משתמש
    const actualPath = currentPath === '/' && !isApproved ? 'אישור משתמש' : currentPath;

    await updateDoc(userDocRef, {
      lastActive: serverTimestamp(),
      currentPath: actualPath,
      lastActiveTimestamp: Date.now(),
      status: 'active',
      deviceInfo: {
        userAgent: navigator.userAgent,
        lastUpdate: Date.now()
      }
    });
  }

  async cleanupInactiveSessions() {
    try {
      const timeoutThreshold = 5 * 60 * 1000; // 5 דקות
      const currentTime = Date.now();
      
      const usersRef = collection(db, 'users');
      const activeSessionsQuery = query(
        usersRef,
        where('sessionId', '!=', null)
      );

      const snapshot = await getDocs(activeSessionsQuery);
      
      snapshot.docs.forEach(async (doc) => {
        const userData = doc.data();
        if (userData.lastActiveTimestamp && 
            (currentTime - userData.lastActiveTimestamp) > timeoutThreshold) {
          // מנקה את הסשן אם לא היה פעיל יותר מ-5 דקות
          await updateDoc(doc.ref, {
            sessionId: null,
            status: 'inactive',
            currentPath: null
          });
        }
      });
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
    }
  }

  async forceLogoutUser(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // שמירת ה-sessionId הישן לפני העדכון
      const oldSessionId = userData.sessionId;

      // מעדכן את הסטטוס של המשתמש
      await updateDoc(userRef, {
        sessionId: null,
        status: 'inactive',
        currentPath: null,
        lastActive: serverTimestamp(),
        forceLogout: true,  // דגל חדש שמסמן שזה ניתוק בכוח
        forceLogoutTimestamp: Date.now()  // זמן הניתוק
      });

      // מוסיף רשומת לוג על הניתוק
      const logRef = collection(db, 'logs');
      await addDoc(logRef, {
        type: 'force_logout',
        userId,
        oldSessionId,
        timestamp: serverTimestamp(),
        adminAction: true
      });

      // אם יש למשתמש סשן פעיל, מאלץ אותו להתנתק מיד
      if (oldSessionId) {
        const usersRef = collection(db, 'users');
        const activeSessionQuery = query(
          usersRef,
          where('sessionId', '==', oldSessionId)
        );
        
        const snapshot = await getDocs(activeSessionQuery);
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();
          
          // מעדכן את הדגל שיגרום לניתוק מיידי בצד הלקוח
          await updateDoc(userDoc.ref, {
            forceLogoutImmediate: true,
            forceLogoutTimestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Error in force logout:', error);
      throw error;
    }
  }

  async checkForceLogout() {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    if (userData?.forceLogout) {
      // מנקה את דגל הניתוק בכוח
      await updateDoc(userRef, {
        forceLogout: false,
        forceLogoutTimestamp: null
      });

      // מנתק את המשתמש
      await auth.signOut();
      window.location.href = '/';
    }
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export const sessionManager = new SessionManager();