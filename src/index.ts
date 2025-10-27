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

  constructor() {
    this.baseUrl = process.env.FM_SERVER || "";
    this.version = process.env.FM_VERSION || "vLatest";
    this.database = process.env.FM_DATABASE || "";
    this.username = process.env.FM_USER || "";
    this.password = process.env.FM_PASSWORD || "";

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

  // Authentication
  async login(
    database?: string,
    username?: string,
    password?: string,
    fmDataSource?: ExternalDatabase[]
  ): Promise<any> {
    const db = database || this.database;
    const user = username || this.username;
    const pass = password || this.password;

    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/sessions`;
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");

    // Build request body with external databases if available
    const requestBody: any = {};
    const externalDBs = fmDataSource || this.externalDatabases;
    if (externalDBs && externalDBs.length > 0) {
      requestBody.fmDataSource = externalDBs;
    }

    const response = await this.axiosInstance.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
    });

    this.token = response.data.response.token;
    if (database) this.database = database;
    return response.data;
  }

  async logout(): Promise<any> {
    if (!this.token) {
      throw new Error("No active session");
    }

    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${this.database}/sessions/${this.token}`;
    const response = await this.axiosInstance.delete(url);
    this.token = null;
    return response.data;
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
    const response = await this.axiosInstance.get(url, {
      headers: this.getHeaders(),
    });
    return response.data;
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
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records`;
    const response = await this.axiosInstance.post(
      url,
      { fieldData },
      {
        headers: this.getHeaders(),
      }
    );
    return response.data;
  }

  async editRecord(
    layout: string,
    recordId: string | number,
    fieldData: Record<string, any>,
    database?: string
  ): Promise<any> {
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/records/${recordId}`;
    const response = await this.axiosInstance.patch(
      url,
      { fieldData },
      {
        headers: this.getHeaders(),
      }
    );
    return response.data;
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
    const db = database || this.database;
    const url = `https://${this.baseUrl}/fmi/data/${this.version}/databases/${db}/layouts/${layout}/_find`;
    const body: any = { query };
    if (offset !== undefined) body.offset = offset;
    if (limit !== undefined) body.limit = limit;

    const response = await this.axiosInstance.post(url, body, {
      headers: this.getHeaders(),
    });
    return response.data;
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
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      // Authentication
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

      case "fm_logout": {
        const result = await client.logout();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "fm_validate_session": {
        const result = await client.validateSession();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // Metadata
      case "fm_get_product_info": {
        const result = await client.getProductInfo();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "fm_get_databases": {
        const result = await client.getDatabases();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "fm_get_layouts": {
        const result = await client.getLayouts(args.database as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "fm_get_scripts": {
        const result = await client.getScripts(args.database as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

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
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
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
  console.error(`Starting FileMaker Data API MCP Server with ${config.type} transport...`);
  await setupTransport(server, config);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
