import { useState, useCallback } from 'react';
import type { Overlay } from '../types';

interface UseOverlaysReturn {
  overlays: Overlay[];
  addOverlay: (overlay: Overlay) => void;
  removeOverlay: (id: string) => void;
  updateOverlay: (id: string, updates: Partial<Overlay>) => void;
  toggleOverlayVisibility: (id: string) => void;
}

const useOverlays = (): UseOverlaysReturn => {
  const [overlays, setOverlays] = useState<Overlay[]>([]);

  const addOverlay = useCallback((overlay: Overlay) => {
    setOverlays((prev) => [...prev, overlay]);
  }, []);

  const removeOverlay = useCallback((id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const updateOverlay = useCallback((id: string, updates: Partial<Overlay>) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  }, []);

  const toggleOverlayVisibility = useCallback((id: string) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, visible: !o.visible } : o)));
  }, []);

  return { overlays, addOverlay, removeOverlay, updateOverlay, toggleOverlayVisibility };
};

export default useOverlays;
