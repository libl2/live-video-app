import React, { useEffect } from 'react';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { logAction } from './utils/logging';
import { sessionManager } from './services/sessionService';

const PaymentGateway = ({ user, userData }) => {
  useEffect(() => {
    // דיווח על מיקום נוכחי
    sessionManager.updateLastActive('שער תשלום', true);
  }, []);

  const handlePayment = async () => {
    // Implement your payment logic here
    // For demonstration, we'll just update the user's subscription status
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        subscription: 'paid'
      });
      logAction(user.uid, 'Payment successful', { subscription: 'paid' });
      // Redirect to LiveVideo component or refresh the page
    } catch (error) {
      console.error("Payment failed:", error);
      logAction(user.uid, 'Payment failed', { error: error.message });
    }
  };

  return (
    <div>
      <h2>Subscribe to Access Live Content</h2>
      <p>Your current subscription: {userData.subscription}</p>
      <button onClick={handlePayment}>Pay for Access</button>
    </div>
  );
};

export default PaymentGateway;