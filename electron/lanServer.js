/**
 * ALTER EGO - LAN Peer-to-Peer Server
 *
 * Enables two ALTER EGO instances on the same local network to connect and
 * have their AIs converse with each other. One computer's AI output becomes
 * the other's input, creating an organic cross-machine dialogue.
 *
 * Architecture:
 *   - UDP broadcast for peer discovery (multicast on port 45690)
 *   - WebSocket for bidirectional message transport (port 45691)
 *   - Limited to exactly two peers to prevent multi-party crosstalk
 *   - Random role assignment (initiator vs. responder) so the user
 *     doesn't have to start the conversation
 *
 * This module runs entirely in the Electron main process (Node.js)
 * and communicates with the renderer via IPC.
 */

const dgram = require('dgram');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

// ── Constants ──
const DISCOVERY_PORT = 45690;
const WS_PORT = 45691;
const MULTICAST_ADDR = '239.45.69.0'; // Link-local multicast group
const HEARTBEAT_INTERVAL_MS = 3000;
const PEER_TIMEOUT_MS = 10000;
const PROTOCOL_VERSION = 1;

// ── State ──
let instanceId = crypto.randomUUID();
// discoveryRecvSocket & discoverySendSockets are managed in startDiscovery()
let wsServer = null;
let heartbeatTimer = null;
let peerConnection = null; // Active WebSocket to remote peer (socket object)
let peerConnectionSide = null; // 'client' | 'server' for frame masking
let peerInfo = null;       // { id, name, ip, port, role }
let isRunning = false;
let ipcSender = null;      // Reference to BrowserWindow.webContents for IPC
let localPersonaName = 'ALTER EGO';
let localRole = null;      // 'initiator' | 'responder' — assigned by random tiebreak
let rendererNotified = false; // Whether we've sent lan:connected to the renderer

// Known peers discovered via UDP (id -> { id, name, ip, port, lastSeen })
const discoveredPeers = new Map();

/**
 * Get all non-internal IPv4 addresses on the machine, with subnet info.
 * Returns [{ address, netmask, broadcastAddr }]
 */
function getLocalInterfaces() {
  const interfaces = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Calculate the directed broadcast address for this subnet
        const addrParts = iface.address.split('.').map(Number);
        const maskParts = iface.netmask.split('.').map(Number);
        const broadcastParts = addrParts.map((a, i) => (a | (~maskParts[i] & 0xff)));
        results.push({
          address: iface.address,
          netmask: iface.netmask,
          broadcastAddr: broadcastParts.join('.'),
          name,
        });
      }
    }
  }
  return results;
}

/**
 * Get all non-internal IPv4 addresses on the machine (flat list).
 */
function getLocalIPs() {
  return getLocalInterfaces().map(i => i.address);
}

// ────────────────────────────────────────────────
// WebSocket Helpers (reuse the raw RFC 6455 approach from telemetry)
// ────────────────────────────────────────────────

function buildWsFrame(payload, opcode = 0x1) {
  const data = Buffer.from(payload, 'utf-8');
  const len = data.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, data]);
}

function parseWsFrame(buf) {
  const opcode = buf[0] & 0x0f;
  const masked = !!(buf[1] & 0x80);
  let payloadLen = buf[1] & 0x7f;
  let offset = 2;
  if (payloadLen === 126) { payloadLen = buf.readUInt16BE(2); offset = 4; }
  else if (payloadLen === 127) { payloadLen = Number(buf.readBigUInt64BE(2)); offset = 10; }
  let maskKey = null;
  if (masked) { maskKey = buf.slice(offset, offset + 4); offset += 4; }
  const payload = Buffer.alloc(payloadLen);
  for (let i = 0; i < payloadLen; i++) {
    payload[i] = masked ? buf[offset + i] ^ maskKey[i % 4] : buf[offset + i];
  }
  return { opcode, payload };
}

// Mask a payload (client frames must be masked per RFC 6455)
function buildMaskedWsFrame(payload, opcode = 0x1) {
  const data = Buffer.from(payload, 'utf-8');
  const len = data.length;
  const maskKey = crypto.randomBytes(4);

  let headerSize;
  let header;
  if (len < 126) {
    headerSize = 2;
    header = Buffer.alloc(headerSize + 4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | len; // Mask bit set
    maskKey.copy(header, 2);
  } else if (len < 65536) {
    headerSize = 4;
    header = Buffer.alloc(headerSize + 4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
    maskKey.copy(header, 4);
  } else {
    headerSize = 10;
    header = Buffer.alloc(headerSize + 4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(len), 2);
    maskKey.copy(header, 10);
  }

  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    masked[i] = data[i] ^ maskKey[i % 4];
  }
  return Buffer.concat([header, masked]);
}

// ────────────────────────────────────────────────
// UDP Peer Discovery
// ────────────────────────────────────────────────
// Strategy: create one socket per network interface so we can reliably
// send AND receive on each adapter. Windows is especially picky about
// multicast group membership being bound to a specific interface and
// about `255.255.255.255` broadcasts vs directed broadcasts.
// We also compute the subnet-directed broadcast address per interface
// (e.g. 192.168.1.255) which is far more reliable than the limited
// broadcast address on modern Windows.

let discoveryRecvSocket = null; // Single shared receiving socket
let discoverySendSockets = [];  // One send socket per interface

function startDiscovery() {
  const ifaces = getLocalInterfaces();
  if (ifaces.length === 0) {
    console.warn('[LAN] No non-internal IPv4 interfaces found. Discovery will not work.');
    return;
  }

  console.log(`[LAN] Found ${ifaces.length} network interface(s):`);
  ifaces.forEach(i => console.log(`  - ${i.name}: ${i.address} (broadcast: ${i.broadcastAddr})`));

  // ── Receiving socket ──
  // Bind to 0.0.0.0 so we hear packets from any interface, including
  // both multicast deliveries and directed/limited broadcasts.
  discoveryRecvSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  discoveryRecvSocket.on('message', (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.protocol !== 'alterego-lan' || data.version !== PROTOCOL_VERSION) return;
      if (data.instanceId === instanceId) return; // Ignore own broadcasts

      const peerId = data.instanceId;
      const now = Date.now();

      if (data.type === 'heartbeat') {
        const isNew = !discoveredPeers.has(peerId);
        discoveredPeers.set(peerId, {
          id: peerId,
          name: data.personaName || 'Unknown',
          ip: rinfo.address,
          port: data.wsPort || WS_PORT,
          lastSeen: now,
        });

        if (isNew) {
          notifyRenderer('lan:peer-discovered', {
            id: peerId,
            name: data.personaName,
            ip: rinfo.address,
          });
          console.log(`[LAN] Discovered peer: ${data.personaName} at ${rinfo.address}`);
        }
      }

      if (data.type === 'goodbye') {
        discoveredPeers.delete(peerId);
        if (peerInfo && peerInfo.id === peerId) {
          handlePeerDisconnect('Peer left the network');
        }
        notifyRenderer('lan:peer-lost', { id: peerId });
        console.log(`[LAN] Peer departed: ${peerId}`);
      }
    } catch {
      // Ignore malformed packets
    }
  });

  discoveryRecvSocket.on('error', (err) => {
    console.error('[LAN] Discovery receive socket error:', err.message);
  });

  discoveryRecvSocket.bind(DISCOVERY_PORT, '0.0.0.0', () => {
    console.log(`[LAN] Discovery receive socket bound to 0.0.0.0:${DISCOVERY_PORT}`);

    // Join the multicast group on every interface so we don't miss
    // packets arriving via any adapter.
    for (const iface of ifaces) {
      try {
        discoveryRecvSocket.addMembership(MULTICAST_ADDR, iface.address);
        console.log(`[LAN] Joined multicast ${MULTICAST_ADDR} on ${iface.address} (${iface.name})`);
      } catch (err) {
        console.warn(`[LAN] Multicast join failed on ${iface.address} (${iface.name}): ${err.message}`);
      }
    }

    discoveryRecvSocket.setBroadcast(true);
  });

  // ── Per-interface send sockets ──
  // Each socket is bound to a specific interface address so broadcasts
  // and multicast sends go out the correct adapter.
  for (const iface of ifaces) {
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    sock.on('error', (err) => {
      console.warn(`[LAN] Send socket error on ${iface.address}: ${err.message}`);
    });
    sock.bind(0, iface.address, () => {
      sock.setBroadcast(true);
      try {
        sock.setMulticastTTL(2);
        sock.setMulticastInterface(iface.address);
      } catch (err) {
        console.warn(`[LAN] Multicast setup on ${iface.address}: ${err.message}`);
      }
      console.log(`[LAN] Send socket ready on ${iface.address}`);
    });
    discoverySendSockets.push({ sock, iface });
  }

  // Periodic heartbeat
  heartbeatTimer = setInterval(() => {
    sendHeartbeat();
    pruneStale();
  }, HEARTBEAT_INTERVAL_MS);

  // Send initial heartbeat immediately (with a short delay for sockets to bind)
  setTimeout(sendHeartbeat, 500);
}

function sendHeartbeat() {
  const msg = JSON.stringify({
    protocol: 'alterego-lan',
    version: PROTOCOL_VERSION,
    type: 'heartbeat',
    instanceId,
    personaName: localPersonaName,
    wsPort: WS_PORT,
    timestamp: Date.now(),
  });
  const buf = Buffer.from(msg);

  for (const { sock, iface } of discoverySendSockets) {
    try {
      // 1. Multicast — reliable if the network/OS supports it
      sock.send(buf, 0, buf.length, DISCOVERY_PORT, MULTICAST_ADDR);
    } catch (err) {
      console.warn(`[LAN] Multicast send failed on ${iface.address}: ${err.message}`);
    }
    try {
      // 2. Subnet-directed broadcast (e.g. 192.168.1.255) — works even
      //    when multicast is blocked, and is more reliable than 255.255.255.255
      sock.send(buf, 0, buf.length, DISCOVERY_PORT, iface.broadcastAddr);
    } catch (err) {
      console.warn(`[LAN] Directed broadcast failed on ${iface.address}: ${err.message}`);
    }
  }
}

function sendGoodbye() {
  const msg = JSON.stringify({
    protocol: 'alterego-lan',
    version: PROTOCOL_VERSION,
    type: 'goodbye',
    instanceId,
  });
  const buf = Buffer.from(msg);
  for (const { sock, iface } of discoverySendSockets) {
    try {
      sock.send(buf, 0, buf.length, DISCOVERY_PORT, MULTICAST_ADDR);
      sock.send(buf, 0, buf.length, DISCOVERY_PORT, iface.broadcastAddr);
    } catch { /* best effort */ }
  }
}

function pruneStale() {
  const now = Date.now();
  for (const [id, peer] of discoveredPeers) {
    if (now - peer.lastSeen > PEER_TIMEOUT_MS) {
      discoveredPeers.delete(id);
      if (peerInfo && peerInfo.id === id) {
        handlePeerDisconnect('Peer timed out');
      }
      notifyRenderer('lan:peer-lost', { id });
      console.log(`[LAN] Peer timed out: ${id}`);
    }
  }
}

// ────────────────────────────────────────────────
// WebSocket Transport (Server side — accepts incoming peer connections)
// ────────────────────────────────────────────────

function startWsServer() {
  wsServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'alterego-lan',
      instanceId,
      connected: !!peerConnection,
    }));
  });

  wsServer.on('upgrade', (req, socket) => {
    // Reject if already connected to a peer (2-peer limit)
    if (peerConnection) {
      socket.write('HTTP/1.1 409 Conflict\r\n\r\n');
      socket.destroy();
      return;
    }

    // Standard WebSocket handshake
    const key = (req.headers['sec-websocket-key'] || '').trim();
    if (!key) { socket.destroy(); return; }
    const accept = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );

    // Try to pre-populate peerInfo by matching the connecting IP to a
    // known discovered peer. This gives us a name for logs before the
    // identity exchange completes.
    const remoteIP = socket.remoteAddress?.replace(/^::ffff:/, '') ?? '';
    for (const peer of discoveredPeers.values()) {
      if (peer.ip === remoteIP) {
        peerInfo = { ...peer };
        break;
      }
    }

    handleNewPeerConnection(socket, 'server');
  });

  wsServer.listen(WS_PORT, '0.0.0.0', () => {
    console.log(`[LAN] WebSocket server listening on port ${WS_PORT}`);
  });

  wsServer.on('error', (err) => {
    console.error('[LAN] WebSocket server error:', err.message);
  });
}

// ────────────────────────────────────────────────
// WebSocket Transport (Client side — connect to a discovered peer)
// ────────────────────────────────────────────────

function connectToPeer(peerId) {
  const peer = discoveredPeers.get(peerId);
  if (!peer) {
    console.error(`[LAN] Unknown peer: ${peerId}`);
    return false;
  }

  if (peerConnection) {
    console.warn('[LAN] Already connected to a peer.');
    return false;
  }

  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    let settled = false;
    let timeout = null;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(value);
    };

    socket.connect(peer.port, peer.ip, () => {
      // Send WebSocket upgrade request
      const wsKey = crypto.randomBytes(16).toString('base64');
      socket.write(
        `GET / HTTP/1.1\r\n` +
        `Host: ${peer.ip}:${peer.port}\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${wsKey}\r\n` +
        `Sec-WebSocket-Version: 13\r\n\r\n`
      );
    });

    let handshakeComplete = false;
    let buffer = Buffer.alloc(0);

    // Temporary handler for the WebSocket upgrade handshake only.
    // Once the handshake succeeds, this listener is removed and
    // handleNewPeerConnection() installs the permanent data handler,
    // preventing the duplicate-handler bug where every frame was
    // processed twice.
    const handshakeHandler = (data) => {
      if (!handshakeComplete) {
        buffer = Buffer.concat([buffer, data]);
        const idx = buffer.indexOf('\r\n\r\n');
        if (idx !== -1) {
          const header = buffer.slice(0, idx).toString();
          if (header.includes('101')) {
            handshakeComplete = true;
            peerInfo = { ...peer, role: 'client' };

            // Remove this temporary handler before adding the permanent one
            socket.removeListener('data', handshakeHandler);

            handleNewPeerConnection(socket, 'client');

            // Process any remaining data after the HTTP header
            const remaining = buffer.slice(idx + 4);
            if (remaining.length > 0) {
              handleWsData(socket, remaining);
            }
            finish(true);
          } else {
            console.error('[LAN] Peer rejected connection:', header.split('\r\n')[0]);
            socket.destroy();
            finish(false);
          }
        }
      }
    };
    socket.on('data', handshakeHandler);

    socket.on('error', (err) => {
      console.error('[LAN] Connection error:', err.message);
      finish(false);
    });

    socket.on('close', () => {
      if (peerConnection === socket) {
        handlePeerDisconnect('Connection closed');
      }
    });

    // Timeout the connection attempt
    timeout = setTimeout(() => {
      if (!handshakeComplete) {
        socket.destroy();
        finish(false);
      }
    }, 5000);
  });
}

// ────────────────────────────────────────────────
// Peer Connection Management
// ────────────────────────────────────────────────

function handleNewPeerConnection(socket, side) {
  peerConnection = socket;
  peerConnectionSide = side;
  wsBuffer = Buffer.alloc(0);

  // Assign role via deterministic tiebreak: lower instance ID = initiator.
  // Both sides compute this independently using the same logic.
  // The "initiator" sends the first message to kick off the AI-to-AI conversation.
  localRole = instanceId < (peerInfo?.id ?? '') ? 'initiator' : 'responder';

  // Both sides send identity so the remote peer knows our instanceId and
  // persona name. The server side may not yet know the client's ID (peerInfo
  // is only pre-populated via IP lookup), so the definitive identity exchange
  // in handlePeerMessage() finalizes everything.
  sendWsMessage({
    type: 'identity',
    instanceId,
    personaName: localPersonaName,
  });

  socket.on('data', (data) => {
    handleWsData(socket, data);
  });

  socket.on('close', () => {
    if (peerConnection === socket) {
      handlePeerDisconnect('Connection closed');
    }
  });

  socket.on('error', (err) => {
    console.error(`[LAN] Peer socket error: ${err.message}`);
    if (peerConnection === socket) {
      handlePeerDisconnect(err.message);
    }
  });

  // Client side: we already know the peer's instance ID from discovery,
  // so the role is correct and we can notify the renderer immediately.
  // Server side defers notification until after identity exchange.
  if (side === 'client') {
    rendererNotified = true;
    notifyRenderer('lan:connected', {
      peerId: peerInfo?.id,
      peerName: peerInfo?.name,
      role: localRole,
    });
  }

  console.log(`[LAN] Peer connected (${side}). Role: ${localRole}. Peer: ${peerInfo?.name ?? '(awaiting identity)'}`);
}

// Buffer for partial WebSocket frames
let wsBuffer = Buffer.alloc(0);

function handleWsData(socket, data) {
  wsBuffer = Buffer.concat([wsBuffer, data]);

  // Try to parse one or more complete frames from the buffer
  while (wsBuffer.length >= 2) {
    const masked = !!(wsBuffer[1] & 0x80);
    let payloadLen = wsBuffer[1] & 0x7f;
    let headerLen = 2;
    if (payloadLen === 126) {
      if (wsBuffer.length < 4) return; // Need more data
      payloadLen = wsBuffer.readUInt16BE(2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (wsBuffer.length < 10) return;
      payloadLen = Number(wsBuffer.readBigUInt64BE(2));
      headerLen = 10;
    }
    if (masked) headerLen += 4;

    const totalLen = headerLen + payloadLen;
    if (wsBuffer.length < totalLen) return; // Need more data

    const frameBuf = wsBuffer.slice(0, totalLen);
    wsBuffer = wsBuffer.slice(totalLen);

    try {
      const frame = parseWsFrame(frameBuf);
      if (frame.opcode === 0x8) { // Close
        socket.end();
        return;
      }
      if (frame.opcode === 0x9) { // Ping
        const pong = buildWsFrame(frame.payload.toString(), 0xA);
        socket.write(pong);
        return;
      }
      if (frame.opcode === 0x1) { // Text
        handlePeerMessage(frame.payload.toString());
      }
    } catch (err) {
      console.error('[LAN] Frame parse error:', err.message);
    }
  }
}

function handlePeerMessage(raw) {
  try {
    const msg = JSON.parse(raw);
    switch (msg.type) {
      case 'identity':
        // Update peer info with the definitive instance ID and persona name.
        // Both sides send identity in handleNewPeerConnection. Always update
        // peerInfo with the authoritative data from the identity message, and
        // notify the renderer if it hasn't been notified yet (the server side
        // defers notification to this point).
        peerInfo = {
          id: msg.instanceId,
          name: msg.personaName || 'Unknown',
          ip: peerInfo?.ip || 'unknown',
          port: peerInfo?.port || WS_PORT,
        };
        // Recalculate role now that we have the definitive peer ID
        localRole = instanceId < msg.instanceId ? 'initiator' : 'responder';

        if (!rendererNotified) {
          rendererNotified = true;
          notifyRenderer('lan:connected', {
            peerId: peerInfo.id,
            peerName: peerInfo.name,
            role: localRole,
          });
        }
        console.log(`[LAN] Identity exchange complete. Role: ${localRole}. Peer: ${peerInfo.name}`);
        break;

      case 'chat':
        // Peer sent us an AI-generated message; forward to the renderer
        // so our AI can process it and respond
        console.log(`[LAN] Chat received from ${msg.peerName || peerInfo?.name}: ${(msg.content || '').slice(0, 80)}...`);
        notifyRenderer('lan:peer-message', {
          content: msg.content,
          peerName: msg.peerName || peerInfo?.name || 'Peer',
          timestamp: msg.timestamp || new Date().toISOString(),
        });
        break;

      case 'typing':
        notifyRenderer('lan:peer-typing', { peerName: peerInfo?.name });
        break;

      case 'disconnect':
        handlePeerDisconnect('Peer initiated disconnect');
        break;

      default:
        console.warn(`[LAN] Unknown message type: ${msg.type}`);
    }
  } catch (err) {
    console.error('[LAN] Failed to parse peer message:', err.message);
  }
}

function handlePeerDisconnect(reason) {
  const wasConnected = !!peerConnection;
  if (peerConnection) {
    try { peerConnection.end(); } catch { /* ignore */ }
  }
  peerConnection = null;
  peerConnectionSide = null;
  peerInfo = null;
  localRole = null;
  rendererNotified = false;
  wsBuffer = Buffer.alloc(0);

  if (wasConnected) {
    notifyRenderer('lan:disconnected', { reason });
    console.log(`[LAN] Peer disconnected: ${reason}`);
  }
}

/** Send a JSON message to the connected peer over WebSocket. */
function sendWsMessage(obj) {
  if (!peerConnection) return false;
  try {
    const payload = JSON.stringify(obj);
    // Use masked frames when we're the client, unmasked when server
    const frame = peerConnectionSide === 'client'
      ? buildMaskedWsFrame(payload)
      : buildWsFrame(payload);
    peerConnection.write(frame);
    return true;
  } catch (err) {
    console.error('[LAN] Send error:', err.message);
    return false;
  }
}

// ────────────────────────────────────────────────
// IPC Notification (Main -> Renderer)
// ────────────────────────────────────────────────

function notifyRenderer(channel, data) {
  if (ipcSender && !ipcSender.isDestroyed()) {
    ipcSender.send(channel, data);
  }
}

// ────────────────────────────────────────────────
// Public API (called from main.js IPC handlers)
// ────────────────────────────────────────────────

/**
 * Start the LAN discovery and WebSocket server.
 * @param {Electron.WebContents} webContents - For sending IPC to the renderer
 * @param {string} personaName - The current persona name for peer display
 */
function startLan(webContents, personaName) {
  if (isRunning) {
    ipcSender = webContents;
    localPersonaName = personaName || localPersonaName || 'ALTER EGO';
    return { success: true, instanceId };
  }

  ipcSender = webContents;
  localPersonaName = personaName || 'ALTER EGO';
  instanceId = crypto.randomUUID();

  startDiscovery();
  startWsServer();

  isRunning = true;
  console.log(`[LAN] Started. Instance: ${instanceId}, Persona: ${localPersonaName}`);
  console.log(`[LAN] Ports: UDP discovery=${DISCOVERY_PORT}, WebSocket=${WS_PORT}`);
  console.log('[LAN] If peers are not discovered, ensure Windows Firewall allows:');
  console.log(`[LAN]   - Inbound UDP on port ${DISCOVERY_PORT}`);
  console.log(`[LAN]   - Inbound TCP on port ${WS_PORT}`);
  console.log('[LAN]   (Or allow the Electron / ALTER EGO executable through the firewall.)');
  return { success: true, instanceId };
}

/** Cleanly shut down all LAN networking. */
function stopLan() {
  if (!isRunning) return false;

  // Notify peer we're leaving
  sendWsMessage({ type: 'disconnect' });
  handlePeerDisconnect('Local shutdown');

  // Send goodbye broadcast
  sendGoodbye();

  // Stop heartbeat
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  // Close discovery sockets
  if (discoveryRecvSocket) {
    try {
      discoveryRecvSocket.dropMembership(MULTICAST_ADDR);
    } catch { /* ignore */ }
    try { discoveryRecvSocket.close(); } catch { /* ignore */ }
    discoveryRecvSocket = null;
  }
  for (const { sock } of discoverySendSockets) {
    try { sock.close(); } catch { /* ignore */ }
  }
  discoverySendSockets = [];

  // Close WebSocket server
  if (wsServer) {
    wsServer.close();
    wsServer = null;
  }

  discoveredPeers.clear();
  isRunning = false;
  localRole = null;
  rendererNotified = false;
  wsBuffer = Buffer.alloc(0);
  console.log('[LAN] Stopped.');
  return true;
}

/** Connect to a specific discovered peer by their instance ID. */
async function connectPeer(peerId) {
  return await connectToPeer(peerId);
}

/** Disconnect from the currently connected peer. */
function disconnectPeer() {
  if (!peerConnection) return false;
  sendWsMessage({ type: 'disconnect' });
  handlePeerDisconnect('Local disconnect');
  return true;
}

/**
 * Send a chat message to the connected peer.
 * Called when our AI generates a response that should be relayed.
 */
function sendChatMessage(content) {
  console.log(`[LAN] Sending chat as ${localPersonaName}: ${(content || '').slice(0, 80)}...`);
  return sendWsMessage({
    type: 'chat',
    content,
    peerName: localPersonaName,
    timestamp: new Date().toISOString(),
  });
}

/** Send a typing indicator to the peer. */
function sendTypingIndicator() {
  return sendWsMessage({ type: 'typing' });
}

/** Update the local persona name (e.g., when the user switches characters). */
function setPersonaName(name) {
  localPersonaName = name || 'ALTER EGO';
}

/** Get the list of currently discovered peers. */
function getDiscoveredPeers() {
  return Array.from(discoveredPeers.values());
}

/** Get current LAN connection status. */
function getStatus() {
  return {
    isRunning,
    instanceId: isRunning ? instanceId : null,
    isConnected: !!peerConnection,
    peer: peerInfo ? { id: peerInfo.id, name: peerInfo.name } : null,
    role: localRole,
    discoveredPeers: getDiscoveredPeers(),
    localIPs: getLocalIPs(),
  };
}

module.exports = {
  startLan,
  stopLan,
  connectPeer,
  disconnectPeer,
  sendChatMessage,
  sendTypingIndicator,
  setPersonaName,
  getDiscoveredPeers,
  getStatus,
};
