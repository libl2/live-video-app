import React, { useEffect } from 'react';
import useLogger from './utils/useLogger';
import { sessionManager } from './services/sessionService';

const UserApproval = () => {
  const log = useLogger(); // שימוש ב-Hook לקבלת פונקציית הלוג

  useEffect(() => {
    // רישום לוג כאשר דף ה-UserApproval נטען
    log('User approval page loaded', { status: 'waiting for approval' });
    
    // עדכון המיקום הנוכחי
    sessionManager.updateLastActive('אישור משתמש');

    // עדכון תקופתי של המיקום
    const interval = setInterval(() => {
      sessionManager.updateLastActive('אישור משתמש');
    }, 30000);

    return () => clearInterval(interval);
  }, [log]);

  return (
    <div>
      <h2>אנא המתן לאישור המנהל</h2>
    </div>
  );
};

export default UserApproval;
