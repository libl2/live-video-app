// services/sessionService.js
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
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

    // בדיקה האם המשתמש פטור ממגבלת סשן יחיד
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    if (userData?.allowMultipleSessions) {
      console.log('User is allowed multiple sessions');
      return;
    }

    this.currentSessionId = sessionId;
    const browserTabId = this.generateTabId();

    // עדכון הסשן הנוכחי
    await updateDoc(userDocRef, {
      sessionId,
      lastActive: new Date(),
      browserTabId,
      deviceInfo: {
        userAgent: navigator.userAgent,
        timestamp: new Date()
      }
    });

    // האזנה לשינויים בסשן
    this.unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      const data = snapshot.data();
      
      if (data.sessionId && 
          data.sessionId !== this.currentSessionId && 
          !this.isForceLogoutActive) {
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
      <p>Redirecting in <span id="countdown">5</span> seconds...</p>
    `;

    modalDiv.appendChild(modalContent);
    document.body.appendChild(modalDiv);

    // טיימר לספירה לאחור
    let count = 5;
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

  async updateLastActive() {
    if (!auth.currentUser) return;

    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    if (userData?.allowMultipleSessions) return;

    await updateDoc(userDocRef, {
      lastActive: new Date()
    });
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export const sessionManager = new SessionManager();