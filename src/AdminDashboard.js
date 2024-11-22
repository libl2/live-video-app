import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  where 
} from 'firebase/firestore';
import { db } from './firebase';
import useLogger from './utils/useLogger';

const AdminDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [lastLogDoc, setLastLogDoc] = useState(null);
  const [realTimeLogs, setRealTimeLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const batchSize = 10;
  const log = useLogger();

  // שליפת הלוגים מהיסטוריה בזמן אמת
  useEffect(() => {
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
      setLastLogDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setLoading(false);
    });

    return () => unsubscribeLogs();
  }, []);

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
      where('sessionId', '!=', null)
    );

    const unsubscribeActiveSessions = onSnapshot(activeSessionsQuery, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastActiveFormatted: doc.data().lastActive?.toDate().toLocaleString()
      }));
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

  // פונקציה לניתוק משתמש מסוים
  const disconnectUser = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        sessionId: null,
        lastActive: new Date()
      });
      log('Admin forced user disconnect', { userId });
    } catch (error) {
      console.error('Error disconnecting user:', error);
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
    } catch (error) {
      console.error('Error updating user permissions:', error);
    }
  };

  // קומפוננטת מודל לפרטי משתמש
  const UserDetailsModal = ({ user, onClose }) => {
    if (!user) return null;

    return (
      <div className="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
          <h3 className="text-xl font-bold mb-4">פרטי משתמש: {user.displayName}</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p><strong>אימייל:</strong> {user.email}</p>
              <p><strong>סטטוס:</strong> {user.sessionId ? 'מחובר' : 'מנותק'}</p>
              <p><strong>הרשאת סשנים מרובים:</strong> {user.allowMultipleSessions ? 'כן' : 'לא'}</p>
            </div>
            <div>
              <p><strong>מכשיר אחרון:</strong> {user.deviceInfo?.userAgent || 'לא ידוע'}</p>
              <p><strong>פעילות אחרונה:</strong> {user.lastActiveFormatted}</p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button 
              onClick={() => toggleMultipleSessions(user.id, user.allowMultipleSessions)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {user.allowMultipleSessions ? 'בטל הרשאת סשנים מרובים' : 'אפשר סשנים מרובים'}
            </button>
            {user.sessionId && (
              <button 
                onClick={() => disconnectUser(user.id)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                נתק משתמש
              </button>
            )}
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    log('Loading Dashboard');
    return <div>Loading Dashboard...</div>;
  }

  return (
    <div className="dashboard p-6">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* סשנים פעילים */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">סשנים פעילים</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">משתמש</th>
                  <th className="px-4 py-2">סטטוס</th>
                  <th className="px-4 py-2">פעילות אחרונה</th>
                  <th className="px-4 py-2">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{session.displayName}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800">
                        פעיל
                      </span>
                    </td>
                    <td className="px-4 py-2">{session.lastActiveFormatted}</td>
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => setSelectedUser(session)} 
                        className="text-blue-500 hover:text-blue-700 mr-2"
                      >
                        פרטים
                      </button>
                      <button 
                        onClick={() => disconnectUser(session.id)}
                        className="text-red-500 hover:text-red-700"
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

        {/* היסטוריית לוגים */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">היסטוריית לוגים</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">תאריך ושעה</th>
                  <th className="px-4 py-2">משתמש</th>
                  <th className="px-4 py-2">פעולה</th>
                  <th className="px-4 py-2">פרטים</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {log.timestamp && log.timestamp.toDate ? log.timestamp.toDate().toLocaleString() : 'No timestamp available'}
                    </td>
                    <td className="px-4 py-2">{log.user ? log.user.displayName : 'משתמש לא מזוהה'}</td>
                    <td className="px-4 py-2">{log.action}</td>
                    <td className="px-4 py-2">{log.details ? JSON.stringify(log.details) : '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length >= batchSize && (
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={loadMoreLogs}
                disabled={loadingMore}
              >
                {loadingMore ? 'טוען עוד...' : 'הצג עוד רשומות'}
              </button>
            )}
          </div>
        </div>

        {/* מעקב בזמן אמת */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">מעקב בזמן אמת</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2">תאריך ושעה</th>
                  <th className="px-4 py-2">משתמש</th>
                  <th className="px-4 py-2">פעולה נוכחית</th>
                </tr>
              </thead>
              <tbody>
                {realTimeLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{log.timestamp.toDate().toLocaleString()}</td>
                    <td className="px-4 py-2">{log.user ? log.user.displayName : 'משתמש לא מזוהה'}</td>
                    <td className="px-4 py-2">{log.currentAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;