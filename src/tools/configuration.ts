import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getConnectionManager } from "../connection.js";

/**
 * Configuration Tools for managing FileMaker database connections
 */

/**
 * Tool: fm_config_add_connection
 * Add a new predefined FileMaker database connection
 */
export const addConnectionTool: Tool = {
  name: "fm_config_add_connection",
  description: "Add a new predefined FileMaker database connection to the configuration",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Connection name (e.g., 'production', 'staging', 'dev')",
      },
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
    required: ["name", "server", "database", "user", "password"],
  },
};

/**
 * Tool: fm_config_remove_connection
 * Remove a predefined database connection
 */
export const removeConnectionTool: Tool = {
  name: "fm_config_remove_connection",
  description: "Remove a predefined database connection from the configuration",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Connection name to remove",
      },
    },
    required: ["name"],
  },
};

/**
 * Tool: fm_config_list_connections
 * List all available predefined connections
 */
export const listConnectionsTool: Tool = {
  name: "fm_config_list_connections",
  description: "List all available predefined database connections",
  inputSchema: {
    type: "object" as const,
    properties: {},
  },
};

/**
 * Tool: fm_config_get_connection
 * Get details of a specific connection (password masked)
 */
export const getConnectionTool: Tool = {
  name: "fm_config_get_connection",
  description: "Get details of a specific connection (password is masked for security)",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Connection name",
      },
    },
    required: ["name"],
  },
};

/**
 * Tool: fm_config_set_default_connection
 * Set the default connection to use at startup
 */
export const setDefaultConnectionTool: Tool = {
  name: "fm_config_set_default_connection",
  description: "Set the default connection to use when the server starts",
  inputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Connection name to set as default",
      },
    },
    required: ["name"],
  },
};

/**
 * Handler for fm_config_add_connection
 */
export async function handleAddConnection(params: {
  name: string;
  server: string;
  database: string;
  user: string;
  password: string;
  version?: string;
}): Promise<string> {
  try {
    const connectionManager = getConnectionManager();

    // Check if connection already exists
    if (connectionManager.connectionExists(params.name)) {
      return JSON.stringify({
        success: false,
        error: `Connection "${params.name}" already exists. Remove it first if you want to replace it.`,
      });
    }

    // Add the connection
    connectionManager.addConnection(params.name, {
      server: params.server,
      database: params.database,
      user: params.user,
      password: params.password,
      version: params.version || "vLatest",
    });

    return JSON.stringify({
      success: true,
      message: `Connection "${params.name}" added successfully`,
      connection: {
        name: params.name,
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
 * Handler for fm_config_remove_connection
 */
export async function handleRemoveConnection(params: { name: string }): Promise<string> {
  try {
    const connectionManager = getConnectionManager();

    if (!connectionManager.connectionExists(params.name)) {
      return JSON.stringify({
        success: false,
        error: `Connection "${params.name}" not found`,
      });
    }

    connectionManager.removeConnection(params.name);

    return JSON.stringify({
      success: true,
      message: `Connection "${params.name}" removed successfully`,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Handler for fm_config_list_connections
 */
export async function handleListConnections(): Promise<string> {
  try {
    const connectionManager = getConnectionManager();
    const connections = connectionManager.listConnections();
    const defaultConnection = connectionManager.getDefaultConnectionName();

    const connectionList = connections.map((conn) => ({
      name: conn.name,
      server: conn.server,
      database: conn.database,
      user: conn.user,
      version: conn.version,
      isDefault: conn.name === defaultConnection,
    }));

    return JSON.stringify({
      success: true,
      count: connectionList.length,
      defaultConnection,
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
 * Handler for fm_config_get_connection
 */
export async function handleGetConnection(params: { name: string }): Promise<string> {
  try {
    const connectionManager = getConnectionManager();

    if (!connectionManager.connectionExists(params.name)) {
      return JSON.stringify({
        success: false,
        error: `Connection "${params.name}" not found`,
      });
    }

    const connection = connectionManager.getConnectionMasked(params.name);
    const isDefault = connectionManager.getDefaultConnectionName() === params.name;

    return JSON.stringify({
      success: true,
      connection: {
        ...connection,
        isDefault,
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
 * Handler for fm_config_set_default_connection
 */
export async function handleSetDefaultConnection(params: { name: string }): Promise<string> {
  try {
    const connectionManager = getConnectionManager();

    if (!connectionManager.connectionExists(params.name)) {
      return JSON.stringify({
        success: false,
        error: `Connection "${params.name}" not found`,
      });
    }

    connectionManager.setDefaultConnection(params.name);

    return JSON.stringify({
      success: true,
      message: `Default connection set to "${params.name}"`,
      defaultConnection: params.name,
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Export all configuration tools
 */
export const configurationTools: Tool[] = [
  addConnectionTool,
  removeConnectionTool,
  listConnectionsTool,
  getConnectionTool,
  setDefaultConnectionTool,
];

/**
 * Configuration tool handlers map
 */
export const configurationToolHandlers: Record<string, (params: unknown) => Promise<string>> = {
  fm_config_add_connection: (params) => handleAddConnection(params as Parameters<typeof handleAddConnection>[0]),
  fm_config_remove_connection: (params) => handleRemoveConnection(params as Parameters<typeof handleRemoveConnection>[0]),
  fm_config_list_connections: () => handleListConnections(),
  fm_config_get_connection: (params) => handleGetConnection(params as Parameters<typeof handleGetConnection>[0]),
  fm_config_set_default_connection: (params) =>
    handleSetDefaultConnection(params as Parameters<typeof handleSetDefaultConnection>[0]),
};
