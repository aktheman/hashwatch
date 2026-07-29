export interface WebSocketMessage {
  type: 'miner_update' | 'miner_online' | 'miner_offline' | 'alert';
  minerId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface MinerRealtimeData {
  minerId: string;
  timestamp: number;
  hashRate: number;
  temperature: number;
  power: number;
  uptime: number;
}

type MessageHandler = (data: MinerRealtimeData) => void;
type StatusHandler = (connected: boolean) => void;

const RECONNECT_BASE_DELAY_MS = 1000;
const MAX_RECONNECT_ATTEMPTS = 10;

export class MinerWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler> = new Map();
  private statusHandlers: StatusHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  private reconnectBaseDelay = RECONNECT_BASE_DELAY_MS;
  private _connected = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this._connected = true;
        this.reconnectAttempts = 0;
        this.notifyStatus(true);
      };
      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(String(event.data));
          this.handleMessage(msg as WebSocketMessage);
        } catch {
          // ignore parse errors
        }
      };
      this.ws.onclose = () => {
        this._connected = false;
        this.ws = null;
        this.notifyStatus(false);
        this.scheduleReconnect();
      };
      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
    this.notifyStatus(false);
  }

  subscribe(minerId: string, handler: MessageHandler): () => void {
    this.handlers.set(minerId, handler);
    return () => {
      this.handlers.delete(minerId);
    };
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  get connected(): boolean {
    return this._connected;
  }

  private handleMessage(msg: WebSocketMessage): void {
    const { minerId } = msg;
    const handler = this.handlers.get(minerId);
    if (!handler) return;
    const data: MinerRealtimeData = {
      minerId,
      timestamp: msg.timestamp,
      hashRate: (msg.data.hashRate as number) || 0,
      temperature: (msg.data.temperature as number) || 0,
      power: (msg.data.power as number) || 0,
      uptime: (msg.data.uptime as number) || 0,
    };
    handler(data);
  }

  private notifyStatus(connected: boolean): void {
    this.statusHandlers.forEach((h) => h(connected));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(this.reconnectBaseDelay * Math.pow(1.5, this.reconnectAttempts), 60000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, delay);
    if (
      typeof this.reconnectTimer === 'object' &&
      this.reconnectTimer !== null &&
      'unref' in this.reconnectTimer
    ) {
      this.reconnectTimer.unref();
    }
  }
}

export const minerWebSocket = new MinerWebSocket('wss://api.hashwatch.app/ws');
