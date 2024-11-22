// sessionService.js
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';

class SessionManager {
  constructor() {
    this.currentSessionId = null;
    this.unsubscribe = null;
  }

  async initSession(userId, sessionId) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.currentSessionId = sessionId;

    // עדכון הסשן הנוכחי
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      sessionId,
      lastActive: new Date(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        timestamp: new Date()
      }
    });

    // האזנה לשינויים בסשן
    this.unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      const data = snapshot.data();
      
      // אם התגלה סשן אחר, התנתק
      if (data.sessionId && data.sessionId !== this.currentSessionId) {
        this.handleSessionConflict();
      }
    });
  }

  async handleSessionConflict() {
    // מציג הודעה למשתמש
    alert('Another session has been detected. You will be logged out.');
    
    // מנקה את ההאזנה הנוכחית
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // מתנתק
    await auth.signOut();
    
    // מעביר לדף הכניסה
    window.location.href = '/';
  }

  async updateLastActive() {
    if (!auth.currentUser) return;

    const userDocRef = doc(db, 'users', auth.currentUser.uid);
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