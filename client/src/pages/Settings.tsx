import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONTS, BRAND } from '../utils/constants';
import LogoWatermark from '../components/LogoWatermark';

const LOGO_STORAGE_KEY = 'connectingdot_logo';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    setLogoPreview(localStorage.getItem(LOGO_STORAGE_KEY));
  }, []);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        return;
      }

      localStorage.setItem(LOGO_STORAGE_KEY, result);
      setLogoPreview(result);
      window.dispatchEvent(new StorageEvent('storage', { key: LOGO_STORAGE_KEY, newValue: result }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        fontFamily: FONTS.ui,
      }}
    >
      {/* Header */}
      <header
        style={{
          height: 64,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(0,87,168,0.1)',
          padding: '0 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <LogoWatermark size="md" variant="dark" />
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            color: COLORS.primaryBlue,
            border: `1px solid ${COLORS.primaryBlue}`,
            borderRadius: 999,
            padding: '8px 20px',
            fontFamily: FONTS.ui,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Back to Lobby
        </button>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 20px' }}>
        <h1
          style={{
            fontFamily: FONTS.display,
            fontSize: 32,
            color: COLORS.darkBlue,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          Studio Settings
        </h1>

        <div
          style={{
            background: COLORS.white,
            borderRadius: 12,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontFamily: FONTS.ui, fontSize: 14, color: COLORS.darkBlue, fontWeight: 700, marginBottom: 12 }}>
            Show Information
          </h3>
          <label style={{ fontFamily: FONTS.ui, fontSize: 12, color: COLORS.silver, display: 'block', marginBottom: 4 }}>
            Show Name
          </label>
          <input
            type="text"
            defaultValue="Connecting Dot Podcast"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${COLORS.lightBlue}`,
              borderRadius: 8,
              fontFamily: FONTS.ui,
              fontSize: 14,
              marginBottom: 12,
              outline: 'none',
            }}
          />
          <label style={{ fontFamily: FONTS.ui, fontSize: 12, color: COLORS.silver, display: 'block', marginBottom: 4 }}>
            Episode Number
          </label>
          <input
            type="number"
            defaultValue={1}
            style={{
              width: 100,
              padding: '10px 12px',
              border: `1px solid ${COLORS.lightBlue}`,
              borderRadius: 8,
              fontFamily: FONTS.ui,
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        <div
          style={{
            background: COLORS.white,
            borderRadius: 12,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontFamily: FONTS.ui, fontSize: 14, color: COLORS.darkBlue, fontWeight: 700, marginBottom: 12 }}>
            Brand Logo
          </h3>
          <p style={{ fontFamily: FONTS.ui, fontSize: 12, color: COLORS.silver, lineHeight: 1.6, marginBottom: 12 }}>
            Upload a PNG, JPG, or SVG logo to replace the default Connecting Dot mark across the app.
          </p>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
            onChange={handleLogoUpload}
            style={{
              display: 'block',
              width: '100%',
              fontFamily: FONTS.ui,
              fontSize: 13,
              color: COLORS.darkText,
              marginBottom: 16,
            }}
          />

          {logoPreview ? (
            <div
              style={{
                border: `1px solid ${COLORS.lightBlue}`,
                borderRadius: 12,
                padding: 16,
                background: COLORS.bg,
              }}
            >
              <div style={{ fontFamily: FONTS.ui, fontSize: 11, color: COLORS.silver, marginBottom: 10 }}>
                Preview
              </div>
              <img
                src={logoPreview}
                alt="Uploaded Connecting Dot logo preview"
                style={{ width: 200, maxWidth: '100%', display: 'block' }}
              />
            </div>
          ) : null}
        </div>

        <div
          style={{
            background: COLORS.white,
            borderRadius: 12,
            padding: 24,
          }}
        >
          <h3 style={{ fontFamily: FONTS.ui, fontSize: 14, color: COLORS.darkBlue, fontWeight: 700, marginBottom: 12 }}>
            API Keys
          </h3>
          <p style={{ fontFamily: FONTS.ui, fontSize: 12, color: COLORS.silver, lineHeight: 1.6 }}>
            Configure your API keys in <code>server/.env</code> file. See the README for details.
          </p>
        </div>

        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontFamily: FONTS.ui,
            fontSize: 11,
            color: COLORS.silver,
          }}
        >
          {BRAND.name} v1.0.0 — Powered by {BRAND.poweredBy} Consulting
        </div>
      </div>
    </div>
  );
};

export default Settings;
