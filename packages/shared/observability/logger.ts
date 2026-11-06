// Visnora — Structured JSON Logger with Correlation Tracing

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  traceId?: string;
  organizationId?: string;
  service?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEY_REGEX = /(key|secret|token|password|authorization|credential)/i;

/**
 * Recursively masks sensitive fields before serializing to log output.
 */
function maskSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEY_REGEX.test(k) && typeof v === 'string') {
      masked[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      masked[k] = maskSensitiveData(v as Record<string, unknown>);
    } else {
      masked[k] = v;
    }
  }
  return masked;
}

export class Logger {
  constructor(private defaultContext: LogContext = {}) {}

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.defaultContext,
      ...maskSensitiveData(context || {}),
    };

    const output = JSON.stringify(payload);
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger({ service: 'visnora-app' });

