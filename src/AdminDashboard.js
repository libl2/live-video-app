import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, startAfter, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import useLogger from './utils/useLogger';

const AdminDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [lastLogDoc, setLastLogDoc] = useState(null); // כדי לשמור את הרשומה האחרונה לכל batch
  const [realTimeLogs, setRealTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const batchSize = 10; // מספר הרשומות המוצגות בכל פעם
  const log = useLogger(); // שימוש ב-Hook לקבלת פונקציית הלוג

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
      setLastLogDoc(querySnapshot.docs[querySnapshot.docs.length - 1]); // שמירת הרשומה האחרונה לפגינציה
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

  if (loading) {
    log('Loading Dashboard');
    return <div>Loading Dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Admin Dashboard</h2>

      <div className="cards-container">
        <div className="card">
          <h3>כרטיס מידע 1</h3>
          {/* כאן תוסיף תוכן מידע נוסף */}
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
