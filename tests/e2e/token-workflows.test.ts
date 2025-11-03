import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { TokenManager, resetTokenManager } from "../../src/token-manager.js";

describe("Token Lifecycle End-to-End Workflows", () => {
  let tokenManager: TokenManager;
  let testConfigDir: string;

  beforeEach(() => {
    testConfigDir = path.join(os.tmpdir(), `token-e2e-test-${Date.now()}`);
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

  describe("Workflow 1: Complete Token Lifecycle", () => {
    it("should handle full token lifecycle: cache -> use -> refresh -> invalidate", () => {
      // Step 1: Cache token on login
      tokenManager.cacheToken("login-token", "prod-server", "ProdDB", "admin");
      expect(tokenManager.getToken("prod-server", "ProdDB", "admin")).toBe("login-token");

      // Step 2: Use token for multiple requests
      const token1 = tokenManager.getToken("prod-server", "ProdDB", "admin");
      const token2 = tokenManager.getToken("prod-server", "ProdDB", "admin");
      expect(token1).toBe(token2);

      // Step 3: Detect need for refresh
      const needsRefresh = tokenManager.needsRefresh("prod-server", "ProdDB", "admin");
      expect(typeof needsRefresh).toBe("boolean");

      // Step 4: Refresh token
      tokenManager.refreshToken("prod-server", "ProdDB", "admin");
      const info = tokenManager.getTokenInfo("prod-server", "ProdDB", "admin");
      expect(info?.refreshCount).toBe(1);

      // Step 5: Invalidate on logout
      tokenManager.invalidateToken("prod-server", "ProdDB", "admin");
      expect(tokenManager.getToken("prod-server", "ProdDB", "admin")).toBeNull();
    });
  });

  describe("Workflow 2: Multi-Database Token Management", () => {
    it("should manage tokens for multiple databases independently", () => {
      const databases = [
        { server: "server1", db: "ProdDB", user: "admin" },
        { server: "server2", db: "StagingDB", user: "user" },
        { server: "server3", db: "DevDB", user: "developer" },
      ];

      // Cache tokens for all databases
      databases.forEach((db, index) => {
        tokenManager.cacheToken(`token-${index}`, db.server, db.db, db.user);
      });

      // Verify all tokens are cached
      databases.forEach((db, index) => {
        const token = tokenManager.getToken(db.server, db.db, db.user);
        expect(token).toBe(`token-${index}`);
      });

      // Refresh one token
      tokenManager.refreshToken(databases[0].server, databases[0].db, databases[0].user);

      // Verify only one was refreshed
      const info0 = tokenManager.getTokenInfo(databases[0].server, databases[0].db, databases[0].user);
      const info1 = tokenManager.getTokenInfo(databases[1].server, databases[1].db, databases[1].user);

      expect(info0?.refreshCount).toBe(1);
      expect(info1?.refreshCount).toBe(0);

      // Invalidate one token
      tokenManager.invalidateToken(databases[0].server, databases[0].db, databases[0].user);

      // Verify only one was invalidated
      expect(tokenManager.getToken(databases[0].server, databases[0].db, databases[0].user)).toBeNull();
      expect(tokenManager.getToken(databases[1].server, databases[1].db, databases[1].user)).toBe("token-1");
    });
  });

  describe("Workflow 3: Token Expiration and Refresh", () => {
    it("should detect expiring tokens and refresh them", () => {
      // Cache token with short TTL (4 minutes, within refresh buffer)
      const fourMinutes = 4 * 60 * 1000;
      tokenManager.cacheToken("expiring-token", "server", "db", "user", fourMinutes);

      // Check if refresh is needed
      expect(tokenManager.needsRefresh("server", "db", "user")).toBe(true);

      // Refresh the token
      tokenManager.refreshToken("server", "db", "user", 20 * 60 * 1000);

      // Verify refresh was successful
      expect(tokenManager.needsRefresh("server", "db", "user")).toBe(false);
      const info = tokenManager.getTokenInfo("server", "db", "user");
      expect(info?.expiresIn).toBeGreaterThan(15 * 60 * 1000);
    });
  });

  describe("Workflow 4: Error Recovery - 401 Handling", () => {
    it("should handle 401 error by invalidating and re-authenticating", () => {
      // Step 1: Cache token
      tokenManager.cacheToken("auth-token", "server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBe("auth-token");

      // Step 2: Simulate 401 error - invalidate token
      tokenManager.invalidateToken("server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBeNull();

      // Step 3: Re-authenticate with new token
      tokenManager.cacheToken("new-auth-token", "server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBe("new-auth-token");

      // Step 4: Verify new token works
      const token = tokenManager.getToken("server", "db", "user");
      expect(token).toBe("new-auth-token");
    });
  });

  describe("Workflow 5: Session Persistence", () => {
    it("should persist and recover token state across sessions", () => {
      // Session 1: Cache tokens
      tokenManager.cacheToken("session1-token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("session1-token-2", "server2", "db2", "user2");
      tokenManager.refreshToken("server1", "db1", "user1");

      // Verify stats
      let stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(2);

      // Session 2: Load from file
      const newManager = new TokenManager(testConfigDir);

      // Verify tokens are recovered
      expect(newManager.getToken("server1", "db1", "user1")).toBe("session1-token-1");
      expect(newManager.getToken("server2", "db2", "user2")).toBe("session1-token-2");

      // Verify refresh count is preserved
      const info = newManager.getTokenInfo("server1", "db1", "user1");
      expect(info?.refreshCount).toBe(1);

      // Verify stats
      stats = newManager.getStats();
      expect(stats.totalCached).toBe(2);
    });
  });

  describe("Workflow 6: Concurrent Multi-User Access", () => {
    it("should handle multiple users accessing different databases", () => {
      const users = [
        { server: "server", db: "ProdDB", user: "admin" },
        { server: "server", db: "ProdDB", user: "viewer" },
        { server: "server", db: "TestDB", user: "admin" },
      ];

      // Each user logs in
      users.forEach((u, index) => {
        tokenManager.cacheToken(`token-${index}`, u.server, u.db, u.user);
      });

      // Each user makes requests
      users.forEach((u, index) => {
        const token = tokenManager.getToken(u.server, u.db, u.user);
        expect(token).toBe(`token-${index}`);
      });

      // One user's token expires
      tokenManager.invalidateToken(users[0].server, users[0].db, users[0].user);

      // Other users' tokens still work
      expect(tokenManager.getToken(users[1].server, users[1].db, users[1].user)).toBe("token-1");
      expect(tokenManager.getToken(users[2].server, users[2].db, users[2].user)).toBe("token-2");

      // First user re-authenticates
      tokenManager.cacheToken("token-0-new", users[0].server, users[0].db, users[0].user);
      expect(tokenManager.getToken(users[0].server, users[0].db, users[0].user)).toBe("token-0-new");
    });
  });

  describe("Workflow 7: Token Refresh Cascade", () => {
    it("should handle multiple tokens needing refresh", () => {
      const fourMinutes = 4 * 60 * 1000;

      // Cache multiple tokens with short TTL
      tokenManager.cacheToken("token-1", "server1", "db1", "user1", fourMinutes);
      tokenManager.cacheToken("token-2", "server2", "db2", "user2", fourMinutes);
      tokenManager.cacheToken("token-3", "server3", "db3", "user3", fourMinutes);

      // All should need refresh
      expect(tokenManager.needsRefresh("server1", "db1", "user1")).toBe(true);
      expect(tokenManager.needsRefresh("server2", "db2", "user2")).toBe(true);
      expect(tokenManager.needsRefresh("server3", "db3", "user3")).toBe(true);

      // Refresh all
      tokenManager.refreshToken("server1", "db1", "user1", 20 * 60 * 1000);
      tokenManager.refreshToken("server2", "db2", "user2", 20 * 60 * 1000);
      tokenManager.refreshToken("server3", "db3", "user3", 20 * 60 * 1000);

      // None should need refresh now
      expect(tokenManager.needsRefresh("server1", "db1", "user1")).toBe(false);
      expect(tokenManager.needsRefresh("server2", "db2", "user2")).toBe(false);
      expect(tokenManager.needsRefresh("server3", "db3", "user3")).toBe(false);

      // Verify refresh counts
      const info1 = tokenManager.getTokenInfo("server1", "db1", "user1");
      const info2 = tokenManager.getTokenInfo("server2", "db2", "user2");
      const info3 = tokenManager.getTokenInfo("server3", "db3", "user3");

      expect(info1?.refreshCount).toBe(1);
      expect(info2?.refreshCount).toBe(1);
      expect(info3?.refreshCount).toBe(1);
    });
  });

  describe("Workflow 8: Complete Cleanup and Reset", () => {
    it("should handle complete cleanup and fresh start", () => {
      // Setup: Cache multiple tokens
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");
      tokenManager.refreshToken("server1", "db1", "user1");

      let stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(2);

      // Cleanup: Clear all
      tokenManager.clearAll();

      stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(0);

      // Fresh start: Cache new tokens
      tokenManager.cacheToken("new-token-1", "new-server1", "newdb1", "newuser1");
      tokenManager.cacheToken("new-token-2", "new-server2", "newdb2", "newuser2");

      stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(2);

      // Verify new tokens work
      expect(tokenManager.getToken("new-server1", "newdb1", "newuser1")).toBe("new-token-1");
      expect(tokenManager.getToken("new-server2", "newdb2", "newuser2")).toBe("new-token-2");
    });
  });

  describe("Workflow 9: Security and Audit Trail", () => {
    it("should maintain secure token management with audit trail", () => {
      // Cache token
      tokenManager.cacheToken("secret-token", "server", "db", "user");

      // Get token info (audit trail)
      const info = tokenManager.getTokenInfo("server", "db", "user");
      expect(info).toBeDefined();
      expect(info?.createdAt).toBeDefined();
      expect(info?.expiresAt).toBeDefined();

      // Verify token is not exposed in info
      expect(JSON.stringify(info)).not.toContain("secret-token");

      // Verify file permissions
      const tokensPath = tokenManager.getTokensFilePath();
      const stats = fs.statSync(tokensPath);
      const mode = stats.mode & parseInt("777", 8);
      expect(mode).toBe(parseInt("600", 8));

      // Refresh and verify audit trail updates
      tokenManager.refreshToken("server", "db", "user");
      const infoAfter = tokenManager.getTokenInfo("server", "db", "user");
      expect(infoAfter?.refreshCount).toBe(1);
    });
  });
});
