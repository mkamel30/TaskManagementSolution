export interface DebugLogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

class DebugLogger {
  private logs: DebugLogEntry[] = [];
  private isDebugEnabled = false; // Set to true to enable logging

  enable() {
    this.isDebugEnabled = true;
  }

  disable() {
    this.isDebugEnabled = false;
    this.logs = []; // Clear logs when disabled
  }

  private log(level: DebugLogEntry['level'], message: string) {
    if (!this.isDebugEnabled) return;
    
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      message,
      level,
    };
    this.logs.push(entry);
    console.log(`[DEBUG ${level.toUpperCase()}] ${entry.timestamp}: ${message}`);
  }

  info(message: string) {
    this.log('info', message);
  }

  warn(message: string) {
    this.log('warn', message);
  }

  error(message: string) {
    this.log('error', message);
  }

  getLogs(): DebugLogEntry[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

export const debugLogger = new DebugLogger();