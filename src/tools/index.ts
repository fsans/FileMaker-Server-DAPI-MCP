/**
 * MCP Tools Index
 * Exports all tool definitions and handlers
 */

export { configurationTools, configurationToolHandlers } from "./configuration.js";
export { connectionTools, connectionToolHandlers } from "./connection.js";

// Re-export individual tools for convenience
export {
  addConnectionTool,
  removeConnectionTool,
  listConnectionsTool as listConnectionsConfigTool,
  getConnectionTool,
  setDefaultConnectionTool,
} from "./configuration.js";

export {
  setConnectionTool,
  connectTool,
  listConnectionsTool,
  getCurrentConnectionTool,
} from "./connection.js";
