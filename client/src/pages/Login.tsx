import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { COLORS, FONTS } from '../utils/constants';
import LogoWatermark from '../components/LogoWatermark';
import Header from '../components/Header';
import useAuth from '../hooks/useAuth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) navigate('/admin');
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%',
            maxWidth: 450,
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(40px)',
            borderRadius: 32,
            padding: 48,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <LogoWatermark size="md" variant="light" />
          </div>
          
          <h1 style={{ fontFamily: FONTS.display, fontSize: 32, fontWeight: 900, color: COLORS.white, marginBottom: 12 }}>
            Welcome Back
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 40, letterSpacing: '0.05em' }}>
            Login to access the studio and join live events.
          </p>

          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: '0.1em' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: COLORS.white,
                  fontFamily: FONTS.ui,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>

            <div style={{ marginBottom: 40 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.6)', marginBottom: 8, letterSpacing: '0.1em' }}>
                PASSWORD
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: COLORS.white,
                  fontFamily: FONTS.ui,
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, #00A8FF 0%, #0057A8 100%)',
                color: COLORS.white,
                fontFamily: FONTS.display,
                fontSize: 16,
                fontWeight: 900,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(0, 168, 255, 0.4)',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              SIGN IN
            </button>
          </form>

          <p style={{ marginTop: 32, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Don't have an account? <span style={{ color: COLORS.white, fontWeight: 800, cursor: 'pointer' }}>Sign up free</span>
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Login;
