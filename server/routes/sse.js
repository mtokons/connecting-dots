const express = require('express');
const router = express.Router();

// Store connected clients
const clients = new Set();

// SSE endpoint for real-time updates
router.get('/live', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to Connecting Dots live feed' })}\n\n`);

  // Add client
  clients.add(res);
  console.log(`📡 SSE client connected (${clients.size} total)`);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clients.delete(res);
    clearInterval(heartbeat);
    console.log(`📡 SSE client disconnected (${clients.size} total)`);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

// Broadcast result update
function broadcastResultUpdate(constituencyId, result) {
  broadcast({
    type: 'result_update',
    constituency_id: constituencyId,
    data: result,
    timestamp: new Date().toISOString()
  });
}

// Broadcast prediction update
function broadcastPredictionUpdate(predictions) {
  broadcast({
    type: 'prediction_update',
    data: predictions,
    timestamp: new Date().toISOString()
  });
}

// Broadcast breaking news
function broadcastBreaking(message) {
  broadcast({
    type: 'breaking',
    message,
    timestamp: new Date().toISOString()
  });
}

module.exports = router;
module.exports.broadcast = broadcast;
module.exports.broadcastResultUpdate = broadcastResultUpdate;
module.exports.broadcastPredictionUpdate = broadcastPredictionUpdate;
module.exports.broadcastBreaking = broadcastBreaking;
