const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { parseBuffer } = require('music-metadata');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadFile, deleteFile } = require('../services/storageService');

const router = express.Router();
const prisma = new PrismaClient();

const MAX_UPLOAD_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mp4'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_AUDIO_MIMES.has(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Допустимы только аудиофайлы (mp3, wav, ogg, m4a).'));
  }
});

router.use(authMiddleware);

const getMusicLimits = () => ({
  limitCount: Number(process.env.MUSIC_MAX_TRACKS_PER_USER || 500),
  limitBytes: Number(process.env.MUSIC_MAX_STORAGE_BYTES || 2147483648)
});

const getUserUsage = async (userId) => {
  const usage = await prisma.track.aggregate({
    where: { userId },
    _count: { id: true },
    _sum: { sizeBytes: true }
  });

  return {
    count: usage._count.id || 0,
    totalBytes: usage._sum.sizeBytes || 0
  };
};

router.get('/playlists', async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { userId: req.user.id },
      include: { _count: { select: { tracks: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(playlists);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при получении плейлистов' });
  }
});

router.post('/playlists', async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    if (!name) {
      return res.status(400).json({ error: 'Название плейлиста обязательно' });
    }

    const playlist = await prisma.playlist.create({
      data: { userId: req.user.id, name }
    });
    res.status(201).json(playlist);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при создании плейлиста' });
  }
});

router.patch('/playlists/:id', async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    if (!name) {
      return res.status(400).json({ error: 'Название плейлиста обязательно' });
    }

    const updated = await prisma.playlist.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { name }
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }

    const playlist = await prisma.playlist.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    res.json(playlist);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при обновлении плейлиста' });
  }
});

router.get('/playlists/:id', async (req, res) => {
  try {
    const playlist = await prisma.playlist.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        tracks: {
          include: { track: true },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }

    res.json(playlist);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при получении плейлиста' });
  }
});

router.delete('/playlists/:id', async (req, res) => {
  try {
    const deleted = await prisma.playlist.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }

    res.json({ success: true, message: 'Плейлист удален' });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при удалении плейлиста' });
  }
});

router.post('/tracks/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const { limitCount, limitBytes } = getMusicLimits();
    const usage = await getUserUsage(req.user.id);

    if (usage.count >= limitCount) {
      return res.status(400).json({ error: `Достигнут лимит по трекам (${limitCount})` });
    }

    if (usage.totalBytes + req.file.size > limitBytes) {
      return res.status(400).json({ error: 'Недостаточно доступного места для загрузки трека' });
    }

    let metadata = {};
    try {
      metadata = await parseBuffer(req.file.buffer, req.file.mimetype);
    } catch (e) {
      console.warn('Metadata parse failed:', e.message);
    }

    const { fileUrl, storageKey, sizeBytes, mimeType } = await uploadFile({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      userId: req.user.id
    });

    const track = await prisma.track.create({
      data: {
        userId: req.user.id,
        title: metadata.common?.title || req.file.originalname,
        artist: metadata.common?.artist || 'Неизвестный исполнитель',
        durationSec: metadata.format?.duration ? Math.round(metadata.format.duration) : 0,
        mimeType,
        sizeBytes,
        fileUrl,
        storageKey
      }
    });

    res.status(201).json(track);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при загрузке трека' });
  }
});

router.get('/tracks', async (req, res) => {
  try {
    const tracks = await prisma.track.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tracks);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при получении треков' });
  }
});

router.delete('/tracks/:id', async (req, res) => {
  try {
    const track = await prisma.track.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!track) {
      return res.status(404).json({ error: 'Трек не найден' });
    }

    await deleteFile(track.storageKey);
    await prisma.track.delete({ where: { id: track.id } });

    res.json({ success: true, message: 'Трек удален' });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при удалении трека' });
  }
});

router.post('/playlists/:id/tracks', async (req, res) => {
  try {
    const { trackId } = req.body;
    const playlistId = req.params.id;

    if (!trackId) {
      return res.status(400).json({ error: 'trackId обязателен' });
    }

    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, userId: req.user.id }
    });
    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }

    const track = await prisma.track.findFirst({
      where: { id: trackId, userId: req.user.id }
    });
    if (!track) {
      return res.status(404).json({ error: 'Трек не найден' });
    }

    const lastTrack = await prisma.playlistTrack.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' }
    });
    const position = (lastTrack?.position ?? -1) + 1;

    const relation = await prisma.playlistTrack.create({
      data: { playlistId, trackId, position }
    });
    res.status(201).json(relation);
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Трек уже добавлен в этот плейлист' });
    }
    res.status(500).json({ error: 'Ошибка при добавлении трека в плейлист' });
  }
});

router.delete('/playlists/:id/tracks/:trackId', async (req, res) => {
  try {
    const playlist = await prisma.playlist.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }

    const deleted = await prisma.playlistTrack.deleteMany({
      where: { playlistId: req.params.id, trackId: req.params.trackId }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Трек не найден в плейлисте' });
    }

    res.json({ success: true, message: 'Трек удален из плейлиста' });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при удалении трека из плейлиста' });
  }
});

router.patch('/playlists/:id/reorder', async (req, res) => {
  try {
    const { trackIds } = req.body;
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      return res.status(400).json({ error: 'trackIds должен быть непустым массивом' });
    }

    const playlist = await prisma.playlist.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!playlist) {
      return res.status(404).json({ error: 'Плейлист не найден' });
    }

    const existing = await prisma.playlistTrack.findMany({
      where: { playlistId: req.params.id }
    });
    const existingIds = existing.map((item) => item.trackId).sort();
    const newIds = [...trackIds].sort();
    if (JSON.stringify(existingIds) !== JSON.stringify(newIds)) {
      return res.status(400).json({ error: 'Список trackIds не совпадает с треками плейлиста' });
    }

    await prisma.$transaction(
      trackIds.map((trackId, index) =>
        prisma.playlistTrack.updateMany({
          where: { playlistId: req.params.id, trackId },
          data: { position: index }
        })
      )
    );

    res.json({ success: true, message: 'Порядок треков обновлен' });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при изменении порядка треков' });
  }
});

router.get('/storage/usage', async (req, res) => {
  try {
    const { count, totalBytes } = await getUserUsage(req.user.id);
    const { limitCount, limitBytes } = getMusicLimits();
    const remainingBytes = Math.max(0, limitBytes - totalBytes);

    const avg128Bytes = 3.5 * 1024 * 1024;
    const avg320Bytes = 9 * 1024 * 1024;

    res.json({
      totalBytes,
      count,
      limitBytes,
      limitCount,
      remainingBytes,
      estimateMoreTracks128kbps: Math.floor(remainingBytes / avg128Bytes),
      estimateMoreTracks320kbps: Math.floor(remainingBytes / avg320Bytes)
    });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при получении статистики хранилища' });
  }
});

router.get('/playback/state', async (req, res) => {
  try {
    const state = await prisma.userPlaybackState.findUnique({
      where: { userId: req.user.id }
    });

    if (state && state.currentTrackId) {
      const track = await prisma.track.findUnique({ where: { id: state.currentTrackId } });
      return res.json({ ...state, currentTrack: track });
    }

    res.json(state || { isPlaying: false, positionSec: 0 });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при получении состояния плеера' });
  }
});

router.post('/playback/state', async (req, res) => {
  try {
    const { isPlaying, positionSec, currentTrackId, playlistId } = req.body;
    const state = await prisma.userPlaybackState.upsert({
      where: { userId: req.user.id },
      update: { isPlaying, positionSec, currentTrackId, playlistId },
      create: { userId: req.user.id, isPlaying, positionSec, currentTrackId, playlistId }
    });
    res.json(state);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка при обновлении состояния плеера' });
  }
});

router.post('/playback/play', async (req, res) => {
  try {
    let state = await prisma.userPlaybackState.findUnique({ where: { userId: req.user.id } });

    // If no state or no track, try to find a default playlist
    if (!state || !state.currentTrackId) {
      const playlist = await prisma.playlist.findFirst({
        where: { userId: req.user.id },
        include: { tracks: { orderBy: { position: 'asc' }, take: 1 } }
      });

      if (playlist && playlist.tracks.length > 0) {
        state = await prisma.userPlaybackState.upsert({
          where: { userId: req.user.id },
          create: {
            userId: req.user.id,
            playlistId: playlist.id,
            currentTrackId: playlist.tracks[0].trackId,
            isPlaying: true
          },
          update: {
            playlistId: playlist.id,
            currentTrackId: playlist.tracks[0].trackId,
            isPlaying: true
          }
        });
      } else {
        // Fallback: just play random track from library?
        // For now return error if nothing to play
        return res.status(400).json({ error: 'Нет активного трека или плейлиста' });
      }
    } else {
      state = await prisma.userPlaybackState.update({
        where: { userId: req.user.id },
        data: { isPlaying: true }
      });
    }

    // Return full track info
    const track = await prisma.track.findUnique({ where: { id: state.currentTrackId } });
    res.json({ ...state, currentTrack: track });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/playback/pause', async (req, res) => {
  try {
    const state = await prisma.userPlaybackState.update({
      where: { userId: req.user.id },
      data: { isPlaying: false }
    });
    const track = state.currentTrackId ? await prisma.track.findUnique({ where: { id: state.currentTrackId } }) : null;
    res.json({ ...state, currentTrack: track });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/playback/next', async (req, res) => {
  try {
    const state = await prisma.userPlaybackState.findUnique({ where: { userId: req.user.id } });
    if (!state || !state.playlistId || !state.currentTrackId) {
      return res.status(400).json({ error: 'Нет активного плейлиста' });
    }

    const currentPt = await prisma.playlistTrack.findFirst({
      where: { playlistId: state.playlistId, trackId: state.currentTrackId }
    });

    if (!currentPt) return res.status(400).json({ error: 'Трек не найден в плейлисте' });

    // Find next track
    let nextPt = await prisma.playlistTrack.findFirst({
      where: { playlistId: state.playlistId, position: { gt: currentPt.position } },
      orderBy: { position: 'asc' }
    });

    // Loop to start
    if (!nextPt) {
      nextPt = await prisma.playlistTrack.findFirst({
        where: { playlistId: state.playlistId },
        orderBy: { position: 'asc' }
      });
    }

    if (!nextPt) return res.status(400).json({ error: 'Плейлист пуст' });

    const updatedState = await prisma.userPlaybackState.update({
      where: { userId: req.user.id },
      data: { currentTrackId: nextPt.trackId, positionSec: 0, isPlaying: true }
    });

    const track = await prisma.track.findUnique({ where: { id: nextPt.trackId } });
    res.json({ ...updatedState, currentTrack: track });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/playback/prev', async (req, res) => {
  try {
    const state = await prisma.userPlaybackState.findUnique({ where: { userId: req.user.id } });
    if (!state || !state.playlistId || !state.currentTrackId) {
      return res.status(400).json({ error: 'Нет активного плейлиста' });
    }

    const currentPt = await prisma.playlistTrack.findFirst({
      where: { playlistId: state.playlistId, trackId: state.currentTrackId }
    });

    if (!currentPt) return res.status(400).json({ error: 'Трек не найден в плейлисте' });

    // Find prev track
    let prevPt = await prisma.playlistTrack.findFirst({
      where: { playlistId: state.playlistId, position: { lt: currentPt.position } },
      orderBy: { position: 'desc' }
    });

    // Loop to end
    if (!prevPt) {
      prevPt = await prisma.playlistTrack.findFirst({
        where: { playlistId: state.playlistId },
        orderBy: { position: 'desc' }
      });
    }

    if (!prevPt) return res.status(400).json({ error: 'Плейлист пуст' });

    const updatedState = await prisma.userPlaybackState.update({
      where: { userId: req.user.id },
      data: { currentTrackId: prevPt.trackId, positionSec: 0, isPlaying: true }
    });

    const track = await prisma.track.findUnique({ where: { id: prevPt.trackId } });
    res.json({ ...updatedState, currentTrack: track });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/playback/select-playlist', async (req, res) => {
  try {
    const { playlistId, trackId } = req.body;
    if (!playlistId) return res.status(400).json({ error: 'playlistId required' });

    let startTrackId = trackId;
    if (!startTrackId) {
      const firstPt = await prisma.playlistTrack.findFirst({
        where: { playlistId },
        orderBy: { position: 'asc' }
      });
      if (!firstPt) return res.status(400).json({ error: 'Плейлист пуст' });
      startTrackId = firstPt.trackId;
    }

    const state = await prisma.userPlaybackState.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, playlistId, currentTrackId: startTrackId, isPlaying: true, positionSec: 0 },
      update: { playlistId, currentTrackId: startTrackId, isPlaying: true, positionSec: 0 }
    });

    const track = await prisma.track.findUnique({ where: { id: startTrackId } });
    res.json({ ...state, currentTrack: track });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой. Максимум 20MB' });
    }
    return res.status(400).json({ error: 'Ошибка загрузки файла' });
  }

  if (err) {
    return res.status(400).json({ error: err.message || 'Некорректный файл' });
  }

  next();
});

module.exports = router;
