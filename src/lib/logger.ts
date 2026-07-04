type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

const PREFIX = '[CivicPulse]';

function formatMessage(level: LogLevel, ...args: unknown[]): unknown[] {
  return [`${PREFIX} [${level.toUpperCase()}]`, ...args];
}

export const logger: Logger = {
  debug(...args: unknown[]) {
    console.debug(...formatMessage('debug', ...args));
  },
  info(...args: unknown[]) {
    console.info(...formatMessage('info', ...args));
  },
  warn(...args: unknown[]) {
    console.warn(...formatMessage('warn', ...args));
  },
  error(...args: unknown[]) {
    console.error(...formatMessage('error', ...args));
  },
};
