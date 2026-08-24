import React, { useEffect, useRef } from 'react';
import { COLORS, FONTS } from '../utils/constants';
import type { Speaker } from '../types';

interface SpeakerCardProps {
  speaker: Speaker;
  videoRef?: React.RefObject<HTMLVideoElement>;
  isLocal?: boolean;
  stream?: MediaStream | null;
  isHost?: boolean;
  onToggleStage?: () => void;
  onToggleMute?: () => void;
  onToggleCamera?: () => void;
}

const SpeakerCard: React.FC<SpeakerCardProps> = ({ 
  speaker, 
  videoRef, 
  isLocal, 
  stream,
  isHost,
  onToggleStage,
  onToggleMute,
  onToggleCamera
}) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const resolvedVideoRef = videoRef ?? internalVideoRef;

  useEffect(() => {
    if (!resolvedVideoRef.current) {
      return;
    }

    if (!stream) {
      resolvedVideoRef.current.srcObject = null;
      return;
    }

    resolvedVideoRef.current.srcObject = stream;
    void resolvedVideoRef.current.play().catch(() => undefined);
  }, [resolvedVideoRef, stream]);

  const initials = speaker.name
    .split(' ')
    .map((namePart) => namePart[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        aspectRatio: '16/9',
        background: 'linear-gradient(135deg, #0d1b2a 0%, #050a15 100%)',
        border: speaker.isSpeaking ? '2px solid rgba(0, 168, 255, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: speaker.isSpeaking
          ? '0 0 30px rgba(0, 168, 255, 0.4), inset 0 0 20px rgba(0, 168, 255, 0.2)'
          : '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: speaker.isSpeaking ? 'scale(1.03) translateY(-5px)' : 'scale(1)',
        zIndex: speaker.isSpeaking ? 10 : 1,
      }}
    >
      {/* Speaking Glow Animation */}
      {speaker.isSpeaking && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 40px rgba(0, 168, 255, 0.4)',
            animation: 'speakingPulse 2s infinite ease-in-out',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      )}

      {stream && !speaker.isCameraOff ? (
        <video
          ref={resolvedVideoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            inset: 0,
            filter: 'contrast(1.1) saturate(1.1)',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(0,168,255,0.15) 0%, transparent 70%)',
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 40,
              background: 'linear-gradient(135deg, rgba(0,168,255,0.2) 0%, rgba(0,56,117,0.4) 100%)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 15px 35px rgba(0,0,0,0.4), inset 0 2px 5px rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <span
              style={{
                fontFamily: FONTS.display,
                fontSize: 42,
                fontWeight: 900,
                color: COLORS.white,
                textShadow: '0 4px 10px rgba(0,0,0,0.5)',
              }}
            >
              {initials}
            </span>
          </div>
        </div>
      )}

      {/* Lens Flare / Shine Effect */}
      <div 
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-20%',
          width: '140%',
          height: '140%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Info Panel - High-End Glassmorphism */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          backdropFilter: 'blur(10px)',
          padding: '40px 24px 24px',
          zIndex: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 20,
                fontWeight: 900,
                color: COLORS.white,
                textShadow: '0 4px 8px rgba(0,0,0,0.8)',
                letterSpacing: '0.02em',
              }}
            >
              {speaker.name}
            </div>
            <div
              style={{
                fontFamily: FONTS.ui,
                fontSize: 13,
                color: COLORS.primaryBlue,
                marginTop: 4,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {speaker.city}
            </div>
          </div>
          
          <span
            style={{
              fontFamily: FONTS.ui,
              fontSize: 11,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.9)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              padding: '6px 14px',
              backdropFilter: 'blur(5px)',
            }}
          >
            {speaker.role}
          </span>
        </div>
      </div>

      {/* Status Icons - Floating Glassmorphism */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          gap: 12,
          zIndex: 5,
        }}
      >
        <div
          onClick={isLocal ? onToggleMute : undefined}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: speaker.isMuted ? 'rgba(255, 77, 77, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            border: `1px solid ${speaker.isMuted ? 'rgba(255, 77, 77, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
            boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            cursor: isLocal ? 'pointer' : 'default',
          }}
        >
          {speaker.isMuted ? (
            <span style={{ color: '#FF4D4D', filter: 'drop-shadow(0 0 10px rgba(255,77,77,0.5))' }}>🔇</span>
          ) : (
            <span style={{ color: '#10B981' }}>🎙️</span>
          )}
        </div>

        <div
          onClick={isLocal ? onToggleCamera : undefined}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: speaker.isCameraOff ? 'rgba(255, 77, 77, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            border: `1px solid ${speaker.isCameraOff ? 'rgba(255, 77, 77, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
            boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            cursor: isLocal ? 'pointer' : 'default',
          }}
        >
          {speaker.isCameraOff ? (
            <span style={{ color: '#FF4D4D', filter: 'drop-shadow(0 0 10px rgba(255,77,77,0.5))' }}>📷</span>
          ) : (
            <span style={{ color: '#FFF' }}>📹</span>
          )}
        </div>
      </div>

      {/* Stage Management Overlay (for Hosts) */}
      {isHost && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleStage?.();
          }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            cursor: 'pointer',
            zIndex: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
        >
          <div
            style={{
              padding: '12px 24px',
              borderRadius: 16,
              background: speaker.isOnStage ? 'rgba(255,77,77,0.8)' : 'rgba(0,168,255,0.8)',
              color: COLORS.white,
              fontFamily: FONTS.ui,
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: '0.1em',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
          >
            {speaker.isOnStage ? 'REMOVE FROM STAGE' : 'ADD TO STAGE'}
          </div>
        </div>
      )}

      {isLocal && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            fontFamily: FONTS.ui,
            fontSize: 11,
            color: COLORS.white,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            borderRadius: 8,
            padding: '6px 16px',
            fontWeight: 900,
            letterSpacing: '0.2em',
            boxShadow: '0 10px 20px rgba(16,185,129,0.4), inset 0 2px 4px rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.2)',
            zIndex: 5,
          }}
        >
          YOU
        </div>
      )}

      <style>
        {`
          @keyframes speakingPulse {
            0% { box-shadow: inset 0 0 20px rgba(0, 168, 255, 0.2); }
            50% { box-shadow: inset 0 0 50px rgba(0, 168, 255, 0.5); }
            100% { box-shadow: inset 0 0 20px rgba(0, 168, 255, 0.2); }
          }
        `}
      </style>
    </div>
  );
};

export default SpeakerCard;
