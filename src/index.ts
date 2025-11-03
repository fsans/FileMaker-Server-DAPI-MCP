#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import https from "https";
import * as dotenv from "dotenv";
import FormData from "form-data";
import fs from "fs";
import { setupTransport, getTransportConfig } from "./transport.js";
import { getConnectionManager } from "./connection.js";
import { getTokenManager } from "./token-manager.js";
import { configurationTools, configurationToolHandlers } from "./tools/configuration.js";
import { connectionTools, connectionToolHandlers } from "./tools/connection.js";
import { loggers, logRequest, logResponse, logError, logTiming, createTimedLogger } from "./logger.js";

dotenv.config();

// Interface for external database credentials
interface ExternalDatabase {
  database: string;
  username: string;
  password: string;
}

// FileMaker API Client
class FileMakerAPIClient {
  private baseUrl: string;
  private version: string;
  private database: string;
  private username: string;
  private password: string;
  private externalDatabases: ExternalDatabase[] = [];
  private token: string | null = null;
  private axiosInstance: AxiosInstance;
  private tokenManager: ReturnType<typeof getTokenManager>;
  private readonly MAX_RETRY_ATTEMPTS = 2;

  constructor() {
    loggers.client("Initializing FileMaker API Client");
    this.baseUrl = process.env.FM_SERVER || "";
    this.version = process.env.FM_VERSION || "vLatest";
    this.database = process.env.FM_DATABASE || "";
    this.username = process.env.FM_USER || "";
    this.password = process.env.FM_PASSWORD || "";
    this.tokenManager = getTokenManager();

    loggers.client(`Server: ${this.baseUrl}, Version: ${this.version}, Database: ${this.database}`);

    // Parse external databases from environment variable
    if (process.env.FM_EXTERNAL_DATABASES) {
      try {
        this.externalDatabases = JSON.parse(process.env.FM_EXTERNAL_DATABASES);
        // Validate that each external database has required fields
        this.externalDatabases = this.externalDatabases.filter((db) => {
          if (!db.database || !db.username || !db.password) {
            console.warn(
              `Skipping invalid external database entry: ${JSON.stringify(db)}`
            );
            return false;
          }
          return true;
        });
      } catch (error) {
        console.warn(
          `Failed to parse FM_EXTERNAL_DATABASES: ${error instanceof Error ? error.message : String(error)}`
        );
        this.externalDatabases = [];
      }
    }

    // Create axios instance with SSL verification disabled (optional, for development)
    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });
  }

  private getHeaders(includeAuth: boolean = true) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (includeAuth && this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Make a request with automatic 401 retry and token refresh
   */
  private async makeRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      // Check if it's a 401 Unauthorized error
      if (error.response?.status === 401 && retryCount < this.MAX_RETRY_ATTEMPTS) {
        loggers.client(`Received 401 error, attempting to refresh token (attempt ${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);

        try {
          // Invalidate current token
          this.tokenManager.invalidateToken(this.baseUrl, this.database, this.username);
          this.token = null;

          // Re-authenticate
          await this.login();

          // Retry the original request
          return await this.makeRequestWithRetry(requestFn, retryCount + 1);
        } catch (loginError) {
          loggers.client(`Failed to refresh token: ${loginError instanceof Error ? loginError.message : String(loginError)}`);
          throw loginError;
        }
      }

      throw error;
    }
  }

  // Authentication
  async login(
    database?: string,
    username?: string,
    password?: string,
    fmDataSource?: ExternalDatabase[]
  ): Promise<any> {
    const logTiming = createTimedLogger(loggers.client, "login");
    const db = database || this.database;
    const user = username || this.username;
    const pass = password || this.password;

    // Check if we have a cached token
    const cachedToken = this.tokenManager.getToken(this.baseUrl, db, user);
    if (cachedToken) {
      loggers.client(`Using cached token for ${db}@${this.baseUrl}`);
      this.token = cachedToken;
      if (database) this.database = database;
      logTiming();
      return { response: { token: cachedToken } };
    }

    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/sessions`;
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");

    loggers.client(`Logging in to database: ${db} as user: ${user}`);

    // Build request body with external databases if available
    const requestBody: any = {};
    const externalDBs = fmDataSource || this.externalDatabases;
    if (externalDBs && externalDBs.length > 0) {
      requestBody.fmDataSource = externalDBs;
      loggers.client(`Using ${externalDBs.length} external database(s)`);
    }

    logRequest(loggers.client, loggers.clientVerbose, "POST", url, requestBody);

    try {
      const response = await this.axiosInstance.post(url, requestBody, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
      });

      this.token = response.data.response.token;
      if (database) this.database = database;

      // Cache the token (15 minute default TTL)
      if (this.token) {
        this.tokenManager.cacheToken(this.token, this.baseUrl, db, user, 15 * 60 * 1000);
      }

      logResponse(loggers.client, loggers.clientVerbose, "POST", url, response.status, response.data);
      loggers.client(`Login successful, token acquired and cached`);
      logTiming();

      return response.data;
    } catch (error) {
      logError(loggers.client, "login", error);
      throw error;
    }
  }

  async logout(): Promise<any> {
    if (!this.token) {
      throw new Error("No active session");
    }

    const logTiming = createTimedLogger(loggers.client, "logout");
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${this.database}/sessions/${this.token}`;

    loggers.client("Logging out and invalidating session token");
    logRequest(loggers.client, loggers.clientVerbose, "DELETE", url);

    try {
      const response = await this.axiosInstance.delete(url);
      
      // Invalidate cached token
      this.tokenManager.invalidateToken(this.baseUrl, this.database, this.username);
      this.token = null;

      logResponse(loggers.client, loggers.clientVerbose, "DELETE", url, response.status, response.data);
      loggers.client("Logout successful, token invalidated");
      logTiming();

      return response.data;
    } catch (error) {
      logError(loggers.client, "logout", error);
      throw error;
    }
  }

  async validateSession(): Promise<any> {
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/validateSession`;
    const response = await this.axiosInstance.get(url, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  // Metadata
  async getProductInfo(): Promise<any> {
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/productInfo`;
    const response = await this.axiosInstance.get(url);
    return response.data;
  }

  async getDatabases(): Promise<any> {
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases`;
    const response = await this.axiosInstance.get(url);
    return response.data;
  }

  async getLayouts(database?: string): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts`;
    const response = await this.axiosInstance.get(url, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getScripts(database?: string): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/scripts`;
    const response = await this.axiosInstance.get(url, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getLayoutMetadata(layout: string, database?: string): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}`;
    const response = await this.axiosInstance.get(url, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  // Records
  async getRecords(
    layout: string,
    offset: number = 1,
    limit: number = 20,
    database?: string
  ): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records?_offset=${offset}&_limit=${limit}`;
    
    return this.makeRequestWithRetry(async () => {
      const response = await this.axiosInstance.get(url, {
        headers: this.getHeaders(),
      });
      return response.data;
    });
  }

  async getRecordById(
    layout: string,
    recordId: string | number,
    database?: string
  ): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records/${recordId}`;
    const response = await this.axiosInstance.get(url, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async createRecord(
    layout: string,
    fieldData: Record<string, any>,
    database?: string
  ): Promise<any> {
    const logTiming = createTimedLogger(loggers.client, "createRecord");
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records`;

    loggers.client(`Creating record in layout: ${layout}`);
    logRequest(loggers.client, loggers.clientVerbose, "POST", url, { fieldData });

    try {
      const response = await this.axiosInstance.post(
        url,
        { fieldData },
        {
          headers: this.getHeaders(),
        }
      );

      logResponse(loggers.client, loggers.clientVerbose, "POST", url, response.status, response.data);
      loggers.client(`Record created with ID: ${response.data.response.recordId}`);
      logTiming();

      return response.data;
    } catch (error) {
      logError(loggers.client, "createRecord", error);
      throw error;
    }
  }

  async editRecord(
    layout: string,
    recordId: string | number,
    fieldData: Record<string, any>,
    database?: string
  ): Promise<any> {
    const logTiming = createTimedLogger(loggers.client, "editRecord");
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records/${recordId}`;

    loggers.client(`Editing record ${recordId} in layout: ${layout}`);
    logRequest(loggers.client, loggers.clientVerbose, "PATCH", url, { fieldData });

    try {
      const response = await this.axiosInstance.patch(
        url,
        { fieldData },
        {
          headers: this.getHeaders(),
        }
      );

      logResponse(loggers.client, loggers.clientVerbose, "PATCH", url, response.status, response.data);
      loggers.client(`Record ${recordId} updated successfully`);
      logTiming();

      return response.data;
    } catch (error) {
      logError(loggers.client, "editRecord", error);
      throw error;
    }
  }

  async deleteRecord(
    layout: string,
    recordId: string | number,
    database?: string
  ): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records/${recordId}`;
    const response = await this.axiosInstance.delete(url, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async duplicateRecord(
    layout: string,
    recordId: string | number,
    database?: string
  ): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records/${recordId}`;
    const response = await this.axiosInstance.post(
      url,
      {},
      {
        headers: this.getHeaders(),
      }
    );
    return response.data;
  }

  async findRecords(
    layout: string,
    query: any[],
    offset?: number,
    limit?: number,
    database?: string
  ): Promise<any> {
    const logTiming = createTimedLogger(loggers.client, "findRecords");
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/_find`;
    const body: any = { query };
    if (offset !== undefined) body.offset = offset;
    if (limit !== undefined) body.limit = limit;

    loggers.client(`Finding records in layout: ${layout} with ${query.length} criteria`);
    logRequest(loggers.client, loggers.clientVerbose, "POST", url, body);

    try {
      const response = await this.axiosInstance.post(url, body, {
        headers: this.getHeaders(),
      });

      const recordCount = response.data.response?.data?.length || 0;
      logResponse(loggers.client, loggers.clientVerbose, "POST", url, response.status, response.data);
      loggers.client(`Found ${recordCount} record(s)`);
      logTiming();

      return response.data;
    } catch (error) {
      logError(loggers.client, "findRecords", error);
      throw error;
    }
  }

  // Container Fields
  async uploadToContainer(
    layout: string,
    recordId: string | number,
    containerFieldName: string,
    filePath: string,
    database?: string
  ): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records/${recordId}/${containerFieldName}`;

    const formData = new FormData();
    formData.append("upload", fs.createReadStream(filePath));

    const response = await this.axiosInstance.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${this.token}`,
      },
    });
    return response.data;
  }

  // Global Fields
  async setGlobalFields(
    globalFields: Record<string, any>,
    database?: string
  ): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/globals`;
    const response = await this.axiosInstance.patch(
      url,
      { globalFields },
      {
        headers: this.getHeaders(),
      }
    );
    return response.data;
  }

  // Scripts
  async executeScript(
    layout: string,
    scriptName: string,
    scriptParameter?: string,
    database?: string
  ): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/script/${scriptName}`;

    const params: any = {};
    if (scriptParameter !== undefined) {
      params["script.param"] = scriptParameter;
    }

    const response = await this.axiosInstance.get(url, {
      headers: this.getHeaders(),
      params: params,
    });
    return response.data;
  }

  // Container Fields with Repetition
  async uploadToContainerWithRepetition(
    layout: string,
    recordId: string | number,
    containerFieldName: string,
    repetition: number,
    filePath: string,
    database?: string
  ): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records/${recordId}/${containerFieldName}/${repetition}`;

    const formData = new FormData();
    formData.append("upload", fs.createReadStream(filePath));

    const response = await this.axiosInstance.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${this.token}`,
      },
    });
    return response.data;
  }
}

// MCP Server
const client = new FileMakerAPIClient();
const server = new Server(
  {
    name: "filemaker-data-api",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools: Tool[] = [
  // Configuration Tools
  ...configurationTools,
  // Connection Tools
  ...connectionTools,
  // Authentication
  {
    name: "fm_login",
    description:
      "Authenticate with FileMaker Server and get a session token. Required before using most other tools. External database credentials can be configured via .env (FM_EXTERNAL_DATABASES) or passed as fmDataSource parameter.",
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          description: "Database name (optional, uses default from .env if not provided)",
        },
        username: {
          type: "string",
          description: "Username (optional, uses default from .env if not provided)",
        },
        password: {
          type: "string",
          description: "Password (optional, uses default from .env if not provided)",
        },
        fmDataSource: {
          type: "array",
          description:
            "Array of external database credentials (optional, overrides FM_EXTERNAL_DATABASES from .env). Each object must contain: database, username, password",
          items: {
            type: "object",
            properties: {
              database: {
                type: "string",
                description: "External database name",
              },
              username: {
                type: "string",
                description: "Username for the external database",
              },
              password: {
                type: "string",
                description: "Password for the external database",
              },
            },
            required: ["database", "username", "password"],
          },
        },
      },
    },
  },
  {
    name: "fm_logout",
    description: "End the current FileMaker Server session",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "fm_validate_session",
    description: "Check if the current session token is still valid",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  // Metadata
  {
    name: "fm_get_product_info",
    description: "Get FileMaker Server product information including date/time formats",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "fm_get_databases",
    description: "List all available databases on the FileMaker Server",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "fm_get_layouts",
    description: "Get all layouts for a database",
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
    },
  },
  {
    name: "fm_get_scripts",
    description: "Get all scripts for a database",
    inputSchema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
    },
  },
  {
    name: "fm_get_layout_metadata",
    description: "Get metadata for a specific layout including field definitions",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout"],
    },
  },
  // Records
  {
    name: "fm_get_records",
    description: "Get records from a layout with pagination",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        offset: {
          type: "number",
          description: "Starting record (default: 1)",
        },
        limit: {
          type: "number",
          description: "Number of records to return (default: 20)",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout"],
    },
  },
  {
    name: "fm_get_record_by_id",
    description: "Get a single record by its recordId",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        recordId: {
          type: ["string", "number"],
          description: "Record ID",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout", "recordId"],
    },
  },
  {
    name: "fm_create_record",
    description: "Create a new record in a layout",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        fieldData: {
          type: "object",
          description: "Field data as key-value pairs (e.g., {\"FirstName\": \"John\", \"LastName\": \"Doe\"})",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout", "fieldData"],
    },
  },
  {
    name: "fm_edit_record",
    description: "Edit an existing record",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        recordId: {
          type: ["string", "number"],
          description: "Record ID",
        },
        fieldData: {
          type: "object",
          description: "Field data to update as key-value pairs",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout", "recordId", "fieldData"],
    },
  },
  {
    name: "fm_delete_record",
    description: "Delete a record by its recordId",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        recordId: {
          type: ["string", "number"],
          description: "Record ID",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout", "recordId"],
    },
  },
  {
    name: "fm_duplicate_record",
    description: "Duplicate an existing record",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        recordId: {
          type: ["string", "number"],
          description: "Record ID",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout", "recordId"],
    },
  },
  {
    name: "fm_find_records",
    description: "Find records using a query. Query is an array of search criteria objects.",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        query: {
          type: "array",
          description: "Array of query objects (e.g., [{\"FirstName\": \"John\"}, {\"LastName\": \"Doe\"}])",
        },
        offset: {
          type: "number",
          description: "Starting record (optional)",
        },
        limit: {
          type: "number",
          description: "Number of records to return (optional)",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout", "query"],
    },
  },
  // Container Fields
  {
    name: "fm_upload_to_container",
    description: "Upload a file to a container field",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        recordId: {
          type: ["string", "number"],
          description: "Record ID",
        },
        containerFieldName: {
          type: "string",
          description: "Name of the container field",
        },
        filePath: {
          type: "string",
          description: "Path to the file to upload",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout", "recordId", "containerFieldName", "filePath"],
    },
  },
  // Global Fields
  {
    name: "fm_set_global_fields",
    description: "Set global field values",
    inputSchema: {
      type: "object",
      properties: {
        globalFields: {
          type: "object",
          description: "Global fields as key-value pairs",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["globalFields"],
    },
  },
  // Scripts
  {
    name: "fm_execute_script",
    description: "Execute a FileMaker script from a specific layout",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        scriptName: {
          type: "string",
          description: "Name of the script to execute",
        },
        scriptParameter: {
          type: "string",
          description: "Optional parameter to pass to the script",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout", "scriptName"],
    },
  },
  {
    name: "fm_upload_to_container_repetition",
    description: "Upload a file to a container field with repetition",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          description: "Layout name",
        },
        recordId: {
          type: ["string", "number"],
          description: "Record ID",
        },
        containerFieldName: {
          type: "string",
          description: "Name of the container field",
        },
        repetition: {
          type: "number",
          description: "Repetition number (1-based index)",
        },
        filePath: {
          type: "string",
          description: "Path to the file to upload",
        },
        database: {
          type: "string",
          description: "Database name (optional, uses default from session if not provided)",
        },
      },
      required: ["layout", "recordId", "containerFieldName", "repetition", "filePath"],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  try {
    const { name, arguments: args } = request.params;

    loggers.tools(`Tool called: ${name}`);
    loggers.toolsVerbose(`Tool arguments:`, JSON.stringify(args, null, 2));

    if (!args) {
      throw new Error("No arguments provided");
    }

    // Handle configuration tools
    if (name.startsWith("fm_config_")) {
      loggers.tools(`Executing configuration tool: ${name}`);
      const handler = configurationToolHandlers[name];
      if (handler) {
        const result = await handler(args);
        loggers.tools(`Configuration tool ${name} completed`);
        logTiming(loggers.tools, name, startTime);
        return {
          content: [{ type: "text", text: result }],
        };
      }
    }

    // Handle connection tools
    if (name.startsWith("fm_set_connection") || name === "fm_connect" || name === "fm_list_connections" || name === "fm_get_current_connection") {
      loggers.tools(`Executing connection tool: ${name}`);
      const handler = connectionToolHandlers[name];
      if (handler) {
        const result = await handler(args);
        loggers.tools(`Connection tool ${name} completed`);
        logTiming(loggers.tools, name, startTime);
        return {
          content: [{ type: "text", text: result }],
        };
      }
    }

    switch (name) {
      // Authentication
      /**
       * Handler: fm_login
       * Authenticates with FileMaker Server and establishes a session token.
       * Supports optional external database credentials for cross-database authentication.
       *
       * @param {string} [args.database] - Database name (uses default from .env if not provided)
       * @param {string} [args.username] - Username (uses default from .env if not provided)
       * @param {string} [args.password] - Password (uses default from .env if not provided)
       * @param {ExternalDatabase[]} [args.fmDataSource] - External database credentials array
       * @returns {Promise<Object>} Session token and authentication response
       */
      case "fm_login": {
        const result = await client.login(
          args.database as string,
          args.username as string,
          args.password as string,
          args.fmDataSource as ExternalDatabase[]
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_logout
       * Ends the current FileMaker Server session and invalidates the session token.
       *
       * @returns {Promise<Object>} Logout confirmation response
       * @throws {Error} If no active session exists
       */
      case "fm_logout": {
        const result = await client.logout();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_validate_session
       * Validates if the current session token is still active and valid.
       *
       * @returns {Promise<Object>} Session validation status
       */
      case "fm_validate_session": {
        const result = await client.validateSession();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Metadata
      /**
       * Handler: fm_get_product_info
       * Retrieves FileMaker Server product information including version, date/time formats, and capabilities.
       *
       * @returns {Promise<Object>} Server product information and metadata
       */
      case "fm_get_product_info": {
        const result = await client.getProductInfo();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_get_databases
       * Lists all databases available on the FileMaker Server.
       *
       * @returns {Promise<Object>} Array of database names
       */
      case "fm_get_databases": {
        const result = await client.getDatabases();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_get_layouts
       * Retrieves all layouts available in a specified database.
       *
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Array of layout names and metadata
       */
      case "fm_get_layouts": {
        const result = await client.getLayouts(args.database as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_get_scripts
       * Retrieves all scripts available in a specified database.
       *
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Array of script names and metadata
       */
      case "fm_get_scripts": {
        const result = await client.getScripts(args.database as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_get_layout_metadata
       * Retrieves detailed metadata for a specific layout including field definitions,
       * value lists, and portal information.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Layout metadata including field definitions and properties
       */
      case "fm_get_layout_metadata": {
        const result = await client.getLayoutMetadata(
          args.layout as string,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Records
      /**
       * Handler: fm_get_records
       * Retrieves a paginated set of records from a specified layout.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {number} [args.offset=1] - Starting record position (default: 1)
       * @param {number} [args.limit=20] - Number of records to return (default: 20)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Array of records with field data
       */
      case "fm_get_records": {
        const result = await client.getRecords(
          args.layout as string,
          args.offset as number,
          args.limit as number,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_get_record_by_id
       * Retrieves a single record by its unique recordId.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {string|number} args.recordId - FileMaker internal record ID (required)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Single record with field data
       */
      case "fm_get_record_by_id": {
        const result = await client.getRecordById(
          args.layout as string,
          args.recordId as string | number,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_create_record
       * Creates a new record in the specified layout with the provided field data.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {Object} args.fieldData - Field data as key-value pairs (required)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Created record with new recordId
       */
      case "fm_create_record": {
        const result = await client.createRecord(
          args.layout as string,
          args.fieldData as Record<string, any>,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_edit_record
       * Updates an existing record with new field data. Only specified fields are updated.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {string|number} args.recordId - FileMaker internal record ID (required)
       * @param {Object} args.fieldData - Field data to update as key-value pairs (required)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Updated record confirmation
       */
      case "fm_edit_record": {
        const result = await client.editRecord(
          args.layout as string,
          args.recordId as string | number,
          args.fieldData as Record<string, any>,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_delete_record
       * Permanently deletes a record from the database.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {string|number} args.recordId - FileMaker internal record ID (required)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Deletion confirmation
       */
      case "fm_delete_record": {
        const result = await client.deleteRecord(
          args.layout as string,
          args.recordId as string | number,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_duplicate_record
       * Creates an exact duplicate of an existing record with a new recordId.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {string|number} args.recordId - FileMaker internal record ID to duplicate (required)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Duplicated record with new recordId
       */
      case "fm_duplicate_record": {
        const result = await client.duplicateRecord(
          args.layout as string,
          args.recordId as string | number,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_find_records
       * Searches for records matching the specified query criteria with pagination support.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {Array<Object>} args.query - Array of search criteria objects (required)
       * @param {number} [args.offset] - Starting record position
       * @param {number} [args.limit] - Number of records to return
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Array of matching records
       */
      case "fm_find_records": {
        const result = await client.findRecords(
          args.layout as string,
          args.query as any[],
          args.offset as number,
          args.limit as number,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Container Fields
      /**
       * Handler: fm_upload_to_container
       * Uploads a file to a container field in a specific record.
       * Supports images, PDFs, and other file types.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {string|number} args.recordId - FileMaker internal record ID (required)
       * @param {string} args.containerFieldName - Name of the container field (required)
       * @param {string} args.filePath - Local file path to upload (required)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Upload confirmation
       */
      case "fm_upload_to_container": {
        const result = await client.uploadToContainer(
          args.layout as string,
          args.recordId as string | number,
          args.containerFieldName as string,
          args.filePath as string,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Global Fields
      /**
       * Handler: fm_set_global_fields
       * Sets values for global fields in the database. Global fields persist
       * for the duration of the session and are shared across all layouts.
       *
       * @param {Object} args.globalFields - Global fields as key-value pairs (required)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Update confirmation
       */
      case "fm_set_global_fields": {
        const result = await client.setGlobalFields(
          args.globalFields as Record<string, any>,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Scripts
      /**
       * Handler: fm_execute_script
       * Executes a FileMaker script and optionally passes a parameter to it.
       * The script must exist in the specified database and be accessible from the layout.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {string} args.scriptName - Name of the script to execute (required)
       * @param {string} [args.scriptParameter] - Optional parameter to pass to the script
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Script result including any return value
       */
      case "fm_execute_script": {
        const result = await client.executeScript(
          args.layout as string,
          args.scriptName as string,
          args.scriptParameter as string,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      /**
       * Handler: fm_upload_to_container_repetition
       * Uploads a file to a specific repetition of a repeating container field.
       * Used for container fields with multiple repetitions.
       *
       * @param {string} args.layout - Layout name (required)
       * @param {string|number} args.recordId - FileMaker internal record ID (required)
       * @param {string} args.containerFieldName - Name of the container field (required)
       * @param {number} args.repetition - Repetition number (1-based index) (required)
       * @param {string} args.filePath - Local file path to upload (required)
       * @param {string} [args.database] - Database name (uses default from session if not provided)
       * @returns {Promise<Object>} Upload confirmation
       */
      case "fm_upload_to_container_repetition": {
        const result = await client.uploadToContainerWithRepetition(
          args.layout as string,
          args.recordId as string | number,
          args.containerFieldName as string,
          args.repetition as number,
          args.filePath as string,
          args.database as string
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        loggers.tools(`Unknown tool: ${name}`);
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    logError(loggers.tools, `tool execution (${request.params.name})`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ""}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const config = getTransportConfig();
  loggers.transport(`Starting FileMaker Data API MCP Server`);
  loggers.transport(`Transport: ${config.type}`);
  console.error(`Starting FileMaker Data API MCP Server with ${config.type} transport...`);
  await setupTransport(server, config);
  loggers.transport("Server started successfully");
}

main().catch((error) => {
  logError(loggers.transport, "server startup", error);
  console.error("Fatal error:", error);
  process.exit(1);
});
