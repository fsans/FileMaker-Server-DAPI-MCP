import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { loggers } from "./logger.js";

/**
 * Represents a FileMaker database connection configuration
 */
export interface Connection {
  name?: string;
  server: string;
  version: string;
  database: string;
  user: string;
  password: string;
}

/**
 * Validation result for connection configuration
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Connection Manager - Handles current connection state and switching
 */
export class ConnectionManager {
  private currentConnection: Connection | null = null;
  private connections: Map<string, Connection> = new Map();
  private defaultConnectionName: string | null = null;
  private configDir: string;
  private connectionsFile: string;

  constructor(configDir: string = path.join(os.homedir(), ".filemaker-mcp")) {
    loggers.connection("Initializing ConnectionManager");
    this.configDir = configDir;
    this.connectionsFile = path.join(configDir, "connections.json");
    loggers.connection(`Config directory: ${configDir}`);
    this.loadConnections();
  }

  /**
   * Load connections from file
   */
  private loadConnections(): void {
    if (fs.existsSync(this.connectionsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.connectionsFile, "utf-8"));
        this.connections = new Map(Object.entries(data.connections || {}));
        this.defaultConnectionName = data.defaultConnection || null;
        loggers.connection(`Loaded ${this.connections.size} connection(s) from ${this.connectionsFile}`);
        if (this.defaultConnectionName) {
          loggers.connection(`Default connection: ${this.defaultConnectionName}`);
        }
      } catch (error) {
        loggers.connection(`Error loading connections file: ${error instanceof Error ? error.message : String(error)}`);
        console.error("Error loading connections file:", error);
        this.connections = new Map();
        this.defaultConnectionName = null;
      }
    } else {
      loggers.connection("No connections file found, starting with empty connections");
    }
  }

  /**
   * Save connections to file
   */
  private saveConnections(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    const data = {
      connections: Object.fromEntries(this.connections),
      defaultConnection: this.defaultConnectionName,
    };

    fs.writeFileSync(this.connectionsFile, JSON.stringify(data, null, 2));
    fs.chmodSync(this.connectionsFile, 0o600); // Restrict permissions for security
  }

  /**
   * Validate connection configuration
   */
  validateConnection(connection: Connection): ValidationResult {
    const errors: string[] = [];

    if (!connection.server || connection.server.trim() === "") {
      errors.push("Server is required");
    }

    if (!connection.database || connection.database.trim() === "") {
      errors.push("Database is required");
    }

    if (!connection.user || connection.user.trim() === "") {
      errors.push("User is required");
    }

    if (!connection.password || connection.password.trim() === "") {
      errors.push("Password is required");
    }

    if (connection.version && connection.version.trim() === "") {
      errors.push("Version must be a valid string");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get the current active connection
   */
  getCurrentConnection(): Connection | null {
    return this.currentConnection;
  }

  /**
   * Set the current connection directly
   */
  setCurrentConnection(connection: Connection): void {
    const validation = this.validateConnection(connection);
    if (!validation.valid) {
      throw new Error(`Invalid connection: ${validation.errors.join(", ")}`);
    }
    this.currentConnection = connection;
  }

  /**
   * Switch to a predefined connection by name
   */
  switchToConnection(name: string): void {
    const connection = this.connections.get(name);
    if (!connection) {
      loggers.connection(`Connection "${name}" not found`);
      throw new Error(`Connection "${name}" not found`);
    }
    this.currentConnection = connection;
    loggers.connection(`Switched to connection: ${name} (${connection.database}@${connection.server})`);
  }

  /**
   * Add a new predefined connection
   */
  addConnection(name: string, connection: Connection): void {
    if (!name || name.trim() === "") {
      throw new Error("Connection name is required");
    }

    // Check if connection already exists
    if (this.connections.has(name)) {
      throw new Error(`Connection "${name}" already exists`);
    }

    const validation = this.validateConnection(connection);
    if (!validation.valid) {
      throw new Error(`Invalid connection: ${validation.errors.join(", ")}`);
    }

    // Add name to connection object
    const namedConnection = { ...connection, name };
    this.connections.set(name, namedConnection);
    this.saveConnections();
    loggers.connection(`Connection "${name}" added: ${connection.database}@${connection.server}`);
  }

  /**
   * Remove a predefined connection
   */
  removeConnection(name: string): void {
    if (!this.connections.has(name)) {
      throw new Error(`Connection "${name}" not found`);
    }

    this.connections.delete(name);

    // If this was the default connection, clear the default
    if (this.defaultConnectionName === name) {
      this.defaultConnectionName = null;
    }

    // If this was the current connection, clear it
    if (this.currentConnection?.name === name) {
      this.currentConnection = null;
    }

    this.saveConnections();
  }

  /**
   * Get a specific connection by name
   */
  getConnection(name: string): Connection | null {
    return this.connections.get(name) || null;
  }

  /**
   * Get connection details with password masked
   */
  getConnectionMasked(name: string): Connection | null {
    const connection = this.connections.get(name);
    if (!connection) {
      return null;
    }

    return {
      ...connection,
      password: "***",
    };
  }

  /**
   * List all available connections
   */
  listConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * List all connection names
   */
  listConnectionNames(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Set the default connection
   */
  setDefaultConnection(name: string): void {
    if (!this.connections.has(name)) {
      throw new Error(`Connection "${name}" not found`);
    }

    this.defaultConnectionName = name;
    this.saveConnections();
  }

  /**
   * Get the default connection name
   */
  getDefaultConnectionName(): string | null {
    return this.defaultConnectionName;
  }

  /**
   * Get the default connection
   */
  getDefaultConnection(): Connection | null {
    if (!this.defaultConnectionName) {
      return null;
    }

    return this.connections.get(this.defaultConnectionName) || null;
  }

  /**
   * Initialize with default connection if not already set
   */
  initializeWithDefault(): void {
    if (!this.currentConnection && this.defaultConnectionName) {
      const defaultConn = this.connections.get(this.defaultConnectionName);
      if (defaultConn) {
        this.currentConnection = defaultConn;
      }
    }
  }

  /**
   * Clear the current connection
   */
  clearCurrentConnection(): void {
    this.currentConnection = null;
  }

  /**
   * Check if a connection exists
   */
  connectionExists(name: string): boolean {
    return this.connections.has(name);
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Export all connections (for backup/migration)
   */
  exportConnections(): { connections: Record<string, Connection>; defaultConnection: string | null } {
    return {
      connections: Object.fromEntries(this.connections),
      defaultConnection: this.defaultConnectionName,
    };
  }

  /**
   * Import connections (for restore/migration)
   */
  importConnections(data: { connections: Record<string, Connection>; defaultConnection?: string | null }): void {
    this.connections.clear();

    for (const [name, connection] of Object.entries(data.connections || {})) {
      const validation = this.validateConnection(connection);
      if (validation.valid) {
        this.connections.set(name, { ...connection, name });
      }
    }

    if (data.defaultConnection && this.connections.has(data.defaultConnection)) {
      this.defaultConnectionName = data.defaultConnection;
    }

    this.saveConnections();
  }

  /**
   * Get connections file path
   */
  getConnectionsFilePath(): string {
    return this.connectionsFile;
  }

  /**
   * Get config directory
   */
  getConfigDir(): string {
    return this.configDir;
  }
}

/**
 * Global singleton instance
 */
let globalConnectionManager: ConnectionManager | null = null;

/**
 * Get or create the global connection manager instance
 */
export function getConnectionManager(configDir?: string): ConnectionManager {
  if (!globalConnectionManager) {
    globalConnectionManager = new ConnectionManager(configDir);
  }
  return globalConnectionManager;
}

/**
 * Reset the global connection manager (useful for testing)
 */
export function resetConnectionManager(): void {
  globalConnectionManager = null;
}
