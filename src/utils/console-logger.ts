import { WebSocket } from 'ws';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success' | 'system';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
}

class ConsoleLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private clients: Set<WebSocket> = new Set();
  private logCounter: number = 0;

  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  constructor() {
    this.interceptConsole();
  }

  private generateId(): string {
    return `${Date.now()}-${++this.logCounter}`;
  }

  private interceptConsole(): void {
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.addLog('info', this.formatArgs(args), args.length > 1 ? args : undefined);
    };

    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.addLog('info', this.formatArgs(args), args.length > 1 ? args : undefined);
    };

    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.addLog('warn', this.formatArgs(args), args.length > 1 ? args : undefined);
    };

    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.addLog('error', this.formatArgs(args), args.length > 1 ? args : undefined);
    };

    console.debug = (...args: any[]) => {
      this.originalConsole.debug(...args);
      this.addLog('debug', this.formatArgs(args), args.length > 1 ? args : undefined);
    };
  }

  private formatArgs(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          if (arg instanceof Error) {
            return `${arg.name}: ${arg.message}\n${arg.stack}`;
          }
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  private addLog(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      message,
      data
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.broadcast(entry);
  }

  public log(level: LogLevel, message: string, data?: any): void {
    this.addLog(level, message, data);
  }

  public success(message: string, data?: any): void {
    this.addLog('success', message, data);
  }

  public system(message: string, data?: any): void {
    this.addLog('system', message, data);
  }

  public getLogs(limit?: number, offset?: number): LogEntry[] {
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return this.logs.slice(start, end);
  }

  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  public clearLogs(): void {
    this.logs = [];
    this.broadcast({ type: 'clear' });
  }

  public addClient(ws: WebSocket): void {
    this.clients.add(ws);

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.send(JSON.stringify({
      type: 'init',
      logs: this.getRecentLogs(100)
    }));
  }

  private broadcast(data: any): void {
    const message = JSON.stringify({
      type: 'log',
      data
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          this.clients.delete(client);
        }
      }
    });
  }

  public getStats() {
    return {
      totalLogs: this.logs.length,
      maxLogs: this.maxLogs,
      connectedClients: this.clients.size,
      logsByLevel: {
        info: this.logs.filter(l => l.level === 'info').length,
        warn: this.logs.filter(l => l.level === 'warn').length,
        error: this.logs.filter(l => l.level === 'error').length,
        debug: this.logs.filter(l => l.level === 'debug').length,
        success: this.logs.filter(l => l.level === 'success').length,
        system: this.logs.filter(l => l.level === 'system').length
      }
    };
  }
}

export const consoleLogger = new ConsoleLogger();
