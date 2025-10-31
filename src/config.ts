import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as dotenv from "dotenv";

export interface ServerConfig {
  transport: "stdio" | "http" | "https";
  port: number;
  host: string;
}

export interface FileMakerConfig {
  server: string;
  version: string;
  database: string;
  user: string;
  password?: string;
}

export interface SecurityConfig {
  certPath?: string;
  keyPath?: string;
}

export interface Connection {
  name?: string;
  server: string;
  version: string;
  database: string;
  user: string;
  password: string;
}

export interface AppConfig {
  server: ServerConfig;
  filemaker: FileMakerConfig;
  security?: SecurityConfig;
  connections?: Record<string, Connection>;
  defaultConnection?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".filemaker-mcp");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const ENV_FILE = path.join(CONFIG_DIR, ".env");

/**
 * Load configuration from file
 */
export function loadConfigFile(): Partial<AppConfig> {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    } catch (error) {
      console.error("Error reading config file:", error);
      return {};
    }
  }
  return {};
}

/**
 * Save configuration to file
 */
export function saveConfigFile(config: AppConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  fs.chmodSync(CONFIG_FILE, 0o600); // Restrict permissions for security
}

/**
 * Load environment variables from .env file
 */
export function loadEnvFile(): void {
  if (fs.existsSync(ENV_FILE)) {
    dotenv.config({ path: ENV_FILE });
  }
}

/**
 * Get configuration with precedence: CLI args > env vars > config file > defaults
 */
export function getConfig(): AppConfig {
  // Load from file first
  const fileConfig = loadConfigFile();

  // Load environment variables
  loadEnvFile();

  // Build final config with precedence
  const config: AppConfig = {
    server: {
      transport: (process.env.MCP_TRANSPORT as "stdio" | "http" | "https") ||
        (fileConfig.server?.transport as "stdio" | "http" | "https") ||
        "stdio",
      port: parseInt(process.env.MCP_PORT || String(fileConfig.server?.port || 3000), 10),
      host: process.env.MCP_HOST || fileConfig.server?.host || "localhost",
    },
    filemaker: {
      server: process.env.FM_SERVER || fileConfig.filemaker?.server || "",
      version: process.env.FM_VERSION || fileConfig.filemaker?.version || "vLatest",
      database: process.env.FM_DATABASE || fileConfig.filemaker?.database || "",
      user: process.env.FM_USER || fileConfig.filemaker?.user || "",
      password: process.env.FM_PASSWORD || fileConfig.filemaker?.password,
    },
    security: {
      certPath: process.env.MCP_CERT_PATH || fileConfig.security?.certPath,
      keyPath: process.env.MCP_KEY_PATH || fileConfig.security?.keyPath,
    },
  };

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: AppConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate FileMaker configuration
  if (!config.filemaker.server) {
    errors.push("FM_SERVER is required");
  }
  if (!config.filemaker.database) {
    errors.push("FM_DATABASE is required");
  }
  if (!config.filemaker.user) {
    errors.push("FM_USER is required");
  }

  // Validate server configuration
  if (config.server.transport !== "stdio") {
    if (config.server.port < 1 || config.server.port > 65535) {
      errors.push("MCP_PORT must be between 1 and 65535");
    }
  }

  // Validate HTTPS configuration
  if (config.server.transport === "https") {
    if (!config.security?.certPath) {
      errors.push("MCP_CERT_PATH is required for HTTPS transport");
    }
    if (!config.security?.keyPath) {
      errors.push("MCP_KEY_PATH is required for HTTPS transport");
    }
    if (config.security?.certPath && !fs.existsSync(config.security.certPath)) {
      errors.push(`Certificate file not found: ${config.security.certPath}`);
    }
    if (config.security?.keyPath && !fs.existsSync(config.security.keyPath)) {
      errors.push(`Key file not found: ${config.security.keyPath}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration directory
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get configuration file path
 */
export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

/**
 * Get environment file path
 */
export function getEnvFilePath(): string {
  return ENV_FILE;
}

/**
 * Check if configuration exists
 */
export function hasConfig(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

/**
 * Get connections from config file
 */
export function getConnections(): Record<string, Connection> {
  const config = loadConfigFile();
  return config.connections || {};
}

/**
 * Get a specific connection from config
 */
export function getConnection(name: string): Connection | null {
  const connections = getConnections();
  return connections[name] || null;
}

/**
 * Add a connection to config file
 */
export function addConnection(name: string, connection: Connection): void {
  const config = loadConfigFile() as AppConfig;
  
  if (!config.connections) {
    config.connections = {};
  }
  
  config.connections[name] = { ...connection, name };
  saveConfigFile(config);
}

/**
 * Remove a connection from config file
 */
export function removeConnection(name: string): void {
  const config = loadConfigFile() as AppConfig;
  
  if (config.connections && config.connections[name]) {
    delete config.connections[name];
  }
  
  // If this was the default connection, clear it
  if (config.defaultConnection === name) {
    config.defaultConnection = undefined;
  }
  
  saveConfigFile(config);
}

/**
 * List all connections from config
 */
export function listConnections(): Connection[] {
  const connections = getConnections();
  return Object.values(connections);
}

/**
 * Set default connection in config
 */
export function setDefaultConnection(name: string): void {
  const config = loadConfigFile() as AppConfig;
  
  if (!config.connections || !config.connections[name]) {
    throw new Error(`Connection "${name}" not found`);
  }
  
  config.defaultConnection = name;
  saveConfigFile(config);
}

/**
 * Get default connection name from config
 */
export function getDefaultConnectionName(): string | undefined {
  const config = loadConfigFile();
  return config.defaultConnection;
}

/**
 * Get default connection from config
 */
export function getDefaultConnection(): Connection | null {
  const defaultName = getDefaultConnectionName();
  if (!defaultName) {
    return null;
  }
  return getConnection(defaultName);
}
