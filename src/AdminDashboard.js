import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const AdminDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [realTimeLogs, setRealTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // שליפת הלוגים מהיסטוריה
  const fetchLogs = async () => {
    const querySnapshot = await getDocs(collection(db, 'logs'));
    const logsData = querySnapshot.docs.map(doc => doc.data());
    setLogs(logsData);
  };

  // שליפת המעקב בזמן אמת
  const fetchRealTimeLogs = async () => {
    const querySnapshot = await getDocs(collection(db, 'onlineLogs'));
    const realTimeLogsData = querySnapshot.docs.map(doc => doc.data());
    setRealTimeLogs(realTimeLogsData);
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchLogs();
      await fetchRealTimeLogs();
      setLoading(false);
    };

    fetchData();
  }, []); // טעינת המידע פעם אחת

  if (loading) {
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
                <th>מזהה משתמש</th>
                <th>פעולה</th>
                <th>פרטים</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td>{log.timestamp.toDate().toLocaleString()}</td>
                  <td>{log.userId}</td>
                  <td>{log.action}</td>
                  <td>{log.details ? JSON.stringify(log.details) : '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>מעקב בזמן אמת</h3>
          <table>
            <thead>
              <tr>
                <th>תאריך ושעה</th>
                <th>מזהה משתמש</th>
                <th>פעולה נוכחית</th>
              </tr>
            </thead>
            <tbody>
              {realTimeLogs.map((log, index) => (
                <tr key={index}>
                  <td>{log.timestamp.toDate().toLocaleString()}</td>
                  <td>{log.userId}</td>
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
