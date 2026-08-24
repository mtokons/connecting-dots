import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { COLORS, FONTS } from '../utils/constants';
import LogoWatermark from './LogoWatermark';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('cd_user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, [location.pathname]);

  const handleAuthAction = () => {
    if (user) {
      localStorage.removeItem('cd_token');
      localStorage.removeItem('cd_user');
      setUser(null);
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  const navItems = [
    { label: 'HOME', path: '/' },
    { label: 'EPISODES', path: '/episodes' },
    { label: 'ADMIN', path: '/admin' },
  ];

  return (
    <header style={{
      position: 'relative',
      zIndex: 100,
      padding: 'clamp(12px, 2vw, 24px) clamp(16px, 4vw, 60px)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'rgba(5, 10, 21, 0.4)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      <div 
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <LogoWatermark size="sm" variant="light" />
      </div>

      <nav style={{ display: 'flex', gap: 'clamp(12px, 2vw, 32px)', alignItems: 'center', flexWrap: 'wrap' }}>
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: 'none',
              border: 'none',
              color: location.pathname === item.path ? COLORS.primaryBlue : COLORS.white,
              fontFamily: FONTS.display,
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              opacity: location.pathname === item.path ? 1 : 0.6,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              if (location.pathname !== item.path) {
                e.currentTarget.style.opacity = '0.6';
              }
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {item.label}
          </button>
        ))}

        <button
          onClick={handleAuthAction}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            background: user 
              ? 'rgba(255, 77, 77, 0.1)' 
              : 'linear-gradient(135deg, #00A8FF 0%, #0057A8 100%)',
            color: user ? '#FF4D4D' : COLORS.white,
            fontFamily: FONTS.display,
            fontSize: 13,
            fontWeight: 900,
            border: user ? '1px solid rgba(255, 77, 77, 0.3)' : 'none',
            cursor: 'pointer',
            boxShadow: user ? 'none' : '0 4px 15px rgba(0, 168, 255, 0.3)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            if (!user) e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 168, 255, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            if (!user) e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 168, 255, 0.3)';
          }}
        >
          {user ? 'LOGOUT' : 'LOGIN'}
        </button>
      </nav>
    </header>
  );
};

export default Header;
