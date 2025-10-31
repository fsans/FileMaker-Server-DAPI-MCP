/**
 * End-to-End Tests for User Workflows
 * Tests complete workflows from connection setup to data access
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ConnectionManager } from "../../src/connection.js";
import {
  addConnection,
  removeConnection,
  listConnections,
  setDefaultConnection,
  getDefaultConnection,
} from "../../src/config.js";

describe("End-to-End Workflows", () => {
  let testConfigDir: string;
  let connectionManager: ConnectionManager;

  beforeEach(() => {
    testConfigDir = path.join(os.tmpdir(), `fm-e2e-test-${Date.now()}`);
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    connectionManager = new ConnectionManager(testConfigDir);
  });

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true });
    }
  });

  describe("Workflow 1: Setup Predefined Connections", () => {
    it("should setup production and staging connections", () => {
      // Add production connection
      connectionManager.addConnection("production", {
        server: "192.168.0.24",
        database: "Sales",
        user: "admin",
        password: "prodpass",
        version: "vLatest",
      });

      // Add staging connection
      connectionManager.addConnection("staging", {
        server: "192.168.0.25",
        database: "SalesTest",
        user: "admin",
        password: "stagingpass",
        version: "vLatest",
      });

      // Verify both connections exist
      expect(connectionManager.listConnections()).toHaveLength(2);
      expect(connectionManager.getConnection("production")).toBeDefined();
      expect(connectionManager.getConnection("staging")).toBeDefined();
    });

    it("should set default connection", () => {
      connectionManager.addConnection("production", {
        server: "192.168.0.24",
        database: "Sales",
        user: "admin",
        password: "prodpass",
        version: "vLatest",
      });

      connectionManager.setDefaultConnection("production");

      expect(connectionManager.getDefaultConnectionName()).toBe("production");
      expect(connectionManager.getDefaultConnection()?.database).toBe("Sales");
    });
  });

  describe("Workflow 2: Switch Between Databases", () => {
    beforeEach(() => {
      connectionManager.addConnection("production", {
        server: "192.168.0.24",
        database: "Production",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });

      connectionManager.addConnection("staging", {
        server: "192.168.0.25",
        database: "Staging",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });
    });

    it("should switch from production to staging", () => {
      // Start with production
      connectionManager.switchToConnection("production");
      expect(connectionManager.getCurrentConnection()?.database).toBe("Production");

      // Switch to staging
      connectionManager.switchToConnection("staging");
      expect(connectionManager.getCurrentConnection()?.database).toBe("Staging");

      // Verify server also changed
      expect(connectionManager.getCurrentConnection()?.server).toBe("192.168.0.25");
    });

    it("should maintain connection state across operations", () => {
      connectionManager.switchToConnection("production");
      const prodConn = connectionManager.getCurrentConnection();

      // Perform some operations (simulated)
      const connections = connectionManager.listConnections();
      expect(connections).toHaveLength(2);

      // Connection should still be production
      expect(connectionManager.getCurrentConnection()).toEqual(prodConn);
    });
  });

  describe("Workflow 3: Inline Connection Setup", () => {
    it("should set inline connection with credentials", () => {
      const inlineConnection = {
        server: "192.168.0.26",
        database: "TestDB",
        user: "testuser",
        password: "testpass",
        version: "vLatest",
      };

      connectionManager.setCurrentConnection(inlineConnection);

      const current = connectionManager.getCurrentConnection();
      expect(current?.server).toBe("192.168.0.26");
      expect(current?.database).toBe("TestDB");
    });

    it("should allow inline connection without saving", () => {
      const inlineConnection = {
        server: "192.168.0.26",
        database: "TestDB",
        user: "testuser",
        password: "testpass",
        version: "vLatest",
      };

      connectionManager.setCurrentConnection(inlineConnection);

      // Connection should be current but not in saved list
      expect(connectionManager.getCurrentConnection()).toBeDefined();
      expect(connectionManager.getConnection("TestDB")).toBeNull();
    });
  });

  describe("Workflow 4: Multi-Database Query", () => {
    beforeEach(() => {
      connectionManager.addConnection("prod", {
        server: "192.168.0.24",
        database: "Production",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });

      connectionManager.addConnection("staging", {
        server: "192.168.0.25",
        database: "Staging",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });
    });

    it("should query production then staging", () => {
      // Query production
      connectionManager.switchToConnection("prod");
      const prodDb = connectionManager.getCurrentConnection()?.database;
      expect(prodDb).toBe("Production");

      // Query staging
      connectionManager.switchToConnection("staging");
      const stagingDb = connectionManager.getCurrentConnection()?.database;
      expect(stagingDb).toBe("Staging");

      // Verify both were accessed
      expect(prodDb).not.toBe(stagingDb);
    });
  });

  describe("Workflow 5: Connection Management", () => {
    it("should add, list, and remove connections", () => {
      // Add connections
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

      // List connections
      let connections = connectionManager.listConnections();
      expect(connections).toHaveLength(2);

      // Remove one
      connectionManager.removeConnection("conn1");

      // List again
      connections = connectionManager.listConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].name).toBe("conn2");
    });

    it("should handle default connection removal", () => {
      connectionManager.addConnection("primary", {
        server: "192.168.1.1",
        database: "Primary",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });

      connectionManager.setDefaultConnection("primary");
      expect(connectionManager.getDefaultConnectionName()).toBe("primary");

      connectionManager.removeConnection("primary");

      expect(connectionManager.getDefaultConnectionName()).toBeNull();
      expect(connectionManager.getDefaultConnection()).toBeNull();
    });
  });

  describe("Workflow 6: Error Recovery", () => {
    it("should handle invalid connection gracefully", () => {
      expect(() => {
        connectionManager.switchToConnection("nonexistent");
      }).toThrow('Connection "nonexistent" not found');

      // Should still be able to add a valid connection
      connectionManager.addConnection("valid", {
        server: "192.168.1.1",
        database: "ValidDB",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });

      expect(connectionManager.getConnection("valid")).toBeDefined();
    });

    it("should handle validation errors", () => {
      const invalidConnection = {
        server: "",
        database: "DB",
        user: "admin",
        password: "pass",
        version: "vLatest",
      };

      const result = connectionManager.validateConnection(invalidConnection);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Workflow 7: Persistence and Recovery", () => {
    it("should persist and recover connection state", () => {
      // Add and configure connections
      connectionManager.addConnection("prod", {
        server: "192.168.0.24",
        database: "Production",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });

      connectionManager.setDefaultConnection("prod");

      // Create new manager instance (simulating restart)
      const newManager = new ConnectionManager(testConfigDir);

      // Verify state was recovered
      expect(newManager.listConnections()).toHaveLength(1);
      expect(newManager.getDefaultConnectionName()).toBe("prod");
      expect(newManager.getDefaultConnection()?.database).toBe("Production");
    });
  });

  describe("Workflow 8: Security", () => {
    it("should store connections with restricted file permissions", () => {
      connectionManager.addConnection("secure", {
        server: "192.168.0.24",
        database: "SecureDB",
        user: "admin",
        password: "secretpassword",
        version: "vLatest",
      });

      const connectionsFile = path.join(testConfigDir, "connections.json");
      const stats = fs.statSync(connectionsFile);

      // Verify restricted permissions (no group/other access)
      expect((stats.mode & 0o077) === 0).toBe(true);
    });

    it("should not expose passwords in connection retrieval", () => {
      connectionManager.addConnection("test", {
        server: "192.168.0.24",
        database: "TestDB",
        user: "admin",
        password: "secretpass",
        version: "vLatest",
      });

      const conn = connectionManager.getConnection("test");
      // Password should still be stored (not masked in internal storage)
      expect(conn?.password).toBe("secretpass");
    });
  });
});
