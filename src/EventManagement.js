import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { logAction } from './utils/logging';

const EventManagement = ({ user }) => {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    defaultPrice: 0,
    specialPrices: {}
  });

  useEffect(() => {
    // וודא שרק מנהלים יכולים לראות את הדף
    if (!user.isAdmin) {
      alert('גישה מותרת למנהלים בלבד');
      return;
    }
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    try {
      const eventsQuery = query(collection(db, 'events'));
      const querySnapshot = await getDocs(eventsQuery);
      const fetchedEvents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const eventRef = await addDoc(collection(db, 'events'), {
        ...newEvent,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: 'upcoming'
      });

      logAction(user.uid, 'Event Created', { 
        eventId: eventRef.id, 
        eventName: newEvent.name 
      });

      fetchEvents();
      // איפוס טופס
      setNewEvent({
        name: '',
        description: '',
        startTime: '',
        endTime: '',
        defaultPrice: 0,
        specialPrices: {}
      });
    } catch (error) {
      console.error("Error creating event:", error);
    }
  };

  const handleAddSpecialPrice = (userId, price) => {
    setNewEvent(prev => ({
      ...prev,
      specialPrices: {
        ...prev.specialPrices,
        [userId]: price
      }
    }));
  };

  const handleUpdateEventStatus = async (eventId, status) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, { status });

      logAction(user.uid, 'Event Status Updated', { 
        eventId, 
        newStatus: status 
      });

      fetchEvents();
    } catch (error) {
      console.error("Error updating event status:", error);
    }
  };

  return (
    <div className="event-management">
      <h2>ניהול אירועים</h2>
      
      {/* טופס יצירת אירוע חדש */}
      <form onSubmit={handleCreateEvent}>
        <input
          type="text"
          placeholder="שם האירוע"
          value={newEvent.name}
          onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
          required
        />
        <textarea
          placeholder="תיאור האירוע"
          value={newEvent.description}
          onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
        />
        <input
          type="datetime-local"
          placeholder="זמן התחלה"
          value={newEvent.startTime}
          onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
          required
        />
        <input
          type="datetime-local"
          placeholder="זמן סיום"
          value={newEvent.endTime}
          onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
          required
        />
        <input
          type="number"
          placeholder="מחיר בסיסי"
          value={newEvent.defaultPrice}
          onChange={(e) => setNewEvent({...newEvent, defaultPrice: parseFloat(e.target.value)})}
          required
        />
        <button type="submit">צור אירוע</button>
      </form>

      {/* רשימת אירועים */}
      <div className="events-list">
        {events.map(event => (
          <div key={event.id} className="event-card">
            <h3>{event.name}</h3>
            <p>{event.description}</p>
            <p>מחיר: ₪{event.defaultPrice}</p>
            <p>סטטוס: {event.status}</p>
            <div className="event-actions">
              <button onClick={() => handleUpdateEventStatus(event.id, 'live')}>
                התחל שידור
              </button>
              <button onClick={() => handleUpdateEventStatus(event.id, 'ended')}>
                סיים שידור
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventManagement;
