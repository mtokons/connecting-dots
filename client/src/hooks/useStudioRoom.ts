import { useState, useCallback, useEffect, useRef } from 'react';
import { Room, RoomEvent, LocalParticipant, RemoteParticipant } from 'livekit-client';
import { LIVEKIT_URL, API_BASE } from '../utils/constants';

interface UseStudioRoomReturn {
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  connect: (
    roomId: string,
    participantName: string,
    token: string,
    urlOverride?: string
  ) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  updateParticipantMetadata: (identity: string, metadata: string) => Promise<void>;
}

const useStudioRoom = (): UseStudioRoomReturn => {
  const [room, setRoom] = useState<Room | null>(null);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const roomRef = useRef<Room | null>(null);

  const updateRemoteParticipants = useCallback((nextRoom: Room) => {
    setRemoteParticipants(Array.from(nextRoom.remoteParticipants.values()));
  }, []);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    setRoom(null);
    setLocalParticipant(null);
    setRemoteParticipants([]);
    setIsConnected(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setError(null);
  }, []);

  const connect = useCallback(
    async (_roomId: string, _participantName: string, token: string, urlOverride?: string) => {
      try {
        setIsConnecting(true);
        setError(null);

        const nextRoom = new Room();
        roomRef.current = nextRoom;

        nextRoom.on(RoomEvent.ParticipantConnected, () => updateRemoteParticipants(nextRoom));
        nextRoom.on(RoomEvent.ParticipantDisconnected, () => updateRemoteParticipants(nextRoom));
        nextRoom.on(RoomEvent.TrackSubscribed, () => updateRemoteParticipants(nextRoom));
        nextRoom.on(RoomEvent.TrackUnsubscribed, () => updateRemoteParticipants(nextRoom));
        nextRoom.on(RoomEvent.ActiveSpeakersChanged, () => updateRemoteParticipants(nextRoom));
        nextRoom.on(RoomEvent.ParticipantMetadataChanged, (_prevMetadata, participant) => {
          if (participant === nextRoom.localParticipant) {
            setLocalParticipant(nextRoom.localParticipant);
          } else {
            updateRemoteParticipants(nextRoom);
          }
        });
        nextRoom.on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          setRemoteParticipants([]);
        });

        await nextRoom.connect(urlOverride ?? LIVEKIT_URL, token);
        // Request Full HD video and audio tracks
        const constraints = { video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true };
        const media = await navigator.mediaDevices.getUserMedia(constraints);
        const videoTrack = media.getVideoTracks()[0];
        const audioTrack = media.getAudioTracks()[0];
        // Publish video track
        await nextRoom.localParticipant.publishTrack(videoTrack);
        // Publish audio track if available
        if (audioTrack) {
          await nextRoom.localParticipant.publishTrack(audioTrack);
        }

        setRoom(nextRoom);
        setLocalParticipant(nextRoom.localParticipant);
        updateRemoteParticipants(nextRoom);
        setIsConnected(true);
      } catch (err) {
        disconnect();
        setError(err instanceof Error ? err.message : 'Failed to connect');
      } finally {
        setIsConnecting(false);
      }
    },
    [disconnect, updateRemoteParticipants]
  );

  const toggleMute = useCallback(() => {
    if (!roomRef.current) {
      return;
    }

    const nextMuted = !isMuted;
    void roomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
    setIsMuted(nextMuted);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    if (!roomRef.current) {
      return;
    }

    const nextCameraOff = !isCameraOff;
    void roomRef.current.localParticipant.setCameraEnabled(!nextCameraOff);
    setIsCameraOff(nextCameraOff);
  }, [isCameraOff]);

  const startScreenShare = useCallback(async () => {
    if (!roomRef.current) {
      return;
    }

    await roomRef.current.localParticipant.setScreenShareEnabled(true);
    setIsScreenSharing(true);
  }, []);

  const stopScreenShare = useCallback(() => {
    if (!roomRef.current) {
      return;
    }

    void roomRef.current.localParticipant.setScreenShareEnabled(false);
    setIsScreenSharing(false);
  }, []);
  
  const updateParticipantMetadata = useCallback(async (identity: string, metadata: string) => {
    if (!roomRef.current) return;
    
    // LiveKit doesn't directly allow setting metadata for OTHER participants from the client SDK.
    // However, it's often done via a server action or data messages.
    // For "free mode" simplicity, we'll assume the host can send a data message that others listen to, 
    // OR if we have the right permissions, we use the server API.
    // Given the current setup, we'll use a fetch to our own server which will use the server SDK.
    
    try {
      const response = await fetch(`${API_BASE}/api/livekit/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomRef.current.name, identity, metadata }),
      });
      
      if (!response.ok) throw new Error('Failed to update metadata');
    } catch (err) {
      console.error('Error updating metadata:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    room,
    localParticipant,
    remoteParticipants,
    isConnected,
    isConnecting,
    error,
    isMuted,
    isCameraOff,
    isScreenSharing,
    connect,
    disconnect,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    updateParticipantMetadata,
  };
};

export default useStudioRoom;
