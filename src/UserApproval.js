import React, { useEffect } from 'react';
import useLogger from './utils/useLogger';

const UserApproval = () => {
  const log = useLogger(); // שימוש ב-Hook לקבלת פונקציית הלוג

  useEffect(() => {
    // רישום לוג כאשר דף ה-UserApproval נטען
    log('User approval page loaded', { status: 'waiting for approval' });
  }, [log]);

  return (
    <div>
      <h2>אנא המתן לאישור המנהל</h2>
    </div>
  );
};

export default UserApproval;
