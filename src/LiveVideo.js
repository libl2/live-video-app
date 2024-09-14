import React from 'react';

const LiveVideo = ({ user, onLogout }) => {
  return (
    <div>
      <h2>Welcome, {user.displayName}!</h2>
      {/* Add your live video functionality here */}
      <button onClick={onLogout}>התנתק</button>
    </div>
  );
};

export default LiveVideo;