import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, startAfter, getDocs, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Modal, Button } from 'react-bootstrap';
import useLogger from './utils/useLogger';
import { sessionManager } from './services/sessionService';
import 'bootstrap/dist/css/bootstrap.min.css';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [realTimeLogs, setRealTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastLogDoc, setLastLogDoc] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const log = useLogger();  
  const batchSize = 10;

  useEffect(() => {
    // דיווח על מיקום נוכחי
    sessionManager.updateLastActive('דשבורד ניהול', true);

    const logsQuery = query(
      collection(db, 'logs'),
      orderBy('timestamp', 'desc'),
      limit(batchSize)
    );

    const unsubscribeLogs = onSnapshot(logsQuery, async (querySnapshot) => {
      const logsData = await Promise.all(
        querySnapshot.docs.map(async (logDoc) => {
          const log = logDoc.data();
          if (log.userId) {
            const userDocRef = doc(db, 'users', log.userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return { ...log, user: userData };
            }
          }
          return log;
        })
      );

      setLogs(logsData);
      setLastLogDoc(querySnapshot.docs[querySnapshot.docs.length - 1]); // שמירת הרשומה האחרונה לפגינציה
      setLoading(false);
    });

    return () => unsubscribeLogs();
  }, []);

  // פונקציה לניתוק משתמש מסוים
  const disconnectUser = async (userId) => {
    try {
      await sessionManager.forceLogoutUser(userId);
      log('Admin forced user disconnect', { userId });
      
      // עדכון מיידי של הרשימה
      setActiveSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === userId 
            ? { ...session, status: 'inactive', sessionId: null } 
            : session
        )
      );
    } catch (error) {
      console.error('Error disconnecting user:', error);
    }
  };

  // שליפת המעקב בזמן אמת
  useEffect(() => {
    const realTimeQuery = collection(db, 'onlineLogs');
    const unsubscribeRealTime = onSnapshot(realTimeQuery, async (querySnapshot) => {
      const realTimeLogsData = await Promise.all(
        querySnapshot.docs.map(async (logDoc) => {
          const log = logDoc.data();
          if (log.userId) {
            const userDocRef = doc(db, 'users', log.userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return { ...log, user: userData };
            }
          }
          return log;
        })
      );
      setRealTimeLogs(realTimeLogsData);
    });

    return () => unsubscribeRealTime();
  }, []);

  // מעקב אחר סשנים פעילים
  useEffect(() => {
    const activeSessionsQuery = query(
      collection(db, 'users'),
      where('sessionId', '!=', null)  // מציג את כל המשתמשים עם sessionId
    );

    const unsubscribeActiveSessions = onSnapshot(activeSessionsQuery, (snapshot) => {
      const sessions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastActiveFormatted: data.lastActive?.toDate().toLocaleString(),
          deviceInfo: data.deviceInfo || {},
          currentPath: data.currentPath || 'לא ידוע',
          status: data.status || 'active',  // ברירת מחדל ל-active אם אין סטטוס
          displayName: data.displayName || 'משתמש לא ידוע',
          email: data.email || 'אימייל לא ידוע'
        };
      }).sort((a, b) => {
        // מיון לפי זמן פעילות אחרון
        const timeA = a.lastActiveTimestamp || 0;
        const timeB = b.lastActiveTimestamp || 0;
        return timeB - timeA;
      });
      
      setActiveSessions(sessions);
    });

    return () => unsubscribeActiveSessions();
  }, []);

  // פונקציה לטעינת רשומות נוספות
  const loadMoreLogs = async () => {
    if (lastLogDoc) {
      setLoadingMore(true);
      const logsQuery = query(
        collection(db, 'logs'),
        orderBy('timestamp', 'desc'),
        startAfter(lastLogDoc),
        limit(batchSize)
      );

      const querySnapshot = await getDocs(logsQuery);

      if (!querySnapshot.empty) {
        const logsData = await Promise.all(
          querySnapshot.docs.map(async (logDoc) => {
            const log = logDoc.data();
            if (log.userId) {
              const userDocRef = doc(db, 'users', log.userId);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                return { ...log, user: userData };
              }
            }
            return log;
          })
        );

        setLogs((prevLogs) => [...prevLogs, ...logsData]);
        setLastLogDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      setLoadingMore(false);
    }
  };

  // פונקציה לעדכון הרשאות סשן מרובה
  const toggleMultipleSessions = async (userId, currentValue) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        allowMultipleSessions: !currentValue
      });
      log('Admin updated user multiple sessions permission', { 
        userId, 
        newValue: !currentValue 
      });
      
      // עדכון מיידי של הרשימה
      setActiveSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === userId 
            ? { ...session, allowMultipleSessions: !currentValue } 
            : session
        )
      );
    } catch (error) {
      console.error('Error updating user permissions:', error);
    }
  };

  const SimpleModal = ({ show, onHide, user }) => {
    if (!user) return null;

    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header>
          <Modal.Title className="text-end">פרטי משתמש: {user.displayName}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-end">
          <div className="user-details">
            <p><strong>אימייל:</strong> {user.email}</p>
            <p><strong>סטטוס:</strong> {user.status === 'active' ? 'פעיל' : user.status}</p>
            <p><strong>דף נוכחי:</strong> <span className="page-badge">{user.currentPath || 'לא ידוע'}</span></p>
            <p><strong>פעילות אחרונה:</strong> {user.lastActiveFormatted}</p>
            <p><strong>דפדפן:</strong> {user.deviceInfo?.userAgent}</p>
            <p><strong>מזהה סשן:</strong> {user.sessionId}</p>
          </div>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-end">
          <Button
            variant={user.allowMultipleSessions ? "warning" : "primary"}
            onClick={() => toggleMultipleSessions(user.id, user.allowMultipleSessions)}
          >
            {user.allowMultipleSessions
              ? "בטל הרשאת סשנים מרובים"
              : "אפשר סשנים מרובים"}
          </Button>
          <Button variant="danger" onClick={() => {
            disconnectUser(user.id);
            onHide();
          }}>
            נתק משתמש
          </Button>
          <Button variant="secondary" onClick={onHide}>
            סגור
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // רינדור הסשנים הפעילים
  const renderActiveSessions = () => (
    <div className="active-sessions">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">סשנים פעילים</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              {activeSessions.length} משתמשים פעילים
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">משתמש</th>
                  <th className="table-header">אימייל</th>
                  <th className="table-header">דף נוכחי</th>
                  <th className="table-header">סטטוס</th>
                  <th className="table-header">פעילות אחרונה</th>
                  <th className="table-header">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="table-cell">{session.displayName}</td>
                    <td className="table-cell">{session.email}</td>
                    <td className="table-cell">
                      <span className="page-badge">
                        {session.currentPath || 'לא ידוע'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`status-badge status-${session.status}`}>
                        {session.status === 'active' ? 'פעיל' : session.status}
                      </span>
                    </td>
                    <td className="table-cell">{session.lastActiveFormatted}</td>
                    <td className="table-cell">
                      <button
                        className="button button-secondary mr-2"
                        onClick={() => {
                          setSelectedUser(session);
                          setShowModal(true);
                        }}
                      >
                        פרטים
                      </button>
                      <button 
                        className="button button-danger"
                        onClick={() => disconnectUser(session.id)}
                      >
                        נתק
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <SimpleModal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        user={selectedUser}
      />
    </div>
  );

  if (loading) {
    log('Loading Dashboard');
    return <div>Loading Dashboard...</div>;
  }
  
  return (
    <div className="dashboard">
      <h2>לוח הבקרה</h2>

      <div className="cards-container">
        <div className="card">
          {renderActiveSessions()}
        </div>

        <div className="card">
          <h3>כרטיס מידע 2</h3>
          {/* כאן תוסיף תוכן מידע נוסף */}
        </div>

        <div className="card">
          <h3>היסטוריית לוגים</h3>
          <table>
            <thead>
              <tr>
                <th>תאריך ושעה</th>
                <th>משתמש</th>
                <th>פעולה</th>
                <th>פרטים</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td>
                    {log.timestamp && log.timestamp.toDate ? log.timestamp.toDate().toLocaleString() : 'No timestamp available'}
                  </td>
                  <td>{log.user ? log.user.displayName : 'משתמש לא מזוהה'}</td>
                  <td>{log.action}</td>
                  <td>{log.details ? JSON.stringify(log.details) : '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length >= batchSize && (
            <button
              className="button button-primary"
              onClick={loadMoreLogs}
              disabled={loadingMore}
            >
              {loadingMore ? 'טוען עוד...' : 'הצג עוד רשומות'}
            </button>
          )}
        </div>

        <div className="card">
          <h3>מעקב בזמן אמת</h3>
          <table>
            <thead>
              <tr>
                <th>תאריך ושעה</th>
                <th>משתמש</th>
                <th>פעולה נוכחית</th>
              </tr>
            </thead>
            <tbody>
              {realTimeLogs.map((log, index) => (
                <tr key={index}>
                  <td>{log.timestamp.toDate().toLocaleString()}</td>
                  <td>{log.user ? log.user.displayName : 'משתמש לא מזוהה'}</td>
                  <td>{log.currentAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
