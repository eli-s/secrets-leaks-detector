# AWS Secret Scanner

A security-focused web application that scans GitHub repositories to detect leaked AWS credentials in commit history. This tool helps identify potential security breaches by finding AWS access keys, secret keys, and session tokens that may have been accidentally committed to version control.

## 🔍 What This App Does

The AWS Secret Scanner provides comprehensive security scanning for GitHub repositories by:

- **Scanning Git History**: Analyzes all commits in chronological order to find when secrets were introduced or removed
- **Detecting AWS Credentials**: Uses advanced pattern matching to identify various types of AWS credentials
- **Tracking Changes**: Marks whether secrets were `added`, `removed`, or found in `context` lines
- **Handling Interruptions**: Supports resume functionality to continue scans from where they left off
- **Rate Limit Management**: Automatically handles GitHub API rate limits with intelligent retry logic
- **Real-time Progress**: Provides live status updates during long-running scans

## 🚨 Security Features

### Detected AWS Credential Types

| Credential Type | Pattern | Example Format |
|----------------|---------|----------------|
| **Long-term Access Keys** | `AKIA...` | `AKIAIOSFODNN7EXAMPLE` (20 chars) |
| **Temporary Access Keys** | `ASIA...` | `ASIAIOSFODNN7EXAMPLE` (20 chars) |
| **Secret Access Keys** | Base64 | `wJALrXutnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY` (40 chars) |
| **Session Tokens** | Base64 | `FQoD...` (200+ chars) |
| **Account IDs** | Numeric | `123456789012` (12 digits) |
| **CLI Credentials** | Config blocks | `[default]` sections |

### Advanced Pattern Recognition

- **Character Set Validation**: Validates AWS-specific character patterns (A-Z, 2-7 for access keys)
- **Format Constraints**: Checks structural requirements (5th char I/J, last char A/Q for access keys)
- **Anti-False Positive**: Excludes test patterns like `example`, `test`, `dummy`, `placeholder`
- **Overlap Prevention**: Avoids duplicate findings when session tokens contain secret key patterns
- **Context Awareness**: Differentiates between added, removed, and unchanged code

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **GitHub Personal Access Token** with `repo` scope

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd aws-secret-scanner

# Install dependencies
npm install

# Build the application
npm run build
```

### Development Setup

```bash
# Start development server with auto-reload
npm run dev:watch

# Or start with TypeScript watch mode
npm run dev:build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Check TypeScript types
npm run typecheck
```

## 📡 API Usage

### Start the Server

```bash
npm start
# Server starts on http://localhost:3000
```

### API Endpoints

#### 🎯 Start a Scan

```bash
POST /api/scan
Content-Type: application/json

{
  "owner": "username",
  "repo": "repository",
  "token": "ghp_your_github_token_here",
  "includeNonMainBranches": false,
  "resume": false
}
```

**Response:**
```json
{
  "status": "in_progress",
  "message": "Scan started for username/repository. Use /api/scan/username/repository/status to check progress."
}
```

#### 📊 Check Scan Progress

```bash
GET /api/scan/:owner/:repo/status
```

**Response:**
```json
{
  "status": "in_progress",
  "findings": [...], 
  "scanState": {
    "totalCommitsScanned": 150,
    "findingsCount": 3,
    "lastProcessedCommit": "abc123...",
    "lastProcessedDate": "2023-11-19T10:30:00Z"
  }
}
```

#### 📋 Get Final Results

```bash
GET /api/scan/:owner/:repo/results
```

**Response:**
```json
{
  "status": "success",
  "findings": [
    {
      "commitSha": "91543df3ccf417683257acddbb8d266251403b4f",
      "commitDate": "2025-11-19T11:11:15Z",
      "committer": "developer",
      "filename": "config/aws.js",
      "secretType": "AWS Secret Access Key (standalone)",
      "secretValue": "wEaDNiq11oUzqitIGSp7CKsAUoecwG4UGUhDYbo+",
      "line": 15,
      "action": "added"
    }
  ],
  "scanState": { ... }
}
```

#### 🧹 Clean Up Scan Data

```bash
DELETE /api/scan/:owner/:repo
```

#### 🏥 Health Check

```bash
GET /health
```

## 🔧 Advanced Usage

### Scanning Options

#### Include All Branches
```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "username",
    "repo": "repository",
    "token": "ghp_token",
    "includeNonMainBranches": true
  }'
```

#### Resume Interrupted Scan
```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "username", 
    "repo": "repository",
    "token": "ghp_token",
    "resume": true
  }'
```

### Understanding Results

#### Action Types
- **`"added"`**: Secret was introduced in this commit 🚨
- **`"removed"`**: Secret was deleted in this commit ✅  
- **`"context"`**: Secret exists in unchanged context lines ℹ️

#### Example Workflow
```bash
# 1. Start scan
curl -X POST http://localhost:3000/api/scan -d '{"owner":"user","repo":"repo","token":"ghp_xxx"}'

# 2. Monitor progress  
curl http://localhost:3000/api/scan/user/repo/status

# 3. Get final results
curl http://localhost:3000/api/scan/user/repo/results

# 4. Clean up when done
curl -X DELETE http://localhost:3000/api/scan/user/repo
```

## 🐳 Docker Support

### Build and Run

```bash
# Build Docker image
docker build -t aws-secret-scanner .

# Run container
docker run -p 3000:3000 aws-secret-scanner

# Or use Docker Compose
docker-compose up -d
```

## 🧪 Testing

The application includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test tests/patterns.test.ts
```

### Test Coverage
- **Pattern Detection**: Secret validation, exclusion rules
- **GitHub Integration**: API handling, rate limiting  
- **Storage**: State persistence, resume functionality
- **Server**: All API endpoints, error handling

## 🏗️ Architecture

```
src/
├── controllers/     # API endpoints and request handling
│   └── server.ts   # Express server with REST API
├── models/         # TypeScript interfaces and types  
│   └── types.ts    # Data models for findings and state
├── services/       # Business logic and external integrations
│   ├── github.ts   # GitHub API client with rate limiting
│   └── storage.ts  # File-based state and results persistence
└── utils/          # Utility functions and helpers
    └── patterns.ts # AWS credential detection patterns
```

### Key Components

- **GithubScanner**: Handles repository scanning, commit analysis, and rate limiting
- **StateManager**: Manages scan progress persistence and resume functionality  
- **Pattern Detection**: Advanced AWS credential pattern matching with validation
- **Express Server**: RESTful API with async scanning and progress tracking

## ⚙️ Configuration

### Environment Variables

```bash
# Server configuration
PORT=3000                    # Server port (default: 3000)
NODE_ENV=development         # Environment mode

# GitHub API (provide via request body)
GITHUB_TOKEN=ghp_xxx        # GitHub Personal Access Token
```

### GitHub Token Setup

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens**
2. Generate new token with **`repo` scope**
3. Copy token and use in API requests

## 🔒 Security Considerations

### For Security Teams

- **Complete Audit Trail**: Track when secrets were added vs. removed
- **Historical Analysis**: Scan entire git history, not just current state  
- **Non-Destructive**: Read-only operations, no repository modifications
- **Resume Capability**: Handle large repositories without losing progress

### Important Notes

- **Secrets in Git History**: Even "deleted" secrets remain in git history
- **Immediate Action**: Any found secrets should be rotated immediately
- **Private Repositories**: Requires appropriate GitHub token permissions
- **Rate Limits**: Automatically handled, but large scans may take time

## 🚧 Rate Limiting & Performance

### GitHub API Limits
- **5,000 requests/hour** for authenticated requests
- **Automatic retry** with exponential backoff
- **Smart delays** between requests to be respectful

### Performance Tips
- **Large repositories** may take hours to scan completely
- **Use resume functionality** for interrupted scans
- **Monitor progress** via status endpoint
- **Scan specific branches** if full scan not needed

## 🤝 Contributing

This is a demonstration project for security scanning capabilities. The codebase includes:

- **TypeScript** for type safety
- **Jest** for comprehensive testing  
- **ESLint** for code quality
- **Nodemon** for development workflow

## 📄 License

MIT License - See LICENSE file for details.

---

## ⚠️ Disclaimer

This tool is designed for **defensive security purposes only**. It helps identify potentially leaked AWS credentials in repositories to prevent unauthorized access. Always handle detected credentials securely and rotate any exposed keys immediately.

**Remember**: Finding and removing secrets from current files doesn't remove them from git history. Consider using tools like `git-filter-branch` or `BFG Repo-Cleaner` for complete secret removal.