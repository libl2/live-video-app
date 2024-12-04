import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPopper } from '@popperjs/core';

const Navbar = ({ user, isAdmin, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const profileRef = useRef(null);
  const dropdownRef = useRef(null);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  // סגירת התפריט אם לוחצים מחוץ לאזור
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        profileRef.current && 
        !profileRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isDropdownOpen && profileRef.current && dropdownRef.current) {
      createPopper(profileRef.current, dropdownRef.current, {
        placement: 'bottom-end',
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 10],
            },
          },
        ],
      });
    }
  }, [isDropdownOpen]);

  return (
    <nav style={styles.navbar}>
      <div style={styles.navbarBrand}>
        <Link to="/" style={styles.brandLink}>Live Stream</Link>
      </div>
      
      <div style={styles.navbarLinks}>
        {user && (
          <div style={styles.profileContainer}>
            <div 
              ref={profileRef} 
              onClick={toggleDropdown} 
              style={styles.profileImageContainer}
            >
              <img
                src={user.photoURL || 'default-avatar.png'}
                alt="Profile"
                style={styles.profileImage}
              />
            </div>

            {isDropdownOpen && (
              <div 
                ref={dropdownRef} 
                style={styles.dropdownMenu}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={styles.userInfoHeader}>
                  <img
                    src={user.photoURL || 'default-avatar.png'}
                    alt="Profile"
                    style={styles.userAvatar}
                  />
                  <div style={styles.userInfoText}>
                    <div style={styles.userName}>{user.displayName}</div>
                    <div style={styles.userEmail}>{user.email}</div>
                  </div>
                </div>

                <div style={styles.dropdownDivider}></div>

                {isAdmin && (
                  <>
                    <Link 
                      to="/admin" 
                      style={styles.dropdownItem}
                      onClick={toggleDropdown}
                    >
                      לוח בקרה ראשי
                    </Link>
                    <Link 
                      to="/event-management" 
                      style={styles.dropdownItem}
                      onClick={toggleDropdown}
                    >
                      ניהול אירועים
                    </Link>
                    <Link 
                      to="/viewership-dashboard" 
                      style={styles.dropdownItem}
                      onClick={toggleDropdown}
                    >
                      לוח בקרת צופים
                    </Link>
                    <div style={styles.dropdownDivider}></div>
                  </>
                )}

                <button 
                  onClick={onLogout} 
                  style={styles.dropdownItem}
                >
                  התנתק
                </button>
              </div>
            )}
          </div>
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
    padding: '10px 20px',
    backgroundColor: '#002', 
    color: 'var(--white)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  brandLink: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'var(--white)',
    textDecoration: 'none',
  },
  navbarLinks: {
    display: 'flex',
    alignItems: 'center',
  },
  profileContainer: {
    position: 'relative',
  },
  profileImageContainer: {
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'scale(1.1)',
    },
  },
  profileImage: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #1a73e8',
  },
  dropdownMenu: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    width: '280px',
    padding: '8px 0',
    border: '1px solid #dadce0',
    animation: 'fadeIn 0.3s ease',
  },
  userInfoHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    marginLeft: '10px',
  },
  userInfoText: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'right',
  },
  userName: {
    fontWeight: 'bold',
    fontSize: '1rem',
    color: '#000', 
    marginBottom: '4px',
  },
  userEmail: {
    color: '#666', 
    fontSize: '0.875rem',
    direction: 'rtl',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#dadce0',
    margin: '8px 0',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    textDecoration: 'none',
    color: '#202124',
    backgroundColor: 'white',
    border: 'none',
    textAlign: 'right',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    ':hover': {
      backgroundColor: '#f1f3f4',
    },
  },
};

export default Navbar;
