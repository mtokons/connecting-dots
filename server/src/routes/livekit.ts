import { Router, Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';

const router = Router();

// POST /api/livekit/token
router.post('/token', async (req: Request, res: Response) => {
  const { roomId, participantName, role, city } = req.body as {
    roomId?: string;
    participantName?: string;
    role?: 'host' | 'co-host' | 'guest';
    city?: string;
  };

  if (!roomId || !participantName || !role) {
    res.status(400).json({ error: 'roomId, participantName, and role are required' });
    return;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret) {
    res.status(500).json({ error: 'LiveKit API credentials not configured' });
    return;
  }

  try {
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: JSON.stringify({
        role,
        city: city || '',
        isOnStage: role === 'host' || role === 'co-host',
      }),
    });

    token.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    res.json({
      token: jwt,
      roomId,
      livekitUrl,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to generate token',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// POST /api/livekit/metadata
router.post('/metadata', async (req: Request, res: Response) => {
  const { roomId, identity, metadata } = req.body as {
    roomId?: string;
    identity?: string;
    metadata?: string;
  };

  if (!roomId || !identity || !metadata) {
    res.status(400).json({ error: 'roomId, identity, and metadata are required' });
    return;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    res.status(500).json({ error: 'LiveKit API credentials not configured' });
    return;
  }

  try {
    const { RoomServiceClient } = await import('livekit-server-sdk');
    const roomService = new RoomServiceClient(process.env.LIVEKIT_URL!, apiKey, apiSecret);
    
    await roomService.updateParticipant(roomId, identity, metadata);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to update metadata',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// GET /api/livekit/rooms
router.get('/rooms', async (_req: Request, res: Response) => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    res.status(500).json({ error: 'LiveKit API credentials not configured' });
    return;
  }

  try {
    const { RoomServiceClient } = await import('livekit-server-sdk');
    const roomService = new RoomServiceClient(process.env.LIVEKIT_URL!, apiKey, apiSecret);
    
    const rooms = await roomService.listRooms();
    
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to list rooms',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// GET /api/livekit/health
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Connecting Dot',
    poweredBy: 'SCCG',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
