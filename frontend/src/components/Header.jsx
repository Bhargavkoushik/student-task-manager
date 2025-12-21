import React from 'react';
import PropTypes from 'prop-types';
import { getTimezoneDisplay } from '../utils/timezoneUtils';
import './Header.css';

const Header = ({ currentUser, onLogout, title = 'Student Task Manager' }) => {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">📚 {title}</h1>
        <div className="timezone-indicator" title="Your timezone is automatically detected">
          🌍 {getTimezoneDisplay()}
        </div>
      </div>
      <div className="header-center">
        {/* Optional: Add filters or main heading here */}
      </div>
      <div className="header-right">
        {currentUser && (
          <>
            <div className="user-info">
              <div className="user-details">
                <p className="user-name">{currentUser.name}</p>
                <p className="user-email">{currentUser.email}</p>
              </div>
            </div>
            <button className="btn btn-logout" onClick={onLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
};

Header.propTypes = {
  currentUser: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string
  }),
  onLogout: PropTypes.func,
  title: PropTypes.string
};

export default Header;
