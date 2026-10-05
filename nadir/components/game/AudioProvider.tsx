'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AudioEngine, DEFAULT_AUDIO_SETTINGS, loadAudioSettings, saveAudioSettings, type AudioEvent, type AudioSettings } from '@/lib/audio/engine';

interface AudioApi {
  play: (event: AudioEvent, opts?: { gain?: number; rate?: number }) => void;
  settings: AudioSettings;
  update: (patch: Partial<AudioSettings>) => void;
  unlock: () => void;
  unlocked: boolean;
  startMusic: () => void;
  stopMusic: () => void;
}

const Ctx = createContext<AudioApi | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef<AudioEngine | null>(null);
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const s = loadAudioSettings();
    setSettings(s);
    engineRef.current = new AudioEngine(s);
    const unlockOnGesture = () => {
      engineRef.current?.unlock();
      setUnlocked(true);
    };
    window.addEventListener('pointerdown', unlockOnGesture, { once: true, passive: true });
    window.addEventListener('keydown', unlockOnGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
    };
  }, []);

  const update = useCallback((patch: Partial<AudioSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveAudioSettings(next);
      engineRef.current?.setSettings(next);
      return next;
    });
  }, []);

  const api = useMemo<AudioApi>(
    () => ({
      play: (event, opts) => engineRef.current?.play(event, opts),
      settings,
      update,
      unlock: () => {
        engineRef.current?.unlock();
        setUnlocked(true);
      },
      unlocked,
      startMusic: () => engineRef.current?.startMusic(),
      stopMusic: () => engineRef.current?.stopMusic(),
    }),
    [settings, update, unlocked],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAudio(): AudioApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAudio must be used inside AudioProvider');
  return ctx;
}
