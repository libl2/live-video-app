import React from 'react';

const LiveVideo = ({ user, userData, onLogout }) => {
  return (
    <div>
      <h2>Welcome, {user.displayName}!</h2>
      {userData && (
        <div>
          <p>סטטוס: {userData.isApproved ? 'מאושר' : 'לא מאושר'}</p>
          <p>תשלום: {userData.hasPaid ? 'שילם' : 'לא שילם'}</p>
        </div>
      )}
      <button onClick={onLogout}>התנתק</button>
    </div>
  );
};

export default LiveVideo;
