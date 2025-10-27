# Network Transport Configuration Guide

This guide explains how to configure the FileMaker Data API MCP Server to serve over HTTP/HTTPS on the network, in addition to the default stdio transport.

## Overview

The MCP server supports three transport modes:

1. **stdio** (default) - Local stdio communication for Claude Desktop and other local MCP clients
2. **http** - HTTP server accessible over the network
3. **https** - HTTPS server accessible over the network (requires SSL certificates)

## Configuration

Transport configuration is controlled via environment variables. You can set these in your `.env` file or pass them when starting the server.

### Environment Variables

```bash
# Transport type (default: stdio)
MCP_TRANSPORT=stdio|http|https

# Server port (default: 3000 for HTTP, 3443 for HTTPS)
MCP_PORT=3000

# Server host (default: localhost)
# Use 0.0.0.0 to listen on all network interfaces
MCP_HOST=localhost

# HTTPS only - path to SSL certificate file
MCP_CERT_PATH=/path/to/cert.pem

# HTTPS only - path to SSL private key file
MCP_KEY_PATH=/path/to/key.pem
```

## Usage Examples

### 1. Default Stdio Transport (Local)

```bash
# Default behavior - no configuration needed
npm run start

# Or explicitly set stdio
MCP_TRANSPORT=stdio npm run start
```

### 2. HTTP Transport (Network)

```bash
# Start HTTP server on localhost:3000
MCP_TRANSPORT=http npm run start

# Start on custom port
MCP_TRANSPORT=http MCP_PORT=8080 npm run start

# Listen on all network interfaces
MCP_TRANSPORT=http MCP_HOST=0.0.0.0 MCP_PORT=3000 npm run start
```

### 3. HTTPS Transport (Secure Network)

```bash
# Start HTTPS server with certificates
MCP_TRANSPORT=https \
  MCP_PORT=3443 \
  MCP_CERT_PATH=/path/to/cert.pem \
  MCP_KEY_PATH=/path/to/key.pem \
  npm run start
```

## Generating Self-Signed Certificates

For development/testing, you can generate self-signed certificates:

```bash
# Generate private key and certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# When prompted, you can enter your details or just press Enter for defaults
```

## Endpoints

### HTTP/HTTPS Endpoints

When running in HTTP or HTTPS mode, the following endpoints are available:

- **GET /health** - Health check endpoint

  ```bash
  curl http://localhost:3000/health
  # Response: {"status":"ok","transport":"http"}
  ```

- **GET /mcp** - Server information

  ```bash
  curl http://localhost:3000/mcp
  # Response: {"info":"FileMaker Data API MCP Server","transport":"http","methods":["POST"],"endpoint":"/mcp"}
  ```

- **POST /mcp** - MCP request handler

  ```bash
  curl -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -d '{"method":"list_tools"}'
  ```

## Docker Deployment

Example Dockerfile for network deployment:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

ENV MCP_TRANSPORT=http
ENV MCP_HOST=0.0.0.0
ENV MCP_PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Docker run command:

```bash
docker build -t filemaker-mcp .

docker run -p 3000:3000 \
  -e MCP_TRANSPORT=http \
  -e MCP_HOST=0.0.0.0 \
  -e FM_SERVER=your-server.com \
  -e FM_DATABASE=your_db \
  -e FM_USER=username \
  -e FM_PASSWORD=password \
  filemaker-mcp
```

## Security Considerations

### For HTTP Transport

- **Use only for development/testing** on trusted networks
- HTTP transmits credentials and data in plaintext
- Not suitable for production environments

### For HTTPS Transport

- **Use for production** deployments
- Requires valid SSL certificates
- Consider using Let's Encrypt for free certificates in production
- Implement authentication/authorization at the application level
- Use firewall rules to restrict access to trusted clients

### Best Practices

1. **Never expose stdio transport** over the network
2. **Use HTTPS in production** with valid certificates
3. **Implement API authentication** (e.g., API keys, OAuth)
4. **Use firewall rules** to restrict access
5. **Monitor and log** all requests
6. **Rotate credentials** regularly
7. **Use environment variables** for sensitive data (never hardcode)

## Switching Between Transports

You can switch between transports by changing the `MCP_TRANSPORT` environment variable:

```bash
# Start with stdio (default)
npm run start

# Stop the server (Ctrl+C)

# Start with HTTP
MCP_TRANSPORT=http npm run start

# Stop the server (Ctrl+C)

# Start with HTTPS
MCP_TRANSPORT=https MCP_CERT_PATH=./cert.pem MCP_KEY_PATH=./key.pem npm run start
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
MCP_TRANSPORT=http MCP_PORT=3001 npm run start
```

### Certificate Errors (HTTPS)

- Ensure certificate and key files exist at the specified paths
- Check file permissions (should be readable by the server process)
- Verify certificate validity: `openssl x509 -in cert.pem -text -noout`

### Connection Refused

- Verify the server is running: `curl http://localhost:3000/health`
- Check firewall rules allow the port
- If using 0.0.0.0, verify you're connecting to the correct IP address

### CORS Issues

If accessing from a web browser, you may need to add CORS headers. This can be done by modifying the Express middleware in `transport.ts`.

## Performance Considerations

- **stdio**: Lowest latency, best for local use
- **http**: Network latency, suitable for LAN
- **https**: Slightly higher overhead than HTTP due to encryption, but recommended for security

## Next Steps

1. Copy `.env.transport.example` to `.env` and configure your settings
2. Build the project: `npm run build`
3. Start with your preferred transport: `MCP_TRANSPORT=<type> npm run start`
4. Test connectivity: `curl http://localhost:3000/health`
