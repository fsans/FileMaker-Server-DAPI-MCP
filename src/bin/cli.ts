#!/usr/bin/env node

import { program } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import { spawn } from "child_process";
import {
  loadConfigFile,
  saveConfigFile,
  getConfig,
  validateConfig,
  getConfigDir,
  getEnvFilePath,
  AppConfig,
  addConnection,
  removeConnection,
  listConnections,
  getConnection,
  setDefaultConnection,
  getDefaultConnectionName,
} from "../config.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get package.json version
let version = "1.0.0";
try {
  const packageJsonPath = path.join(__dirname, "../../package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  version = packageJson.version;
} catch (error) {
  // Fallback to default version
}

// Interactive setup wizard
async function setupWizard(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log("\n📋 FileMaker MCP Server Setup Wizard\n");

  const config: AppConfig = {
    server: {
      transport: "stdio",
      port: 3000,
      host: "localhost",
    },
    filemaker: {
      server: "",
      version: "vLatest",
      database: "",
      user: "",
    },
  };

  // FileMaker Server Configuration
  console.log("🔧 FileMaker Server Configuration:");
  config.filemaker.server = await question("FileMaker Server IP/hostname: ");
  config.filemaker.version = await question("API Version (default: vLatest): ") || "vLatest";
  config.filemaker.database = await question("Default Database name: ");
  config.filemaker.user = await question("FileMaker Username: ");
  config.filemaker.password = await question("FileMaker Password: ");

  // Transport Configuration
  console.log("\n🌐 Transport Configuration:");
  const transportChoice = await question("Transport type (stdio/http/https) [default: stdio]: ");
  config.server.transport = (transportChoice || "stdio") as "stdio" | "http" | "https";

  if (config.server.transport !== "stdio") {
    config.server.host = await question("Server host [default: localhost]: ") || "localhost";
    config.server.port = parseInt(await question("Server port [default: 3000]: ") || "3000", 10);

    if (config.server.transport === "https") {
      config.security = {
        certPath: await question("Certificate path: "),
        keyPath: await question("Key path: "),
      };
    }
  }

  // Save configuration
  saveConfigFile(config);

  // Save as .env file as well
  const envFile = getEnvFilePath();
  const envContent = `FM_SERVER=${config.filemaker.server}
FM_VERSION=${config.filemaker.version}
FM_DATABASE=${config.filemaker.database}
FM_USER=${config.filemaker.user}
FM_PASSWORD=${config.filemaker.password}
MCP_TRANSPORT=${config.server.transport}
MCP_HOST=${config.server.host}
MCP_PORT=${config.server.port}
${config.security?.certPath ? `MCP_CERT_PATH=${config.security.certPath}` : ""}
${config.security?.keyPath ? `MCP_KEY_PATH=${config.security.keyPath}` : ""}
`;

  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(envFile, envContent);
  console.log(`✓ Environment file saved to ${envFile}`);

  rl.close();

  console.log("\n✅ Setup complete! You can now run: filemaker-mcp start\n");
}

// Start the server
function startServer(): void {
  const config = getConfig();

  // Validate configuration
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error("❌ Configuration validation failed:");
    validation.errors.forEach((error) => console.error(`  - ${error}`));
    console.error("\nPlease run: filemaker-mcp setup");
    process.exit(1);
  }

  // Get the main server script path
  const serverScript = path.join(__dirname, "../index.js");

  const env = {
    ...process.env,
    FM_SERVER: config.filemaker.server,
    FM_VERSION: config.filemaker.version,
    FM_DATABASE: config.filemaker.database,
    FM_USER: config.filemaker.user,
    FM_PASSWORD: config.filemaker.password,
    MCP_TRANSPORT: config.server.transport,
    MCP_HOST: config.server.host,
    MCP_PORT: String(config.server.port),
    ...(config.security?.certPath && { MCP_CERT_PATH: config.security.certPath }),
    ...(config.security?.keyPath && { MCP_KEY_PATH: config.security.keyPath }),
  };

  console.log(`🚀 Starting FileMaker MCP Server (${config.server.transport} transport)...`);

  const server = spawn("node", [serverScript], {
    env,
    stdio: "inherit",
  });

  server.on("error", (error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });

  server.on("exit", (code) => {
    if (code !== 0) {
      console.error(`❌ Server exited with code ${code}`);
      process.exit(code || 1);
    }
  });
}

// Configure Claude Desktop
async function configureClaudeDesktop(): Promise<void> {
  const claudeConfigPath = path.join(
    os.homedir(),
    "Library/Application Support/Claude/claude_desktop_config.json"
  );

  if (!fs.existsSync(claudeConfigPath)) {
    console.error("❌ Claude Desktop configuration file not found.");
    console.error(`Expected path: ${claudeConfigPath}`);
    console.error("Please ensure Claude Desktop is installed.");
    process.exit(1);
  }

  const config = loadConfigFile();

  if (!config.filemaker?.server) {
    console.error("❌ FileMaker configuration not found. Please run: filemaker-mcp setup");
    process.exit(1);
  }

  try {
    const claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));

    const mcpConfig = {
      command: "filemaker-mcp",
      args: ["start"],
      env: {
        FM_SERVER: config.filemaker.server,
        FM_VERSION: config.filemaker.version || "vLatest",
        FM_DATABASE: config.filemaker.database,
        FM_USER: config.filemaker.user,
        FM_PASSWORD: config.filemaker.password,
      },
    };

    if (!claudeConfig.mcpServers) {
      claudeConfig.mcpServers = {};
    }

    claudeConfig.mcpServers.filemaker = mcpConfig;

    fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
    console.log("✅ Claude Desktop configuration updated!");
    console.log("📝 Please restart Claude Desktop for changes to take effect.");
  } catch (error) {
    console.error("❌ Error updating Claude Desktop configuration:", error);
    process.exit(1);
  }
}

// Connection management functions
async function addConnectionCommand(name: string, options: any): Promise<void> {
  try {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    let server = options.server;
    let database = options.database;
    let user = options.user;
    let password = options.password;
    let version = options.version || "vLatest";

    // If any required field is missing, prompt for it
    if (!server || !database || !user || !password) {
      console.log(`\n📝 Adding connection: ${name}\n`);
      if (!server) server = await question("FileMaker Server IP/hostname: ");
      if (!database) database = await question("Database name: ");
      if (!user) user = await question("Username: ");
      if (!password) password = await question("Password: ");
    }

    addConnection(name, {
      server,
      database,
      user,
      password,
      version,
    });

    console.log(`✅ Connection "${name}" added successfully`);
    rl.close();
  } catch (error) {
    console.error("❌ Error adding connection:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function removeConnectionCommand(name: string): void {
  try {
    removeConnection(name);
    console.log(`✅ Connection "${name}" removed successfully`);
  } catch (error) {
    console.error("❌ Error removing connection:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function listConnectionsCommand(): void {
  try {
    const connections = listConnections();
    const defaultName = getDefaultConnectionName();

    if (connections.length === 0) {
      console.log("\n📋 No connections configured\n");
      return;
    }

    console.log("\n📋 Available Connections:\n");
    connections.forEach((conn) => {
      const isDefault = conn.name === defaultName ? " (default)" : "";
      console.log(`  • ${conn.name}${isDefault}`);
      console.log(`    Server: ${conn.server}`);
      console.log(`    Database: ${conn.database}`);
      console.log(`    User: ${conn.user}`);
      console.log(`    Version: ${conn.version}\n`);
    });
  } catch (error) {
    console.error("❌ Error listing connections:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function setDefaultConnectionCommand(name: string): void {
  try {
    setDefaultConnection(name);
    console.log(`✅ Default connection set to "${name}"`);
  } catch (error) {
    console.error("❌ Error setting default connection:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Main CLI setup
program.version(version).description("FileMaker Data API MCP Server CLI");

program
  .command("setup")
  .description("Interactive setup wizard")
  .action(setupWizard);

program
  .command("start")
  .description("Start the MCP server")
  .action(startServer);

program
  .command("configure-claude")
  .description("Configure Claude Desktop integration")
  .action(configureClaudeDesktop);

// Config subcommands
const configCommand = program
  .command("config")
  .description("Manage configuration and connections");

configCommand
  .command("add-connection <name>")
  .description("Add a new FileMaker database connection")
  .option("--server <server>", "FileMaker Server IP/hostname")
  .option("--database <database>", "Database name")
  .option("--user <user>", "Username")
  .option("--password <password>", "Password")
  .option("--version <version>", "API version (default: vLatest)")
  .action((name: string, options: any) => addConnectionCommand(name, options));

configCommand
  .command("remove-connection <name>")
  .description("Remove a database connection")
  .action((name: string) => removeConnectionCommand(name));

configCommand
  .command("list-connections")
  .description("List all configured connections")
  .action(() => listConnectionsCommand());

configCommand
  .command("set-default <name>")
  .description("Set the default connection")
  .action((name: string) => setDefaultConnectionCommand(name));

configCommand
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const config = loadConfigFile();
    console.log("\n📋 Current Configuration:\n");
    console.log(JSON.stringify(config, null, 2));
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
