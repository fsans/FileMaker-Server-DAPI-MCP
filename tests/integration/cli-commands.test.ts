/**
 * Integration Tests for CLI Commands
 * Tests CLI command execution and configuration management
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import {
  addConnection,
  removeConnection,
  listConnections,
  getConnection,
  setDefaultConnection,
  getDefaultConnectionName,
} from "../../src/config.js";

describe("CLI Commands Integration", () => {
  let testConfigDir: string;
  let originalHomeDir: string;

  beforeEach(() => {
    // Create temporary directory for testing with more uniqueness
    testConfigDir = path.join(os.tmpdir(), `fm-cli-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }

    // Mock home directory for config
    originalHomeDir = process.env.HOME || "";
    process.env.HOME = testConfigDir;
  });

  afterEach(() => {
    // Restore original home directory
    if (originalHomeDir) {
      process.env.HOME = originalHomeDir;
    }

    // Clean up temporary directory
    if (fs.existsSync(testConfigDir)) {
      try {
        fs.rmSync(testConfigDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe("add-connection command", () => {
    it("should add a connection via config function", () => {
      addConnection("production", {
        server: "192.168.1.1",
        database: "Sales",
        user: "admin",
        password: "pass123",
        version: "vLatest",
      });

      const conn = getConnection("production");
      expect(conn).toBeDefined();
      expect(conn?.server).toBe("192.168.1.1");
      expect(conn?.database).toBe("Sales");
    });

    it("should reject duplicate connection names", () => {
      addConnection("prod", {
        server: "192.168.1.1",
        database: "DB1",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });

      expect(() => {
        addConnection("prod", {
          server: "192.168.1.2",
          database: "DB2",
          user: "admin",
          password: "pass",
          version: "vLatest",
        });
      }).toThrow();
    });
  });

  describe("remove-connection command", () => {
    beforeEach(() => {
      addConnection("test1", {
        server: "192.168.1.1",
        database: "DB1",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });
      addConnection("test2", {
        server: "192.168.1.2",
        database: "DB2",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });
    });

    it("should remove a connection", () => {
      expect(listConnections()).toHaveLength(2);

      removeConnection("test1");

      expect(listConnections()).toHaveLength(1);
      expect(getConnection("test1")).toBeNull();
    });

    it("should throw error when removing non-existent connection", () => {
      expect(() => {
        removeConnection("nonexistent");
      }).toThrow();
    });
  });

  describe("list-connections command", () => {
    it("should list all connections", () => {
      addConnection("conn1", {
        server: "192.168.1.1",
        database: "DB1",
        user: "user1",
        password: "pass1",
        version: "vLatest",
      });
      addConnection("conn2", {
        server: "192.168.1.2",
        database: "DB2",
        user: "user2",
        password: "pass2",
        version: "vLatest",
      });

      const connections = listConnections();
      expect(connections).toHaveLength(2);
      expect(connections.map((c) => c.name)).toContain("conn1");
      expect(connections.map((c) => c.name)).toContain("conn2");
    });

    it("should return empty list when no connections", () => {
      const connections = listConnections();
      expect(connections).toHaveLength(0);
    });
  });

  describe("set-default command", () => {
    beforeEach(() => {
      addConnection("primary", {
        server: "192.168.1.1",
        database: "Primary",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });
      addConnection("secondary", {
        server: "192.168.1.2",
        database: "Secondary",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });
    });

    it("should set default connection", () => {
      setDefaultConnection("primary");
      expect(getDefaultConnectionName()).toBe("primary");
    });

    it("should throw error when setting non-existent as default", () => {
      expect(() => {
        setDefaultConnection("nonexistent");
      }).toThrow();
    });

    it("should change default connection", () => {
      setDefaultConnection("primary");
      expect(getDefaultConnectionName()).toBe("primary");

      setDefaultConnection("secondary");
      expect(getDefaultConnectionName()).toBe("secondary");
    });
  });

  describe("config show command", () => {
    it("should display configuration", () => {
      addConnection("test", {
        server: "192.168.1.1",
        database: "TestDB",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });

      setDefaultConnection("test");

      const conn = getConnection("test");
      expect(conn).toBeDefined();
      expect(conn?.name).toBe("test");
    });
  });

  describe("Connection Persistence", () => {
    it("should persist connections across instances", () => {
      addConnection("persistent", {
        server: "192.168.1.1",
        database: "PersistentDB",
        user: "admin",
        password: "pass",
        version: "vLatest",
      });

      setDefaultConnection("persistent");

      // Simulate new instance by checking file
      const configDir = path.join(testConfigDir, ".filemaker-mcp");
      const configFile = path.join(configDir, "config.json");

      expect(fs.existsSync(configFile)).toBe(true);

      const data = JSON.parse(fs.readFileSync(configFile, "utf-8"));
      expect(data.connections.persistent).toBeDefined();
      expect(data.defaultConnection).toBe("persistent");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid connection data", () => {
      expect(() => {
        addConnection("invalid", {
          server: "",
          database: "",
          user: "",
          password: "",
          version: "vLatest",
        });
      }).toThrow();
    });

    it("should handle missing required fields", () => {
      expect(() => {
        addConnection("incomplete", {
          server: "192.168.1.1",
          database: "DB",
          user: "admin",
          password: "",
          version: "vLatest",
        });
      }).toThrow();
    });
  });
});
