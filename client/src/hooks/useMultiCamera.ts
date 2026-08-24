import { useState, useEffect, useCallback, useRef } from 'react';
import type { CameraSource } from '../types';

const LABELS_STORAGE_KEY = 'connectingdot_camera_labels';

function loadSavedLabels(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LABELS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLabels(labels: Record<string, string>) {
  try {
    localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(labels));
  } catch { /* quota */ }
}

const resolutionConstraints: Record<string, MediaTrackConstraints> = {
  '720p': { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
  '4k': { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 } },
};

interface UseMultiCameraReturn {
  cameras: CameraSource[];
  availableDevices: MediaDeviceInfo[];
  addCamera: (deviceId: string, label?: string) => Promise<void>;
  removeCamera: (id: string) => void;
  toggleCamera: (id: string) => void;
  setProgramCamera: (id: string) => void;
  setLabel: (id: string, label: string) => void;
  setResolution: (id: string, res: '720p' | '1080p' | '4k') => Promise<void>;
  getProgramCamera: () => CameraSource | undefined;
  getEnabledCameras: () => CameraSource[];
  refreshDevices: () => Promise<void>;
}

let cameraCounter = 0;

const useMultiCamera = (): UseMultiCameraReturn => {
  const [cameras, setCameras] = useState<CameraSource[]>([]);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const labelsRef = useRef<Record<string, string>>(loadSavedLabels());

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices.filter((d) => d.kind === 'videoinput'));
    } catch {
      setAvailableDevices([]);
    }
  }, []);

  // Enumerate devices on mount and listen for changes
  useEffect(() => {
    void refreshDevices();

    const handleDeviceChange = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  const addCamera = useCallback(
    async (deviceId: string, label?: string) => {
      // Don't add duplicate device
      if (cameras.some((c) => c.deviceId === deviceId)) return;

      const id = `cam-${++cameraCounter}-${Date.now()}`;
      const savedLabel = labelsRef.current[deviceId];
      const device = availableDevices.find((d) => d.deviceId === deviceId);
      const fallbackLabel = device?.label || `Camera ${cameraCounter}`;
      const finalLabel = label || savedLabel || fallbackLabel;
      const resolution: CameraSource['resolution'] = '1080p';

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, ...resolutionConstraints[resolution] },
        });
        const track = stream.getVideoTracks()[0] ?? null;
        const isFirst = cameras.length === 0;

        const cam: CameraSource = {
          id,
          deviceId,
          label: finalLabel,
          track,
          stream,
          enabled: true,
          isProgram: isFirst,
          resolution,
        };

        setCameras((prev) => [...prev, cam]);

        // Save label
        labelsRef.current[deviceId] = finalLabel;
        saveLabels(labelsRef.current);
      } catch (err) {
        console.error(`Failed to open camera ${deviceId}:`, err);
      }
    },
    [cameras, availableDevices]
  );

  const removeCamera = useCallback((id: string) => {
    setCameras((prev) => {
      const cam = prev.find((c) => c.id === id);
      if (cam) {
        cam.track?.stop();
        cam.stream?.getTracks().forEach((t) => t.stop());
      }
      const remaining = prev.filter((c) => c.id !== id);
      // If removed camera was program, promote first enabled
      if (cam?.isProgram && remaining.length > 0) {
        const first = remaining.find((c) => c.enabled) ?? remaining[0];
        return remaining.map((c) => ({ ...c, isProgram: c.id === first.id }));
      }
      return remaining;
    });
  }, []);

  const toggleCamera = useCallback((id: string) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newEnabled = !c.enabled;
        if (!newEnabled && c.track) {
          c.track.enabled = false;
        } else if (newEnabled && c.track) {
          c.track.enabled = true;
        }
        return { ...c, enabled: newEnabled };
      })
    );
  }, []);

  const setProgramCamera = useCallback((id: string) => {
    setCameras((prev) => prev.map((c) => ({ ...c, isProgram: c.id === id })));
  }, []);

  const setLabel = useCallback((id: string, label: string) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        labelsRef.current[c.deviceId] = label;
        saveLabels(labelsRef.current);
        return { ...c, label };
      })
    );
  }, []);

  const setResolution = useCallback(
    async (id: string, res: '720p' | '1080p' | '4k') => {
      const cam = cameras.find((c) => c.id === id);
      if (!cam) return;

      // Stop old track
      cam.track?.stop();
      cam.stream?.getTracks().forEach((t) => t.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: cam.deviceId }, ...resolutionConstraints[res] },
        });
        const track = stream.getVideoTracks()[0] ?? null;

        setCameras((prev) =>
          prev.map((c) => (c.id === id ? { ...c, track, stream, resolution: res } : c))
        );
      } catch (err) {
        console.error(`Failed to change resolution for ${id}:`, err);
      }
    },
    [cameras]
  );

  const getProgramCamera = useCallback(() => cameras.find((c) => c.isProgram && c.enabled), [cameras]);

  const getEnabledCameras = useCallback(() => cameras.filter((c) => c.enabled), [cameras]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cameras.forEach((cam) => {
        cam.track?.stop();
        cam.stream?.getTracks().forEach((t) => t.stop());
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    cameras,
    availableDevices,
    addCamera,
    removeCamera,
    toggleCamera,
    setProgramCamera,
    setLabel,
    setResolution,
    getProgramCamera,
    getEnabledCameras,
    refreshDevices,
  };
};

export default useMultiCamera;
