import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { logAction } from './utils/logging';

const ViewershipDashboard = ({ user }) => {
  const [viewers, setViewers] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);

  useEffect(() => {
    // וודא שרק מנהלים יכולים לראות את הדף
    if (!user.isAdmin) {
      alert('גישה מותרת למנהלים בלבד');
      return;
    }

    // מעקב אחר אירועים חיים
    const liveEventsQuery = query(
      collection(db, 'events'), 
      where('status', '==', 'live')
    );
    const unsubscribeLiveEvents = onSnapshot(liveEventsQuery, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLiveEvents(events);
    });

    // מעקב אחר צופים
    const viewershipQuery = query(
      collection(db, 'viewership'),
      orderBy('lastActive', 'desc')
    );
    const unsubscribeViewers = onSnapshot(viewershipQuery, (snapshot) => {
      const activeViewers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setViewers(activeViewers);
    });

    // ניקוי מנויים
    return () => {
      unsubscribeLiveEvents();
      unsubscribeViewers();
    };
  }, [user]);

  const handleBlockUser = async (userId) => {
    try {
      // הוספת לוגיקה לחסימת משתמש
      logAction(user.uid, 'User Blocked', { blockedUserId: userId });
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  return (
    <div className="viewership-dashboard">
      <h2>לוח בקרת צופים</h2>

      <section className="live-events">
        <h3>אירועים חיים כעת</h3>
        {liveEvents.map(event => (
          <div key={event.id} className="live-event">
            <h4>{event.name}</h4>
            <p>מספר צופים: {viewers.filter(v => v.eventId === event.id).length}</p>
          </div>
        ))}
      </section>

      <section className="active-viewers">
        <h3>צופים פעילים</h3>
        {viewers.map(viewer => (
          <div key={viewer.id} className="viewer-card">
            <p>משתמש: {viewer.userId}</p>
            <p>אירוע: {viewer.eventId}</p>
            <p>דף נוכחי: {viewer.currentPage}</p>
            <p>פעיל אחרון: {new Date(viewer.lastActive.toDate()).toLocaleString()}</p>
            <button onClick={() => handleBlockUser(viewer.userId)}>
              חסום משתמש
            </button>
          </div>
        ))}
      </section>
    </div>
  );
};

export default ViewershipDashboard;
