# AWS Secret Scanner

An application that scans GitHub repositories to detect leaked AWS access secrets in commit history.

## Features

- Scans commit diffs for AWS access keys, secret keys, and other credentials
- Supports both main branch and all branches scanning
- Handles scan interruption and continuation
- Available as both CLI tool and web server with REST API
- Containerized with Docker
- Rate limiting and pagination handling

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

### CLI Mode

Basic scan (main branch only):
```bash
npm start <owner> <repo> <github_token>
```

Scan all branches:
```bash
npm start <owner> <repo> <github_token> --all-branches
```

Resume interrupted scan:
```bash
npm start <owner> <repo> <github_token> --resume
```

### Web Server Mode

Start the server:
```bash
npm start -- --server
```

The server runs on port 3000 by default.

#### API Endpoints

**Start a scan:**
```bash
POST /api/scan
Content-Type: application/json

{
  "owner": "username",
  "repo": "repository",
  "token": "github_token",
  "includenonmainbranches": false,
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

The scanner detects:
- AWS Access Key IDs (AKIA...)
- AWS Secret Access Keys (40-character base64 strings)
- AWS Session Tokens
- AWS Account IDs in configuration files
- AWS CLI credential configurations

## Scan Continuation

If a scan is interrupted, the application saves progress to `.scanstate_<repo>.json` and results to `.scanresults_<repo>.json`. Use the `--resume` flag or set `"resume": true` in the API to continue from where it left off.

## Rate Limiting

The application handles GitHub API rate limits automatically with built-in retry logic and pagination support.
