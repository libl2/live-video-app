import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // שימוש ב-Link למעברים בדפים

const Navbar = ({ user, isAdmin, onLogout }) => {
  const [isHovered, setIsHovered] = useState(false); // מצב לריחוף

  return (
    <nav style={styles.navbar}>
      <div style={styles.navbarBrand}>
        <Link to="/">Home</Link>
      </div>
      <div style={styles.navbarLinks}>
        {user && (
          <>
            <span>שלום, {user.displayName}!</span>
            {isAdmin && (
              <Link
                to="/admin"
                style={{
                  ...styles.adminButton,
                  backgroundColor: isHovered ? '#45a049' : '#4CAF50', // שינוי צבע בעת ריחוף
                }}
                onMouseEnter={() => setIsHovered(true)} // ריחוף
                onMouseLeave={() => setIsHovered(false)} // עזיבת ריחוף
              >
                Admin Dashboard
              </Link>
            )}
            <button onClick={onLogout} style={styles.logoutButton}>התנתק</button>
          </>
        )}
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#333',
    color: '#fff',
    direction: 'rtl',
  },
  navbarBrand: {
    fontSize: '1.5rem',
    color: '#fff',
  },
  navbarLinks: {
    display: 'flex',
    alignItems: 'center',
  },
  adminButton: {
    color: 'white',
    border: 'none',
    padding: '0.5rem 1.5rem',
    textDecoration: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    borderRadius: '5px',
    marginLeft: '1rem',
    transition: 'background-color 0.3s ease',
  },
  logoutButton: {
    backgroundColor: '#ff0000',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    marginLeft: '1rem',
  },
};

export default Navbar;
