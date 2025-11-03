import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { TokenManager, resetTokenManager } from "../../src/token-manager.js";

describe("TokenManager", () => {
  let tokenManager: TokenManager;
  let testConfigDir: string;

  beforeEach(() => {
    testConfigDir = path.join(os.tmpdir(), `token-manager-test-${Date.now()}`);
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

  describe("Initialization", () => {
    it("should initialize with empty tokens", () => {
      const stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(0);
      expect(stats.validTokens).toBe(0);
      expect(stats.expiredTokens).toBe(0);
    });

    it("should create config directory when caching tokens", () => {
      const newDir = path.join(os.tmpdir(), `token-manager-new-${Date.now()}-${Math.random()}`);
      try {
        const manager = new TokenManager(newDir);
        // Directory is created when tokens are cached
        manager.cacheToken("token", "server", "db", "user");
        expect(fs.existsSync(newDir)).toBe(true);
      } finally {
        if (fs.existsSync(newDir)) {
          fs.rmSync(newDir, { recursive: true, force: true });
        }
      }
    });

    it("should create tokens file path correctly", () => {
      const tokensPath = tokenManager.getTokensFilePath();
      expect(tokensPath).toContain("tokens.json");
    });
  });

  describe("Token Caching", () => {
    it("should cache a token with default TTL", () => {
      tokenManager.cacheToken("test-token-123", "192.168.1.1", "TestDB", "admin");
      const token = tokenManager.getToken("192.168.1.1", "TestDB", "admin");
      expect(token).toBe("test-token-123");
    });

    it("should cache a token with custom TTL", () => {
      const customTTL = 30 * 60 * 1000;
      tokenManager.cacheToken("test-token-456", "192.168.1.2", "ProdDB", "user", customTTL);
      const token = tokenManager.getToken("192.168.1.2", "ProdDB", "user");
      expect(token).toBe("test-token-456");
    });

    it("should return null for non-existent token", () => {
      const token = tokenManager.getToken("192.168.1.99", "NonExistent", "nobody");
      expect(token).toBeNull();
    });

    it("should cache multiple tokens for different credentials", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");

      expect(tokenManager.getToken("server1", "db1", "user1")).toBe("token-1");
      expect(tokenManager.getToken("server2", "db2", "user2")).toBe("token-2");
    });

    it("should overwrite existing token for same credentials", () => {
      tokenManager.cacheToken("old-token", "server", "db", "user");
      tokenManager.cacheToken("new-token", "server", "db", "user");

      const token = tokenManager.getToken("server", "db", "user");
      expect(token).toBe("new-token");
    });
  });

  describe("Token Expiration", () => {
    it("should detect tokens needing refresh", () => {
      // 4 minutes TTL (within 5 minute buffer)
      const fourMinutes = 4 * 60 * 1000;
      tokenManager.cacheToken("refresh-token", "server", "db", "user", fourMinutes);

      const needsRefresh = tokenManager.needsRefresh("server", "db", "user");
      expect(needsRefresh).toBe(true);
    });

    it("should not mark fresh tokens for refresh", () => {
      // 20 minutes TTL (outside 5 minute buffer)
      const twentyMinutes = 20 * 60 * 1000;
      tokenManager.cacheToken("fresh-token", "server", "db", "user", twentyMinutes);

      const needsRefresh = tokenManager.needsRefresh("server", "db", "user");
      expect(needsRefresh).toBe(false);
    });

    it("should return false for non-existent token refresh check", () => {
      const needsRefresh = tokenManager.needsRefresh("server", "db", "user");
      expect(needsRefresh).toBe(false);
    });
  });

  describe("Token Refresh", () => {
    it("should refresh token expiry time", () => {
      tokenManager.cacheToken("token", "server", "db", "user", 1000);
      const infoBefore = tokenManager.getTokenInfo("server", "db", "user");
      const expiresInBefore = infoBefore?.expiresIn || 0;

      tokenManager.refreshToken("server", "db", "user", 30 * 60 * 1000);
      const infoAfter = tokenManager.getTokenInfo("server", "db", "user");
      const expiresInAfter = infoAfter?.expiresIn || 0;

      expect(expiresInAfter).toBeGreaterThan(expiresInBefore);
    });

    it("should increment refresh count on refresh", () => {
      tokenManager.cacheToken("token", "server", "db", "user");
      const infoBefore = tokenManager.getTokenInfo("server", "db", "user");
      expect(infoBefore?.refreshCount).toBe(0);

      tokenManager.refreshToken("server", "db", "user");
      const infoAfter = tokenManager.getTokenInfo("server", "db", "user");
      expect(infoAfter?.refreshCount).toBe(1);
    });

    it("should handle refresh of non-existent token gracefully", () => {
      expect(() => {
        tokenManager.refreshToken("server", "db", "user");
      }).not.toThrow();
    });
  });

  describe("Token Invalidation", () => {
    it("should invalidate a cached token", () => {
      tokenManager.cacheToken("token", "server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBe("token");

      tokenManager.invalidateToken("server", "db", "user");
      expect(tokenManager.getToken("server", "db", "user")).toBeNull();
    });

    it("should handle invalidation of non-existent token", () => {
      expect(() => {
        tokenManager.invalidateToken("server", "db", "user");
      }).not.toThrow();
    });

    it("should not affect other tokens when invalidating one", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");

      tokenManager.invalidateToken("server1", "db1", "user1");

      expect(tokenManager.getToken("server1", "db1", "user1")).toBeNull();
      expect(tokenManager.getToken("server2", "db2", "user2")).toBe("token-2");
    });
  });

  describe("Token Information", () => {
    it("should return token info with all fields", () => {
      tokenManager.cacheToken("token", "server", "db", "user");
      const info = tokenManager.getTokenInfo("server", "db", "user");

      expect(info).toBeDefined();
      expect(info?.server).toBe("server");
      expect(info?.database).toBe("db");
      expect(info?.user).toBe("user");
      expect(info?.createdAt).toBeDefined();
      expect(info?.expiresAt).toBeDefined();
      expect(info?.expiresIn).toBeDefined();
      expect(info?.refreshCount).toBe(0);
    });

    it("should return null for non-existent token info", () => {
      const info = tokenManager.getTokenInfo("server", "db", "user");
      expect(info).toBeNull();
    });

    it("should calculate expiresIn correctly", () => {
      tokenManager.cacheToken("token", "server", "db", "user");
      const info = tokenManager.getTokenInfo("server", "db", "user");

      expect(info?.expiresIn).toBeGreaterThan(0);
      expect(info?.expiresIn).toBeLessThanOrEqual(15 * 60 * 1000);
    });
  });

  describe("File Persistence", () => {
    it("should persist tokens to file", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");

      const tokensPath = tokenManager.getTokensFilePath();
      expect(fs.existsSync(tokensPath)).toBe(true);

      const fileContent = fs.readFileSync(tokensPath, "utf-8");
      const data = JSON.parse(fileContent);
      expect(Object.keys(data.tokens).length).toBe(2);
    });

    it("should load tokens from file on initialization", () => {
      tokenManager.cacheToken("token", "server", "db", "user");

      const newManager = new TokenManager(testConfigDir);
      const token = newManager.getToken("server", "db", "user");
      expect(token).toBe("token");
    });

    it("should set restricted file permissions", () => {
      tokenManager.cacheToken("token", "server", "db", "user");

      const tokensPath = tokenManager.getTokensFilePath();
      const stats = fs.statSync(tokensPath);
      const mode = stats.mode & parseInt("777", 8);

      expect(mode).toBe(parseInt("600", 8));
    });
  });

  describe("Statistics", () => {
    it("should track total cached tokens", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");

      const stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(2);
    });

    it("should track valid tokens", () => {
      const twentyMinutes = 20 * 60 * 1000;
      tokenManager.cacheToken("token", "server", "db", "user", twentyMinutes);

      const stats = tokenManager.getStats();
      expect(stats.validTokens).toBe(1);
      expect(stats.expiredTokens).toBe(0);
    });

    it("should return correct stats for empty cache", () => {
      const stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(0);
      expect(stats.validTokens).toBe(0);
      expect(stats.expiredTokens).toBe(0);
    });
  });

  describe("Clear All", () => {
    it("should clear all cached tokens", () => {
      tokenManager.cacheToken("token-1", "server1", "db1", "user1");
      tokenManager.cacheToken("token-2", "server2", "db2", "user2");

      tokenManager.clearAll();

      const stats = tokenManager.getStats();
      expect(stats.totalCached).toBe(0);
    });

    it("should delete tokens file when clearing all", () => {
      tokenManager.cacheToken("token", "server", "db", "user");
      const tokensPath = tokenManager.getTokensFilePath();

      expect(fs.existsSync(tokensPath)).toBe(true);

      tokenManager.clearAll();

      expect(fs.existsSync(tokensPath)).toBe(false);
    });
  });
});
