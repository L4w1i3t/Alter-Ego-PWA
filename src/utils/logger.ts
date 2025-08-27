// Logging utility for ALTER EGO PWA
// Provides consistent logging with environment-based controls

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enableConsoleLogging: boolean;
  enablePerformanceLogging: boolean;
  logLevel: LogLevel;
  isDevelopment: boolean;
}

class Logger {
  private config: LoggerConfig;
  private readonly logLevels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    this.config = {
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enablePerformanceLogging:
        process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true',
      logLevel: (process.env.REACT_APP_LOG_LEVEL as LogLevel) || 'info',
      isDevelopment: process.env.NODE_ENV === 'development',
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enableConsoleLogging && level !== 'error') {
      return false;
    }
    return this.logLevels[level] >= this.logLevels[this.config.logLevel];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[ALTER-EGO DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[ALTER-EGO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[ALTER-EGO WARN] ${message}`, ...args);
    }
  }

  error(message: string, error?: any, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ALTER-EGO ERROR] ${message}`, error, ...args);
    }
  }

  performance(message: string, ...args: any[]): void {
    if (this.config.enablePerformanceLogging && this.config.isDevelopment) {
      console.log(`[ALTER-EGO PERF] ${message}`, ...args);
    }
  }

  // System logs - always show important system events
  system(message: string, ...args: any[]): void {
    console.log(`[ALTER-EGO SYSTEM] ${message}`, ...args);
  }
}

// Export singleton instance
export const logger = new Logger();

// Legacy console replacement for gradual migration
export const createScopedLogger = (scope: string) => ({
  debug: (message: string, ...args: any[]) =>
    logger.debug(`[${scope}] ${message}`, ...args),
  info: (message: string, ...args: any[]) =>
    logger.info(`[${scope}] ${message}`, ...args),
  warn: (message: string, ...args: any[]) =>
    logger.warn(`[${scope}] ${message}`, ...args),
  error: (message: string, error?: any, ...args: any[]) =>
    logger.error(`[${scope}] ${message}`, error, ...args),
  performance: (message: string, ...args: any[]) =>
    logger.performance(`[${scope}] ${message}`, ...args),
});
