# AWS Secret Scanner

A web application that scans GitHub repositories to detect leaked AWS access secrets in commit history.

## Features

- Scans commit diffs for AWS access keys, secret keys, and session tokens
- Supports both main branch and all branches scanning
- Handles scan interruption and continuation
- REST API with comprehensive endpoints
- Containerized with Docker
- Rate limiting and pagination handling
- Enhanced AWS credential validation based on known patterns

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the application:
```bash
npm run build
```

3. Create a GitHub Personal Access Token:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Generate a new token with `repo` scope

## Usage

### Web Server

Start the server:
```bash
npm start
```

Or for development:
```bash
npm run dev
```

The server runs on port 3000 by default.

### API Endpoints

**Start a scan:**
```bash
POST /api/scan
Content-Type: application/json

{
  "owner": "username",
  "repo": "repository",
  "token": "github_token",
  "includeNonMainBranches": false,
  "resume": false
}
```

**Check scan status:**
```bash
GET /api/scan/:owner/:repo/status
```

**Get scan results:**
```bash
GET /api/scan/:owner/:repo/results
```

**Clear scan data:**
```bash
DELETE /api/scan/:owner/:repo
```

**Health check:**
```bash
GET /health
```

## Example Usage

```bash
# Start the server
npm start

# Start a scan
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "octocat",
    "repo": "Hello-World",
    "token": "ghp_your_token_here"
  }'

# Check scan status
curl http://localhost:3000/api/scan/octocat/Hello-World/status

# Get results
curl http://localhost:3000/api/scan/octocat/Hello-World/results
```

## Docker

Build and run with Docker:
```bash
docker build -t aws-secret-scanner .
docker run -p 3000:3000 aws-secret-scanner
```

Or use Docker Compose:
```bash
docker-compose up -d
```

## Detected AWS Secrets

The scanner detects the following AWS credentials with enhanced validation:

### Access Keys
- **Long-term Access Keys**: Start with `AKIA` (20 characters total)
- **Temporary Access Keys**: Start with `ASIA` (20 characters total)
- Uses proper AWS character set (A-Z, 2-7) and validates structural patterns

### Secret Keys
- 40-character base64 strings representing 30 bytes of random data
- Validates proper base64 format and excludes obvious test/fake patterns

### Session Tokens
- Very long base64 strings (200+ characters)
- Detected in configuration files and as standalone tokens

### Configuration Detection
- AWS CLI credential files
- Environment variables and configuration files
- Account IDs and region settings

## Scan Continuation

If a scan is interrupted, the application saves progress to `.scanstate_<repo>.json` and results to `.scanresults_<repo>.json`. Use `"resume": true` in the API to continue from where it left off.

## Rate Limiting

The application handles GitHub API rate limits automatically with built-in retry logic and pagination support.

## Project Structure

```
src/
├── controllers/     # API endpoints and request handling
│   └── server.ts   # Express server and routes
├── models/         # TypeScript interfaces and types
│   └── types.ts    # Data models
├── services/       # Business logic
│   ├── github.ts   # GitHub API integration
│   └── storage.ts  # State and results persistence
└── utils/          # Utility functions
    └── patterns.ts # AWS credential detection patterns
```

## Security Note

This tool is designed for defensive security purposes only. It helps identify potentially leaked AWS credentials in repositories to prevent unauthorized access. Always handle detected credentials securely and rotate any exposed keys immediately.