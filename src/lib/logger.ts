
import { toast } from '@/hooks/use-toast';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  /** A user-friendly message to display in a toast notification. */
  userMessage?: string;
  /** Whether to show a toast notification for this log. Defaults to true for 'error' and 'warn'. */
  showToast?: boolean;
  /** The variant of the toast (e.g., 'destructive' for errors). */
  toastVariant?: 'default' | 'destructive';
  /** Optional ErrorInfo object for more detailed error logging, typically from an Error Boundary. */
  errorInfo?: import('react').ErrorInfo;
}

/**
 * A centralized logging utility.
 * In a real-world application, this would integrate with a backend logging service (e.g., Sentry, Datadog).
 */
export const logger = {
  log: (level: LogLevel, message: string, details?: unknown, options?: LogOptions) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      details,
    };

    switch (level) {
      case 'info':
        console.info(logEntry);
        break;
      case 'warn':
        console.warn(logEntry);
        break;
      case 'error':
        console.error(logEntry);
        break;
      case 'debug':
        console.debug(logEntry);
        break;
      default:
        console.log(logEntry);
    }

    const showToast = options?.showToast ?? (level === 'error' || level === 'warn');

    if (showToast && options?.userMessage) {
      toast({
        title: level === 'error' ? 'Error' : 'Notification',
        description: options.userMessage,
        variant: options.toastVariant || 'default',
      });
    }
  },

  info: (message: string, details?: unknown, options?: LogOptions) =>
    logger.log('info', message, details, options),
  warn: (message: string, details?: unknown, options?: LogOptions) =>
    logger.log('warn', message, details, { ...options, toastVariant: 'destructive' }),
  error: (message: string, details?: unknown, options?: LogOptions) =>
    logger.log('error', message, details, { ...options, toastVariant: 'destructive' }),
  debug: (message: string, details?: unknown, options?: LogOptions) =>
    logger.log('debug', message, details, { ...options, showToast: false }),
};