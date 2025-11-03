import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { TokenManager, resetTokenManager } from "../../src/token-manager.js";

describe("Token Lifecycle Integration", () => {
  let tokenManager: TokenManager;
  let testConfigDir: string;

  beforeEach(() => {
    testConfigDir = path.join(os.tmpdir(), `token-lifecycle-test-${Date.now()}`);
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    tokenManager = new TokenManager(testConfigDir);
    resetTokenManager();
  });

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe("Token Caching with Multiple Credentials", () => {
    it("should cache tokens for multiple database connections", () => {
      const connections = [
        { server: "prod-server", db: "ProdDB", user: "admin" },
        { server: "staging-server", db: "StagingDB", user: "user" },
        { server: "dev-server", db: "DevDB", user: "developer" },
      ];

      connections.forEach((conn, index) => {
        tokenManager.cacheToken(`token-${index}`, conn.server, conn.db, conn.user);
      });

      connections.forEach((conn, index) => {
        const token = tokenManager.getToken(conn.server, conn.db, conn.user);
        expect(token).toBe(`token-${index}`);
      });
    });

    it("should maintain separate tokens for same server, different databases", () => {
      tokenManager.cacheToken("prod-token", "server", "ProdDB", "admin");
      tokenManager.cacheToken("test-token", "server", "TestDB", "admin");

      expect(tokenManager.getToken("server", "ProdDB", "admin")).toBe("prod-token");
      expect(tokenManager.getToken("server", "TestDB", "admin")).toBe("test-token");
    });

    it("should maintain separate tokens for same database, different users", () => {
      tokenManager.cacheToken("admin-token", "server", "db", "admin");
      tokenManager.cacheToken("user-token", "server", "db", "user");

      expect(tokenManager.getToken("server", "db", "admin")).toBe("admin-token");
      expect(tokenManager.getToken("server", "db", "user")).toBe("user-token");
    });
  });

  describe("Token Refresh Workflow", () => {
    it("should detect and refresh expiring tokens", () => {
      const fourMinutes = 4 * 60 * 1000;
      tokenManager.cacheToken("token", "server", "db", "user", fourMinutes);

      expect(tokenManager.needsRefresh("server", "db", "user")).toBe(true);

      tokenManager.refreshToken("server", "db", "user", 20 * 60 * 1000);

      expect(tokenManager.needsRefresh("server", "db", "user")).toBe(false);
    });

    it("should track refresh count across multiple refreshes", () => {
      tokenManager.cacheToken("token", "server", "db", "user");

      for (let i = 0; i < 5; i++) {
        tokenManager.refreshToken("server", "db", "user");
        const info = tokenManager.getTokenInfo("server", "db", "user");
        expect(info?.refreshCount).toBe(i + 1);
      }
    });

    it("should handle refresh of multiple tokens independently", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1", 6 * 60 * 1000);
      tokenManager.cacheToken("token-2", "server2", "db2", "user2", 20 * 60 * 1000);

      tokenManager.refreshToken("server1", "db1", "user1");

      const info1 = tokenManager.getTokenInfo("server1", "db1", "user1");
      const info2 = tokenManager.getTokenInfo("server2", "db2", "user2");

      expect(info1?.refreshCount).toBe(1);
      expect(info2?.refreshCount).toBe(0);
    });
  });

  describe("Token Invalidation Workflow", () => {
    it("should invalidate token on logout", () => {
      tokenManager.cacheToken("token", "server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBe("token");

      tokenManager.invalidateToken("server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBeNull();
    });

    it("should allow re-caching after invalidation", () => {
      tokenManager.cacheToken("old-token", "server", "db", "user");
      tokenManager.invalidateToken("server", "db", "user");

      tokenManager.cacheToken("new-token", "server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBe("new-token");
    });

    it("should invalidate token on 401 error", () => {
      tokenManager.cacheToken("token", "server", "db", "user");

      // Simulate 401 error by invalidating
      tokenManager.invalidateToken("server", "db", "user");

      expect(tokenManager.getToken("server", "db", "user")).toBeNull();
    });
  });

  describe("Token Persistence Workflow", () => {
    it("should persist and recover token state", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");

      const newManager = new TokenManager(testConfigDir);

      expect(newManager.getToken("server1", "db1", "user1")).toBe("token-1");
      expect(newManager.getToken("server2", "db2", "user2")).toBe("token-2");
    });

    it("should persist refresh count across sessions", () => {
      tokenManager.cacheToken("token", "server", "db", "user");
      tokenManager.refreshToken("server", "db", "user");
      tokenManager.refreshToken("server", "db", "user");

      const newManager = new TokenManager(testConfigDir);
      const info = newManager.getTokenInfo("server", "db", "user");

      expect(info?.refreshCount).toBe(2);
    });

    it("should handle corrupted token file gracefully", () => {
      tokenManager.cacheToken("token", "server", "db", "user");

      const tokensPath = tokenManager.getTokensFilePath();
      fs.writeFileSync(tokensPath, "invalid json");

      const newManager = new TokenManager(testConfigDir);
      const stats = newManager.getStats();

      expect(stats.totalCached).toBe(0);
    });
  });

  describe("Error Recovery Workflow", () => {
    it("should handle 401 error by invalidating and allowing re-auth", () => {
      tokenManager.cacheToken("token", "server", "db", "user");

      // Simulate 401 error
      tokenManager.invalidateToken("server", "db", "user");

      // Should be able to cache new token
      tokenManager.cacheToken("new-token", "server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBe("new-token");
    });

    it("should handle multiple failed attempts", () => {
      tokenManager.cacheToken("token", "server", "db", "user");

      // First attempt fails
      tokenManager.invalidateToken("server", "db", "user");
      tokenManager.cacheToken("retry-1", "server", "db", "user");

      // Second attempt fails
      tokenManager.invalidateToken("server", "db", "user");
      tokenManager.cacheToken("retry-2", "server", "db", "user");

      expect(tokenManager.getToken("server", "db", "user")).toBe("retry-2");
    });
  });

  describe("Concurrent Token Operations", () => {
    it("should handle rapid token operations", () => {
      const operations = [];

      for (let i = 0; i < 10; i++) {
        operations.push(() => {
          tokenManager.cacheToken(`token-${i}`, `server-${i}`, `db-${i}`, `user-${i}`);
        });
      }

      operations.forEach((op) => op());

      const stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(10);
    });

    it("should handle interleaved cache and invalidate operations", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");

      tokenManager.invalidateToken("server1", "db1", "user1");

      tokenManager.cacheToken("token-3", "server3", "db3", "user3");

      expect(tokenManager.getToken("server1", "db1", "user1")).toBeNull();
      expect(tokenManager.getToken("server2", "db2", "user2")).toBe("token-2");
      expect(tokenManager.getToken("server3", "db3", "user3")).toBe("token-3");
    });
  });

  describe("Token Statistics Workflow", () => {
    it("should track statistics accurately during lifecycle", () => {
      const twentyMinutes = 20 * 60 * 1000;

      tokenManager.cacheToken("token-1", "server1", "db1", "user1", twentyMinutes);
      let stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(1);
      expect(stats.validTokens).toBe(1);

      tokenManager.cacheToken("token-2", "server2", "db2", "user2", twentyMinutes);
      stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(2);
      expect(stats.validTokens).toBe(2);

      tokenManager.invalidateToken("server1", "db1", "user1");
      stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(1);
      expect(stats.validTokens).toBe(1);
    });
  });

  describe("Token Cleanup Workflow", () => {
    it("should clear all tokens and remove file", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");

      const tokensPath = tokenManager.getTokensFilePath();
      expect(fs.existsSync(tokensPath)).toBe(true);

      tokenManager.clearAll();

      expect(fs.existsSync(tokensPath)).toBe(false);
      const stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(0);
    });

    it("should allow caching after clear", () => {
      tokenManager.cacheToken("token", "server", "db", "user");
      tokenManager.clearAll();

      tokenManager.cacheToken("new-token", "server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBe("new-token");
    });
  });

  describe("Security Workflow", () => {
    it("should maintain file permissions after multiple operations", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");
      tokenManager.refreshToken("server1", "db1", "user1");

      const tokensPath = tokenManager.getTokensFilePath();
      const stats = fs.statSync(tokensPath);
      const mode = stats.mode & parseInt("777", 8);

      expect(mode).toBe(parseInt("600", 8));
    });

    it("should not expose tokens in error messages", () => {
      tokenManager.cacheToken("secret-token", "server", "db", "user");
      const info = tokenManager.getTokenInfo("server", "db", "user");

      // Token should not be in info
      expect(JSON.stringify(info)).not.toContain("secret-token");
    });
  });
});
