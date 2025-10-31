/**
 * Unit Tests for ConnectionManager
 * Tests connection state management, persistence, and validation
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ConnectionManager } from "../../src/connection.js";

describe("ConnectionManager", () => {
  let testConfigDir: string;
  let connectionManager: ConnectionManager;

  beforeEach(() => {
    // Create temporary directory for testing
    testConfigDir = path.join(os.tmpdir(), `fm-test-${Date.now()}`);
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    connectionManager = new ConnectionManager(testConfigDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true });
    }
  });

  describe("Initialization", () => {
    it("should initialize with empty connections", () => {
      expect(connectionManager.listConnections()).toHaveLength(0);
    });

    it("should create config directory if it doesn't exist", () => {
      expect(fs.existsSync(testConfigDir)).toBe(true);
    });

    it("should load existing connections from file", () => {
      const testConnection = {
        server: "192.168.1.1",
        database: "TestDB",
        user: "admin",
        password: "pass123",
        version: "vLatest",
      };

      connectionManager.addConnection("test", testConnection);
      const newManager = new ConnectionManager(testConfigDir);

      expect(newManager.listConnections()).toHaveLength(1);
      expect(newManager.getConnection("test")).toEqual(expect.objectContaining(testConnection));
    });
  });

  describe("Adding Connections", () => {
    it("should add a new connection", () => {
      const connection = {
        server: "192.168.1.1",
        database: "TestDB",
        user: "admin",
        password: "pass123",
        version: "vLatest",
      };

      connectionManager.addConnection("production", connection);
      const retrieved = connectionManager.getConnection("production");

      expect(retrieved).toBeDefined();
      expect(retrieved?.server).toBe("192.168.1.1");
      expect(retrieved?.database).toBe("TestDB");
    });

    it("should throw error when adding duplicate connection", () => {
      const connection = {
        server: "192.168.1.1",
        database: "TestDB",
        user: "admin",
        password: "pass123",
        version: "vLatest",
      };

      connectionManager.addConnection("prod", connection);

      expect(() => {
        connectionManager.addConnection("prod", connection);
      }).toThrow('Connection "prod" already exists');
    });

    it("should persist connection to file", () => {
      const connection = {
        server: "192.168.1.1",
        database: "TestDB",
        user: "admin",
        password: "pass123",
        version: "vLatest",
      };

      connectionManager.addConnection("test", connection);

      const connectionsFile = path.join(testConfigDir, "connections.json");
      expect(fs.existsSync(connectionsFile)).toBe(true);

      const data = JSON.parse(fs.readFileSync(connectionsFile, "utf-8"));
      expect(data.connections.test).toBeDefined();
    });
  });

  describe("Removing Connections", () => {
    beforeEach(() => {
      connectionManager.addConnection("test1", {
        server: "192.168.1.1",
        database: "DB1",
        user: "user1",
        password: "pass1",
        version: "vLatest",
      });
      connectionManager.addConnection("test2", {
        server: "192.168.1.2",
        database: "DB2",
        user: "user2",
        password: "pass2",
        version: "vLatest",
      });
    });

    it("should remove an existing connection", () => {
      expect(connectionManager.listConnections()).toHaveLength(2);

      connectionManager.removeConnection("test1");

      expect(connectionManager.listConnections()).toHaveLength(1);
      expect(connectionManager.getConnection("test1")).toBeNull();
    });

    it("should throw error when removing non-existent connection", () => {
      expect(() => {
        connectionManager.removeConnection("nonexistent");
      }).toThrow('Connection "nonexistent" not found');
    });

    it("should clear default connection if removed", () => {
      connectionManager.setDefaultConnection("test1");
      expect(connectionManager.getDefaultConnectionName()).toBe("test1");

      connectionManager.removeConnection("test1");

      expect(connectionManager.getDefaultConnectionName()).toBeNull();
    });
  });

  describe("Switching Connections", () => {
    beforeEach(() => {
      connectionManager.addConnection("prod", {
        server: "192.168.1.1",
        database: "Production",
        user: "admin",
        password: "prodpass",
        version: "vLatest",
      });
      connectionManager.addConnection("staging", {
        server: "192.168.1.2",
        database: "Staging",
        user: "admin",
        password: "stagingpass",
        version: "vLatest",
      });
    });

    it("should switch to an existing connection", () => {
      connectionManager.switchToConnection("prod");
      const current = connectionManager.getCurrentConnection();

      expect(current).toBeDefined();
      expect(current?.database).toBe("Production");
    });

    it("should throw error when switching to non-existent connection", () => {
      expect(() => {
        connectionManager.switchToConnection("nonexistent");
      }).toThrow('Connection "nonexistent" not found');
    });

    it("should update current connection", () => {
      connectionManager.switchToConnection("prod");
      expect(connectionManager.getCurrentConnection()?.database).toBe("Production");

      connectionManager.switchToConnection("staging");
      expect(connectionManager.getCurrentConnection()?.database).toBe("Staging");
    });
  });

  describe("Default Connection", () => {
    beforeEach(() => {
      connectionManager.addConnection("primary", {
        server: "192.168.1.1",
        database: "Primary",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });
      connectionManager.addConnection("secondary", {
        server: "192.168.1.2",
        database: "Secondary",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });
    });

    it("should set default connection", () => {
      connectionManager.setDefaultConnection("primary");
      expect(connectionManager.getDefaultConnectionName()).toBe("primary");
    });

    it("should throw error when setting non-existent as default", () => {
      expect(() => {
        connectionManager.setDefaultConnection("nonexistent");
      }).toThrow('Connection "nonexistent" not found');
    });

    it("should get default connection", () => {
      connectionManager.setDefaultConnection("primary");
      const defaultConn = connectionManager.getDefaultConnection();

      expect(defaultConn).toBeDefined();
      expect(defaultConn?.database).toBe("Primary");
    });

    it("should return null when no default is set", () => {
      expect(connectionManager.getDefaultConnection()).toBeNull();
    });

    it("should persist default connection to file", () => {
      connectionManager.setDefaultConnection("primary");

      const connectionsFile = path.join(testConfigDir, "connections.json");
      const data = JSON.parse(fs.readFileSync(connectionsFile, "utf-8"));

      expect(data.defaultConnection).toBe("primary");
    });
  });

  describe("Listing Connections", () => {
    it("should return empty array when no connections", () => {
      expect(connectionManager.listConnections()).toEqual([]);
    });

    it("should list all connections", () => {
      connectionManager.addConnection("conn1", {
        server: "192.168.1.1",
        database: "DB1",
        user: "user1",
        password: "pass1",
        version: "vLatest",
      });
      connectionManager.addConnection("conn2", {
        server: "192.168.1.2",
        database: "DB2",
        user: "user2",
        password: "pass2",
        version: "vLatest",
      });

      const connections = connectionManager.listConnections();
      expect(connections).toHaveLength(2);
      expect(connections.map((c) => c.name)).toContain("conn1");
      expect(connections.map((c) => c.name)).toContain("conn2");
    });
  });

  describe("Validation", () => {
    it("should validate connection with all required fields", () => {
      const connection = {
        server: "192.168.1.1",
        database: "TestDB",
        user: "admin",
        password: "pass123",
        version: "vLatest",
      };

      const result = connectionManager.validateConnection(connection);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject connection missing server", () => {
      const connection = {
        server: "",
        database: "TestDB",
        user: "admin",
        password: "pass123",
        version: "vLatest",
      };

      const result = connectionManager.validateConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Server is required");
    });

    it("should reject connection missing database", () => {
      const connection = {
        server: "192.168.1.1",
        database: "",
        user: "admin",
        password: "pass123",
        version: "vLatest",
      };

      const result = connectionManager.validateConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Database is required");
    });

    it("should reject connection missing user", () => {
      const connection = {
        server: "192.168.1.1",
        database: "TestDB",
        user: "",
        password: "pass123",
        version: "vLatest",
      };

      const result = connectionManager.validateConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("User is required");
    });

    it("should reject connection missing password", () => {
      const connection = {
        server: "192.168.1.1",
        database: "TestDB",
        user: "admin",
        password: "",
        version: "vLatest",
      };

      const result = connectionManager.validateConnection(connection);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password is required");
    });
  });

  describe("File Permissions", () => {
    it("should create connections file with restricted permissions", () => {
      connectionManager.addConnection("test", {
        server: "192.168.1.1",
        database: "TestDB",
        user: "admin",
        password: "pass123",
        version: "vLatest",
      });

      const connectionsFile = path.join(testConfigDir, "connections.json");
      const stats = fs.statSync(connectionsFile);

      // Check that file has restricted permissions (0o600)
      // On Unix systems, this means owner read/write only
      expect((stats.mode & 0o777) & 0o077).toBe(0); // No group/other permissions
    });
  });
});
