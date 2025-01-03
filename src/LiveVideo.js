import React, { useEffect } from 'react';
import { logAction, logRealTimeAction } from './utils/logging'; // ייבוא פונקציות הלוג
import { sessionManager } from './services/sessionService';

const LiveVideo = ({ user, userData, onLogout }) => {
  useEffect(() => {
    // דיווח על מיקום נוכחי
    sessionManager.updateLastActive('שידור חי', userData?.isApproved || false);

    // רישום לוג של מעבר לדף השידור החי
    logAction(user.uid, 'Visited Live Video Page');
    logRealTimeAction(user.uid, 'Watching live video');

    // ניקוי לוג בזמן אמת ביציאה מהעמוד
    return () => logRealTimeAction(user.uid, 'Left live video page');
  }, [user, userData]);

  return (
    <div>
      <h2>ברוכים הבאים, {user.displayName}!</h2>
      <button onClick={onLogout}>התנתק</button>
      {/* כאן יהיה השידור החי */}
    </div>
  );
};

export default LiveVideo;
