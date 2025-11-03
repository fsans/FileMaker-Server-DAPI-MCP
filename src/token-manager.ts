import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { loggers } from "./logger.js";

/**
 * Represents a cached token with metadata
 */
export interface CachedToken {
  token: string;
  server: string;
  database: string;
  user: string;
  expiresAt: number; // Unix timestamp in milliseconds
  createdAt: number;
  refreshCount: number;
}

/**
 * Token info for debugging/inspection
 */
export interface TokenInfo {
  server: string;
  database: string;
  user: string;
  createdAt: number;
  expiresAt: number;
  expiresIn: number;
  refreshCount: number;
}

/**
 * Token Manager - Handles token lifecycle with caching, refresh, and error recovery
 */
export class TokenManager {
  private tokens: Map<string, CachedToken> = new Map();
  private configDir: string;
  private tokensFile: string;
  private readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry
  private readonly DEFAULT_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes default TTL

  constructor(configDir: string = path.join(os.homedir(), ".filemaker-mcp")) {
    loggers.client("Initializing TokenManager");
    this.configDir = configDir;
    this.tokensFile = path.join(configDir, "tokens.json");
    this.loadTokens();
  }

  /**
   * Generate cache key for a token
   */
  private getCacheKey(server: string, database: string, user: string): string {
    return `${server}:${database}:${user}`;
  }

  /**
   * Load tokens from persistent storage
   */
  private loadTokens(): void {
    if (fs.existsSync(this.tokensFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.tokensFile, "utf-8"));
        this.tokens = new Map(Object.entries(data.tokens || {}));
        loggers.client(`Loaded ${this.tokens.size} cached token(s)`);

        // Clean up expired tokens
        this.cleanupExpiredTokens();
      } catch (error) {
        loggers.client(`Error loading tokens file: ${error instanceof Error ? error.message : String(error)}`);
        this.tokens = new Map();
      }
    } else {
      loggers.client("No tokens cache file found, starting with empty tokens");
    }
  }

  /**
   * Save tokens to persistent storage
   */
  private saveTokens(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    const data = {
      tokens: Object.fromEntries(this.tokens),
      lastSaved: new Date().toISOString(),
    };

    fs.writeFileSync(this.tokensFile, JSON.stringify(data, null, 2));
    fs.chmodSync(this.tokensFile, 0o600); // Restrict permissions for security
    loggers.client(`Saved ${this.tokens.size} token(s) to cache`);
  }

  /**
   * Clean up expired tokens from cache
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, token] of this.tokens.entries()) {
      if (token.expiresAt < now) {
        this.tokens.delete(key);
        cleanedCount++;
        loggers.client(`Removed expired token for ${key}`);
      }
    }

    if (cleanedCount > 0) {
      this.saveTokens();
    }
  }

  /**
   * Cache a new token
   */
  cacheToken(
    token: string,
    server: string,
    database: string,
    user: string,
    ttlMs: number = this.DEFAULT_TOKEN_TTL
  ): void {
    const key = this.getCacheKey(server, database, user);
    const now = Date.now();

    const cachedToken: CachedToken = {
      token,
      server,
      database,
      user,
      expiresAt: now + ttlMs,
      createdAt: now,
      refreshCount: 0,
    };

    this.tokens.set(key, cachedToken);
    this.saveTokens();

    loggers.client(
      `Cached token for ${database}@${server} (expires in ${Math.round(ttlMs / 1000)}s)`
    );
  }

  /**
   * Get a cached token if valid
   */
  getToken(server: string, database: string, user: string): string | null {
    const key = this.getCacheKey(server, database, user);
    const cachedToken = this.tokens.get(key);

    if (!cachedToken) {
      loggers.client(`No cached token found for ${key}`);
      return null;
    }

    const now = Date.now();

    // Check if token is expired
    if (cachedToken.expiresAt < now) {
      loggers.client(`Cached token expired for ${key}`);
      this.tokens.delete(key);
      this.saveTokens();
      return null;
    }

    // Check if token needs refresh (within buffer window)
    if (cachedToken.expiresAt - now < this.TOKEN_EXPIRY_BUFFER) {
      loggers.client(`Cached token expiring soon for ${key}, needs refresh`);
      return null; // Signal that refresh is needed
    }

    loggers.client(`Using cached token for ${key}`);
    return cachedToken.token;
  }

  /**
   * Check if a token needs refresh
   */
  needsRefresh(server: string, database: string, user: string): boolean {
    const key = this.getCacheKey(server, database, user);
    const cachedToken = this.tokens.get(key);

    if (!cachedToken) {
      return false;
    }

    const now = Date.now();
    return cachedToken.expiresAt - now < this.TOKEN_EXPIRY_BUFFER;
  }

  /**
   * Update token expiry time (for refresh)
   */
  refreshToken(
    server: string,
    database: string,
    user: string,
    ttlMs: number = this.DEFAULT_TOKEN_TTL
  ): void {
    const key = this.getCacheKey(server, database, user);
    const cachedToken = this.tokens.get(key);

    if (!cachedToken) {
      loggers.client(`Cannot refresh: no cached token for ${key}`);
      return;
    }

    const now = Date.now();
    cachedToken.expiresAt = now + ttlMs;
    cachedToken.refreshCount++;

    this.tokens.set(key, cachedToken);
    this.saveTokens();

    loggers.client(
      `Refreshed token for ${key} (refresh count: ${cachedToken.refreshCount})`
    );
  }

  /**
   * Invalidate a token (on logout or 401 error)
   */
  invalidateToken(server: string, database: string, user: string): void {
    const key = this.getCacheKey(server, database, user);

    if (this.tokens.has(key)) {
      this.tokens.delete(key);
      this.saveTokens();
      loggers.client(`Invalidated token for ${key}`);
    }
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo(server: string, database: string, user: string): TokenInfo | null {
    const key = this.getCacheKey(server, database, user);
    const cachedToken = this.tokens.get(key);

    if (!cachedToken) {
      return null;
    }

    const now = Date.now();
    return {
      server: cachedToken.server,
      database: cachedToken.database,
      user: cachedToken.user,
      createdAt: cachedToken.createdAt,
      expiresAt: cachedToken.expiresAt,
      expiresIn: Math.max(0, cachedToken.expiresAt - now),
      refreshCount: cachedToken.refreshCount,
    };
  }

  /**
   * Clear all cached tokens
   */
  clearAll(): void {
    this.tokens.clear();
    if (fs.existsSync(this.tokensFile)) {
      fs.unlinkSync(this.tokensFile);
    }
    loggers.client("Cleared all cached tokens");
  }

  /**
   * Get token cache statistics
   */
  getStats(): { totalCached: number; validTokens: number; expiredTokens: number } {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    for (const token of this.tokens.values()) {
      if (token.expiresAt < now) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      totalCached: this.tokens.size,
      validTokens: validCount,
      expiredTokens: expiredCount,
    };
  }

  /**
   * Get tokens file path
   */
  getTokensFilePath(): string {
    return this.tokensFile;
  }
}

/**
 * Global singleton instance
 */
let globalTokenManager: TokenManager | null = null;

/**
 * Get or create the global token manager instance
 */
export function getTokenManager(configDir?: string): TokenManager {
  if (!globalTokenManager) {
    globalTokenManager = new TokenManager(configDir);
  }
  return globalTokenManager;
}

/**
 * Reset the global token manager (useful for testing)
 */
export function resetTokenManager(): void {
  globalTokenManager = null;
}
