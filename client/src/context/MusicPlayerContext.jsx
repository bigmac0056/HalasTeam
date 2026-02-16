import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import API from '../api/api';

const MusicPlayerContext = createContext(null);

const emptyPlaybackState = {
  isPlaying: false,
  positionSec: 0,
  playlistId: null,
  currentTrackId: null,
  currentTrack: null,
  progressPercent: 0,
  currentTimeLabel: '0:00',
  durationLabel: '0:00',
  error: ''
};

const POLL_MS = 10000;

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const normalizePlaybackState = (data) => {
  if (!data || typeof data !== 'object') return { ...emptyPlaybackState };

  const positionSec = Number(data.positionSec || 0);
  const durationSec = Number(data.currentTrack?.durationSec || 0);
  const progressPercent = durationSec > 0 ? Math.min(100, (positionSec / durationSec) * 100) : 0;

  return {
    isPlaying: Boolean(data.isPlaying),
    positionSec,
    playlistId: data.playlistId || null,
    currentTrackId: data.currentTrackId || data.currentTrack?.id || null,
    currentTrack: data.currentTrack || null,
    progressPercent,
    currentTimeLabel: formatTime(positionSec),
    durationLabel: formatTime(durationSec),
    error: ''
  };
};

const isSpeakerDevice = (device) => {
  if (!device) return false;
  const name = String(device.name || '').toLowerCase();
  return device.type === 'Speaker' || (device.type === 'Socket' && (name.includes('speaker') || name.includes('колон')));
};

export function MusicPlayerProvider({ children }) {
  const [playback, setPlayback] = useState({ ...emptyPlaybackState });
  const [isBusy, setIsBusy] = useState(false);

  const audioRef = useRef(null);
  const syncTimerRef = useRef(null);
  const seekSyncRef = useRef({ lastSentAt: 0 });
  const blockedAutoplayRef = useRef(false);

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
  }

  const updateProgressFromAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const durationSec = Number.isFinite(audio.duration) ? audio.duration : Number(playback.currentTrack?.durationSec || 0);
    const currentSec = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const progressPercent = durationSec > 0 ? Math.min(100, (currentSec / durationSec) * 100) : 0;

    setPlayback((prev) => ({
      ...prev,
      positionSec: currentSec,
      progressPercent,
      currentTimeLabel: formatTime(currentSec),
      durationLabel: formatTime(durationSec)
    }));
  }, [playback.currentTrack?.durationSec]);

  const pauseBySystem = useCallback(async () => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPlayback((prev) => ({ ...prev, isPlaying: false }));
    try {
      await API.post('/music/playback/pause');
    } catch (error) {
      console.error('pauseBySystem failed:', error);
    }
  }, []);

  const applyServerState = useCallback(async (serverData, options = {}) => {
    const next = normalizePlaybackState(serverData);
    const audio = audioRef.current;

    setPlayback((prev) => ({ ...prev, ...next, error: '' }));

    if (!audio) return next;

    const nextUrl = next.currentTrack?.fileUrl;
    if (!nextUrl) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return next;
    }

    if (audio.src !== nextUrl) {
      audio.src = nextUrl;
      if (Number.isFinite(next.positionSec) && next.positionSec > 0) {
        audio.currentTime = next.positionSec;
      }
    }

    if (next.isPlaying || options.forcePlay) {
      if (blockedAutoplayRef.current && !options.forcePlay) {
        return next;
      }
      try {
        await audio.play();
        blockedAutoplayRef.current = false;
      } catch (error) {
        console.error('Audio play failed:', error);
        blockedAutoplayRef.current = true;
        setPlayback((prev) => ({
          ...prev,
          isPlaying: false,
          error: 'Браузер заблокировал автозапуск. Нажмите Play еще раз.'
        }));
      }
    } else {
      audio.pause();
      blockedAutoplayRef.current = false;
    }

    return next;
  }, []);

  const ensureSpeakerEnabled = useCallback(async () => {
    const res = await API.get('/devices');
    const devices = Array.isArray(res.data?.devices) ? res.data.devices : [];
    const hasActiveSpeaker = devices.some((device) => isSpeakerDevice(device) && device.status);

    if (!hasActiveSpeaker) {
      setPlayback((prev) => ({
        ...prev,
        error: 'Сначала включите колонку на панели устройств.'
      }));
      throw new Error('No active speaker');
    }
  }, []);

  const syncFromBackend = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await API.get('/music/playback/state');
      await applyServerState(res.data);
    } catch (error) {
      console.error('Failed to sync playback state:', error);
    }
  }, [applyServerState]);

  const runAction = useCallback(async (action, options = {}) => {
    setIsBusy(true);
    try {
      if (options.requireSpeaker) {
        await ensureSpeakerEnabled();
      }
      const res = await action();
      await applyServerState(res.data, options);
      return true;
    } catch (error) {
      if (error.message !== 'No active speaker' && !options.silentOnFailure) {
        console.error('Playback action failed:', error);
        setPlayback((prev) => ({
          ...prev,
          error: error.response?.data?.error || options.fallbackError || 'Ошибка воспроизведения'
        }));
      }
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [applyServerState, ensureSpeakerEnabled]);

  const play = useCallback(async () => {
    return runAction(() => API.post('/music/playback/play'), {
      requireSpeaker: true,
      forcePlay: true,
      fallbackError: 'Не удалось запустить воспроизведение'
    });
  }, [runAction]);

  const pause = useCallback(async () => {
    return runAction(() => API.post('/music/playback/pause'), {
      fallbackError: 'Не удалось поставить паузу'
    });
  }, [runAction]);

  const next = useCallback(async () => {
    return runAction(() => API.post('/music/playback/next'), {
      requireSpeaker: true,
      forcePlay: true,
      fallbackError: 'Нет следующего трека'
    });
  }, [runAction]);

  const prev = useCallback(async () => {
    return runAction(() => API.post('/music/playback/prev'), {
      requireSpeaker: true,
      forcePlay: true,
      fallbackError: 'Нет предыдущего трека'
    });
  }, [runAction]);

  const playPlaylist = useCallback(async (playlistId) => {
    return runAction(() => API.post('/music/playback/select-playlist', { playlistId }), {
      requireSpeaker: true,
      forcePlay: true,
      fallbackError: 'Не удалось запустить плейлист'
    });
  }, [runAction]);

  const playTrack = useCallback(async (track) => {
    if (!track?.id) return false;
    return runAction(
      () => API.post('/music/playback/state', {
        isPlaying: true,
        positionSec: 0,
        currentTrackId: track.id,
        playlistId: null
      }),
      {
        requireSpeaker: true,
        forcePlay: true,
        fallbackError: 'Не удалось запустить трек'
      }
    );
  }, [runAction]);

  const seek = useCallback(async (percent) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;

    const clampedPercent = Math.max(0, Math.min(100, Number(percent || 0)));
    const targetSec = (audio.duration * clampedPercent) / 100;
    audio.currentTime = targetSec;

    setPlayback((prev) => ({
      ...prev,
      positionSec: targetSec,
      progressPercent: clampedPercent,
      currentTimeLabel: formatTime(targetSec),
      durationLabel: formatTime(audio.duration)
    }));

    const now = Date.now();
    if (now - seekSyncRef.current.lastSentAt < 500) return;
    seekSyncRef.current.lastSentAt = now;

    try {
      await API.post('/music/playback/state', {
        isPlaying: !audio.paused,
        positionSec: Math.round(targetSec),
        currentTrackId: playback.currentTrackId,
        playlistId: playback.playlistId
      });
    } catch (error) {
      console.error('Seek sync failed:', error);
    }
  }, [playback.currentTrackId, playback.playlistId]);

  const advanceToNextOrStop = useCallback(async () => {
    const advanced = await runAction(() => API.post('/music/playback/next'), {
      requireSpeaker: true,
      forcePlay: true,
      silentOnFailure: true
    });

    if (!advanced) {
      await pauseBySystem();
    }
  }, [pauseBySystem, runAction]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTimeUpdate = () => updateProgressFromAudio();
    const onLoadedMetadata = () => {
      updateProgressFromAudio();
      setPlayback((prev) => ({ ...prev, error: '' }));
    };
    const onEnded = () => {
      void advanceToNextOrStop();
    };
    const onError = () => {
      setPlayback((prev) => ({ ...prev, isPlaying: false, error: 'Файл трека недоступен. Загрузите трек заново.' }));
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [advanceToNextOrStop, updateProgressFromAudio]);

  useEffect(() => {
    syncFromBackend();

    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    syncTimerRef.current = setInterval(() => {
      syncFromBackend();
    }, POLL_MS);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [syncFromBackend]);

  useEffect(() => {
    const resumeBlockedAutoplay = () => {
      if (!blockedAutoplayRef.current) return;
      blockedAutoplayRef.current = false;
      void runAction(() => API.post('/music/playback/play'), {
        requireSpeaker: true,
        forcePlay: true,
        fallbackError: 'Не удалось возобновить воспроизведение'
      });
    };

    window.addEventListener('pointerdown', resumeBlockedAutoplay, true);
    window.addEventListener('keydown', resumeBlockedAutoplay, true);
    return () => {
      window.removeEventListener('pointerdown', resumeBlockedAutoplay, true);
      window.removeEventListener('keydown', resumeBlockedAutoplay, true);
    };
  }, [runAction]);

  const value = useMemo(() => ({
    playback,
    isBusy,
    syncFromBackend,
    play,
    pause,
    next,
    prev,
    seek,
    playPlaylist,
    playTrack
  }), [isBusy, next, pause, play, playPlaylist, playTrack, playback, prev, seek, syncFromBackend]);

  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>;
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return context;
}
