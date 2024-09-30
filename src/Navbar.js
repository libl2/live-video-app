import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPopper } from '@popperjs/core'; // ייבוא Popper

const Navbar = ({ user, isAdmin, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const profileRef = useRef(null); // ייחוס לאייקון הפרופיל
  const dropdownRef = useRef(null); // ייחוס לתפריט הנפתח

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    if (isDropdownOpen && profileRef.current && dropdownRef.current) {
      // שימוש ב-popper.js כדי למקם את התפריט הנפתח
      createPopper(profileRef.current, dropdownRef.current, {
        placement: 'bottom-end', // התפריט ייפתח מתחת ובצד ימין
      });
    }
  }, [isDropdownOpen]);

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
              <Link to="/admin" style={styles.adminButton}>Admin Dashboard</Link>
            )}
            <div style={styles.profileMenu}>
              <img
                src={user.photoURL}
                alt="Profile"
                style={styles.profileImage}
                ref={profileRef} // ייחוס לאייקון
                onClick={toggleDropdown}
              />
              {isDropdownOpen && (
                <div style={styles.dropdownMenu} ref={dropdownRef}> {/* ייחוס לתפריט */}
                  <button onClick={onLogout} style={styles.logoutButton}>התנתק</button>
                </div>
              )}
            </div>
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
    marginLeft: '1rem',
    color: '#fff',
    backgroundColor: '#4CAF50',
    border: 'none',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    borderRadius: '5px',
  },
  profileMenu: {
    position: 'relative',
    display: 'inline-block',
    marginLeft: '1rem',
  },
  profileImage: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    minWidth: '150px',
    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)',
    zIndex: 1,
    borderRadius: '5px',
    padding: '0.5rem',
  },
  logoutButton: {
    backgroundColor: '#f1f1f1',
    color: '#333',
    border: 'none',
    padding: '0.5rem 1rem',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '5px',
  },
};

export default Navbar;
