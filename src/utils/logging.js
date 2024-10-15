// src/utils/logging.js
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const logAction = async (userId, action, details = {}) => {
  try {
    await addDoc(collection(db, 'logs'), {
      userId: userId || 'Unknown',
      action: action,
      details: details,
      timestamp: serverTimestamp(),
    });
    console.log(`Action logged: ${action} | User ID: ${userId}`, details);
  } catch (error) {
    console.error('Error logging action: ', error);
  }
};

// לא חייב לשנות את הפונקציה השנייה, אבל ניתן לעשות זאת אם צריך יותר פרטים
export const logRealTimeAction = async (userId, action, details = {}) => {
  try {
    await addDoc(collection(db, 'realTimeLogs'), {
      userId: userId || 'Unknown',
      action: action,
      details: details,
      timestamp: serverTimestamp(),
    });
    console.log(`Real-time action logged: ${action} | User ID: ${userId}`);
  } catch (error) {
    console.error('Error logging real-time action: ', error);
  }
};
