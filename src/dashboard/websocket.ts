import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { consoleLogger } from '../utils/console-logger.js';
import { logger } from '../utils/logger.js';

const chatClients = new Map<string, Set<WebSocket>>();

export function setupWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true
  });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname === '/ws/logs') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        handleLogsConnection(ws, request);
      });
    } else if (pathname === '/ws/chat') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        handleChatConnection(ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  logger.success('WebSocket server initialized on /ws/logs and /ws/chat');

  return wss;
}

function handleChatConnection(ws: WebSocket, req: any): void {
    const clientIp = req.socket.remoteAddress;
    logger.info(`Chat WebSocket client connected from ${clientIp}`);

    let subscribedChannel: string | null = null;

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleChatWebSocketMessage(ws, message, (channelId) => {
          subscribedChannel = channelId;
        });
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      if (subscribedChannel) {
        const clients = chatClients.get(subscribedChannel);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            chatClients.delete(subscribedChannel);
          }
        }
      }
      logger.info(`Chat WebSocket client disconnected from ${clientIp}`);
    });

    ws.on('error', (error) => {
      logger.error(`Chat WebSocket error for client ${clientIp}`, error);
    });

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to chat stream'
    }));
}

function handleLogsConnection(ws: WebSocket, req: any): void {
  const clientIp = req.socket.remoteAddress;
  logger.info(`WebSocket client connected from ${clientIp}`);

  consoleLogger.addClient(ws);

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      handleWebSocketMessage(ws, message);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    logger.info(`WebSocket client disconnected from ${clientIp}`);
  });

  ws.on('error', (error) => {
    logger.error(`WebSocket error for client ${clientIp}`, error);
  });

  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to log stream'
  }));
}

function handleWebSocketMessage(ws: WebSocket, message: any): void {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'getLogs':
      const logs = consoleLogger.getLogs(message.limit, message.offset);
      ws.send(JSON.stringify({
        type: 'logs',
        data: logs
      }));
      break;

    case 'clearLogs':
      consoleLogger.clearLogs();
      ws.send(JSON.stringify({
        type: 'cleared',
        message: 'Logs cleared'
      }));
      break;

    case 'getStats':
      const stats = consoleLogger.getStats();
      ws.send(JSON.stringify({
        type: 'stats',
        data: stats
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
  }
}

function handleChatWebSocketMessage(ws: WebSocket, message: any, setSubscription: (channelId: string) => void): void {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'subscribe':
      const { channelId } = message;
      if (!channelId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Channel ID required'
        }));
        return;
      }

      if (!chatClients.has(channelId)) {
        chatClients.set(channelId, new Set());
      }
      chatClients.get(channelId)!.add(ws);
      setSubscription(channelId);

      ws.send(JSON.stringify({
        type: 'subscribed',
        channelId
      }));
      break;

    case 'unsubscribe':
      const { channelId: unsubChannelId } = message;
      if (unsubChannelId) {
        const clients = chatClients.get(unsubChannelId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            chatClients.delete(unsubChannelId);
          }
        }
      }
      ws.send(JSON.stringify({
        type: 'unsubscribed'
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
  }
}

export function broadcastMessage(channelId: string, messageData: any): void {
  const clients = chatClients.get(channelId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({
    type: 'message',
    data: messageData
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
