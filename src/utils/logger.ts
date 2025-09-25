// Logger utility for debugging session and authentication issues

export interface LogContext {
  userId?: number
  sessionToken?: string
  endpoint?: string
  userAgent?: string
  ip?: string
  timestamp?: string
  [key: string]: any
}

export class Logger {
  private static formatLog(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level}] ${message}${contextStr}`
  }

  static info(message: string, context?: LogContext) {
    console.log(this.formatLog('INFO', message, context))
  }

  static warn(message: string, context?: LogContext) {
    console.warn(this.formatLog('WARN', message, context))
  }

  static error(message: string, error?: Error, context?: LogContext) {
    const errorDetails = error ? ` | Error: ${error.message} | Stack: ${error.stack}` : ''
    console.error(this.formatLog('ERROR', message, context) + errorDetails)
  }

  static debug(message: string, context?: LogContext) {
    console.log(this.formatLog('DEBUG', message, context))
  }

  // Session-specific logging
  static sessionCreated(userId: number, sessionToken: string, context?: Partial<LogContext>) {
    this.info('Session created', {
      userId,
      sessionToken: sessionToken.substring(0, 10) + '...', // Only log first 10 chars for security
      ...context
    })
  }

  static sessionValidation(success: boolean, sessionToken?: string, context?: Partial<LogContext>) {
    const level = success ? 'info' : 'warn'
    const message = success ? 'Session validation successful' : 'Session validation failed'
    this[level](message, {
      sessionToken: sessionToken ? sessionToken.substring(0, 10) + '...' : 'none',
      ...context
    })
  }

  static authError(message: string, error?: Error, context?: Partial<LogContext>) {
    this.error(`AUTH ERROR: ${message}`, error, context)
  }

  static requestLog(method: string, path: string, statusCode: number, context?: Partial<LogContext>) {
    this.info(`${method} ${path} ${statusCode}`, context)
  }
}