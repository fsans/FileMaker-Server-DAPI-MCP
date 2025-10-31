/**
 * Logger utility module for FileMaker Data API MCP Server
 *
 * Uses the 'debug' package for flexible, namespace-based logging.
 *
 * Usage:
 *   Enable all logs:        DEBUG=fmda:*
 *   Enable specific logs:   DEBUG=fmda:client,fmda:tools
 *   Enable verbose logs:    DEBUG=fmda:*,fmda:verbose:*
 *   Disable all logs:       (unset DEBUG or set to empty)
 *
 * Namespaces:
 *   - fmda:client        - FileMaker API client operations
 *   - fmda:tools         - Tool handler execution
 *   - fmda:config        - Configuration management
 *   - fmda:connection    - Connection management
 *   - fmda:transport     - Transport layer (stdio/http/https)
 *   - fmda:cli           - CLI commands
 *   - fmda:verbose:*     - Detailed request/response data
 */

import debug from "debug";

/**
 * Create a logger for a specific namespace
 * @param namespace - The logging namespace (e.g., 'client', 'tools')
 * @returns Debug logger function
 */
export function createLogger(namespace: string) {
  return debug(`fmda:${namespace}`);
}

/**
 * Create a verbose logger for detailed output
 * @param namespace - The logging namespace
 * @returns Debug logger function for verbose output
 */
export function createVerboseLogger(namespace: string) {
  return debug(`fmda:verbose:${namespace}`);
}

/**
 * Pre-configured loggers for different modules
 */
export const loggers = {
  client: createLogger("client"),
  clientVerbose: createVerboseLogger("client"),
  tools: createLogger("tools"),
  toolsVerbose: createVerboseLogger("tools"),
  config: createLogger("config"),
  connection: createLogger("connection"),
  transport: createLogger("transport"),
  cli: createLogger("cli"),
};

/**
 * Log API request details
 */
export function logRequest(
  logger: debug.Debugger,
  verboseLogger: debug.Debugger,
  method: string,
  url: string,
  data?: any
) {
  logger(`${method} ${url}`);
  if (data && Object.keys(data).length > 0) {
    verboseLogger("Request data:", JSON.stringify(data, null, 2));
  }
}

/**
 * Log API response details
 */
export function logResponse(
  logger: debug.Debugger,
  verboseLogger: debug.Debugger,
  method: string,
  url: string,
  status: number,
  data?: any
) {
  logger(`${method} ${url} - ${status}`);
  if (data) {
    verboseLogger("Response data:", JSON.stringify(data, null, 2));
  }
}

/**
 * Log errors with full context
 */
export function logError(
  logger: debug.Debugger,
  operation: string,
  error: any
) {
  logger(`ERROR in ${operation}:`, error.message);
  if (error.response) {
    logger(`Status: ${error.response.status}`);
    if (error.response.data) {
      logger("Response data:", JSON.stringify(error.response.data, null, 2));
    }
  }
  if (error.stack) {
    logger("Stack trace:", error.stack);
  }
}

/**
 * Log performance timing
 */
export function logTiming(
  logger: debug.Debugger,
  operation: string,
  startTime: number
) {
  const duration = Date.now() - startTime;
  logger(`${operation} completed in ${duration}ms`);
}

/**
 * Helper to create a timed operation logger
 */
export function createTimedLogger(logger: debug.Debugger, operation: string) {
  const startTime = Date.now();
  return () => logTiming(logger, operation, startTime);
}
