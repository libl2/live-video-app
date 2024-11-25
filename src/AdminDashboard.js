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

  const UserDetailsModal = ({ user, onClose }) => {
    if (!user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 relative">
          {/* כפתור סגירה */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">
              פרטי משתמש: {user.displayName}
            </h3>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">אימייל</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">סטטוס</p>
                  <p className="font-medium">
                    {user.sessionId ? 
                      <span className="text-green-600">מחובר</span> : 
                      <span className="text-red-600">מנותק</span>
                    }
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">מכשיר אחרון</p>
                  <p className="font-medium">{user.deviceInfo?.userAgent || 'לא ידוע'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">פעילות אחרונה</p>
                  <p className="font-medium">{user.lastActiveFormatted}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button 
                onClick={() => toggleMultipleSessions(user.id, user.allowMultipleSessions)}
                className="btn-primary"
              >
                {user.allowMultipleSessions ? 'בטל הרשאת סשנים מרובים' : 'אפשר סשנים מרובים'}
              </button>
              {user.sessionId && (
                <button 
                  onClick={() => disconnectUser(user.id)}
                  className="btn-danger"
                >
                  נתק משתמש
                </button>
              )}
              <button 
                onClick={onClose}
                className="btn-secondary"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    log('Loading Dashboard');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="dashboard p-6 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold mb-8 text-gray-800">Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        {/* כרטיסיית סשנים פעילים */}
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
                    <th className="table-header">סטטוס</th>
                    <th className="table-header">פעילות אחרונה</th>
                    <th className="table-header">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="table-cell">{session.displayName}</td>
                      <td className="table-cell">
                        <span className="status-badge-active">
                          פעיל
                        </span>
                      </td>
                      <td className="table-cell">{session.lastActiveFormatted}</td>
                      <td className="table-cell">
                        <button 
                          onClick={() => setSelectedUser(session)}
                          className="btn-info ml-2"
                        >
                          פרטים
                        </button>
                        <button 
                          onClick={() => disconnectUser(session.id)}
                          className="btn-danger"
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

        {/* כרטיסיית היסטוריית לוגים */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">היסטוריית לוגים</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">תאריך ושעה</th>
                    <th className="table-header">משתמש</th>
                    <th className="table-header">פעולה</th>
                    <th className="table-header">פרטים</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="table-cell">
                        {log.timestamp?.toDate?.().toLocaleString() || 'No timestamp'}
                      </td>
                      <td className="table-cell">{log.user?.displayName || 'משתמש לא מזוהה'}</td>
                      <td className="table-cell">{log.action}</td>
                      <td className="table-cell">{log.details ? JSON.stringify(log.details) : '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length >= batchSize && (
                <div className="mt-4 text-center">
                  <button
                    className="btn-primary"
                    onClick={loadMoreLogs}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'טוען...' : 'טען עוד'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* כרטיסיית מעקב בזמן אמת */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">מעקב בזמן אמת</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">תאריך ושעה</th>
                    <th className="table-header">משתמש</th>
                    <th className="table-header">פעולה נוכחית</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {realTimeLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="table-cell">{log.timestamp.toDate().toLocaleString()}</td>
                      <td className="table-cell">{log.user?.displayName || 'משתמש לא מזוהה'}</td>
                      <td className="table-cell">{log.currentAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* כרטיסיית סטטיסטיקות */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">סטטיסטיקות מערכת</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">משתמשים פעילים</p>
                <p className="text-2xl font-bold text-blue-800">{activeSessions.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">פעולות היום</p>
                <p className="text-2xl font-bold text-green-800">
                  {logs.filter(log => {
                    const today = new Date();
                    const logDate = log.timestamp?.toDate?.();
                    return logDate && 
                           logDate.getDate() === today.getDate() &&
                           logDate.getMonth() === today.getMonth() &&
                           logDate.getFullYear() === today.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* מודל פרטי משתמש */}
      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* הוספת סגנונות גלובליים */}
      <style jsx global>{`
        .btn-primary {
          @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                 transition-colors duration-200;
        }
        
        .btn-secondary {
          @apply px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 
                 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 
                 transition-colors duration-200;
        }
        
        .btn-danger {
          @apply px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 
                 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 
                 transition-colors duration-200;
        }
        
        .btn-info {
          @apply px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 
                 transition-colors duration-200;
        }

        .table-header {
          @apply px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider;
        }

        .table-cell {
          @apply px-6 py-4 whitespace-nowrap text-sm text-gray-900;
        }

        .status-badge-active {
          @apply inline-flex px-2 py-1 text-xs font-semibold rounded-full
                 bg-green-100 text-green-800;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;