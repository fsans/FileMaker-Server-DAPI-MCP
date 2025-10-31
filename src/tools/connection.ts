import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getConnectionManager } from "../connection.js";

/**
 * Connection Tools for managing runtime database connections
 */

/**
 * Tool: fm_set_connection
 * Switch to a predefined FileMaker database connection
 */
export const setConnectionTool: Tool = {
  name: "fm_set_connection",
  description: "Switch to a predefined FileMaker database connection",
  inputSchema: {
    type: "object" as const,
    properties: {
      connectionName: {
        type: "string",
        description: "Name of the predefined connection (e.g., 'production', 'staging')",
      },
    },
    required: ["connectionName"],
  },
};

/**
 * Tool: fm_connect
 * Connect to a FileMaker database with inline credentials
 */
export const connectTool: Tool = {
  name: "fm_connect",
  description: "Connect to a FileMaker database with inline credentials (one-time connection)",
  inputSchema: {
    type: "object" as const,
    properties: {
      server: {
        type: "string",
        description: "FileMaker Server IP address or hostname (without https://)",
      },
      database: {
        type: "string",
        description: "FileMaker database name",
      },
      user: {
        type: "string",
        description: "FileMaker username",
      },
      password: {
        type: "string",
        description: "FileMaker password",
      },
      version: {
        type: "string",
        description: "FileMaker Data API version (default: vLatest)",
      },
    },
    required: ["server", "database", "user", "password"],
  },
};

/**
 * Tool: fm_list_connections
 * List all available predefined connections
 */
export const listConnectionsTool: Tool = {
  name: "fm_list_connections",
  description: "List all available predefined database connections",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

/**
 * Tool: fm_get_current_connection
 * Get the currently active connection details
 */
export const getCurrentConnectionTool: Tool = {
  name: "fm_get_current_connection",
  description: "Get the currently active database connection details (password masked)",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

/**
 * Handler for fm_set_connection
 */
export async function handleSetConnection(params: { connectionName: string }): Promise<string> {
  try {
    const connectionManager = getConnectionManager();

    if (!connectionManager.connectionExists(params.connectionName)) {
      return JSON.stringify({
        success: false,
        error: `Connection "${params.connectionName}" not found`,
        availableConnections: connectionManager.listConnectionNames(),
      });
    }

    connectionManager.switchToConnection(params.connectionName);
    const connection = connectionManager.getCurrentConnection();

    return JSON.stringify({
      success: true,
      message: `Switched to connection "${params.connectionName}"`,
      connection: {
        name: connection?.name,
        server: connection?.server,
        database: connection?.database,
        user: connection?.user,
        version: connection?.version,
      },
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Handler for fm_connect
 */
export async function handleConnect(params: {
  server: string;
  database: string;
  user: string;
  password: string;
  version?: string;
}): Promise<string> {
  try {
    const connectionManager = getConnectionManager();

    // Validate connection parameters
    const connection = {
      server: params.server,
      database: params.database,
      user: params.user,
      password: params.password,
      version: params.version || "vLatest",
    };

    const validation = connectionManager.validateConnection(connection);
    if (!validation.valid) {
      return JSON.stringify({
        success: false,
        error: `Invalid connection parameters: ${validation.errors.join(", ")}`,
      });
    }

    // Set as current connection (inline connection, no name)
    connectionManager.setCurrentConnection(connection);

    return JSON.stringify({
      success: true,
      message: "Connected to FileMaker database",
      connection: {
        server: params.server,
        database: params.database,
        user: params.user,
        version: params.version || "vLatest",
      },
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Handler for fm_list_connections
 */
export async function handleListConnections(): Promise<string> {
  try {
    const connectionManager = getConnectionManager();
    const connections = connectionManager.listConnections();
    const defaultConnection = connectionManager.getDefaultConnectionName();
    const currentConnection = connectionManager.getCurrentConnection();

    const connectionList = connections.map((conn) => ({
      name: conn.name,
      server: conn.server,
      database: conn.database,
      user: conn.user,
      version: conn.version,
      isDefault: conn.name === defaultConnection,
      isCurrent: conn.name === currentConnection?.name,
    }));

    return JSON.stringify({
      success: true,
      count: connectionList.length,
      defaultConnection,
      currentConnection: currentConnection?.name || null,
      connections: connectionList,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Handler for fm_get_current_connection
 */
export async function handleGetCurrentConnection(): Promise<string> {
  try {
    const connectionManager = getConnectionManager();
    const connection = connectionManager.getCurrentConnection();

    if (!connection) {
      return JSON.stringify({
        success: false,
        error: "No active connection. Use fm_set_connection or fm_connect to establish a connection.",
        availableConnections: connectionManager.listConnectionNames(),
      });
    }

    return JSON.stringify({
      success: true,
      connection: {
        name: connection.name || "inline",
        server: connection.server,
        database: connection.database,
        user: connection.user,
        version: connection.version,
        password: "***",
      },
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Export all connection tools
 */
export const connectionTools: Tool[] = [setConnectionTool, connectTool, listConnectionsTool, getCurrentConnectionTool];

/**
 * Connection tool handlers map
 */
export const connectionToolHandlers: Record<string, (params?: unknown) => Promise<string>> = {
  fm_set_connection: (params) => handleSetConnection(params as Parameters<typeof handleSetConnection>[0]),
  fm_connect: (params) => handleConnect(params as Parameters<typeof handleConnect>[0]),
  fm_list_connections: () => handleListConnections(),
  fm_get_current_connection: () => handleGetCurrentConnection(),
};
