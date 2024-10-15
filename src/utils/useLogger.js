import { useCallback } from 'react';
import { logAction } from './logging';
import useAuth from './useAuth'; // וודא שהנתיב מתאים למיקום האמיתי של useAuth

const useLogger = () => {
  const { user, userData } = useAuth(); // שימוש ב-Hook החדש לקבלת פרטי המשתמש

  const log = useCallback(
    async (action, details = {}) => {
      if (!user) {
        console.warn('Cannot log action: user is not authenticated');
        return;
      }

      try {
        await logAction(user.uid, action, {
          ...details,
          userName: user.displayName || 'Unknown',
          userEmail: user.email,
        });
      } catch (error) {
        console.error('Failed to log action:', error);
      }
    },
    [user, userData]
  );

  return log;
};

export default useLogger;
