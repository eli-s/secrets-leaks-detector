import { AwsSecretPattern } from '../models/types';

export const awsSecretPatterns: AwsSecretPattern[] = [
  {
    name: 'AWS Access Key ID (Long-term)',
    pattern: /\bAKIA[A-Z2-7]{16}\b/g,
    description: 'AWS Long-term Access Key ID (starts with AKIA)'
  },
  {
    name: 'AWS Access Key ID (Temporary)',
    pattern: /\bASIA[A-Z2-7]{16}\b/g,
    description: 'AWS Temporary Access Key ID with session token (starts with ASIA)'
  },
  {
    name: 'AWS Secret Access Key',
    pattern: /aws_secret_access_key\s*[=:]\s*["']?([A-Za-z0-9/+]{39}=?)["']?/gi,
    description: 'AWS Secret Access Key in configuration'
  },
  {
    name: 'AWS Secret Access Key (standalone)',
    pattern: /\b[A-Za-z0-9/+]{40}\b/g,
    description: 'Standalone AWS Secret Access Key (40 chars base64)'
  },
  {
    name: 'AWS Session Token',
    pattern: /aws_session_token\s*[=:]\s*["']?([A-Za-z0-9/+]{100,}={0,2})["']?/gi,
    description: 'AWS Session Token in configuration'
  },
  {
    name: 'AWS Session Token (standalone)',
    pattern: /\b[A-Za-z0-9/+]{200,}={0,2}\b/g,
    description: 'Standalone AWS Session Token (very long base64 string)'
  },
  {
    name: 'AWS Account ID',
    pattern: /aws_account_id\s*[=:]\s*["']?(\d{12})["']?/gi,
    description: 'AWS Account ID'
  },
  {
    name: 'AWS Region in config',
    pattern: /aws_default_region\s*[=:]\s*["']?([a-z0-9-]+)["']?/gi,
    description: 'AWS Default Region'
  },
  {
    name: 'AWS CLI Credentials',
    pattern: /\[default\][\s\S]*?aws_access_key_id\s*[=:]\s*(A[KS]IA[A-Z2-7]{16})/gi,
    description: 'AWS CLI Credentials in config file'
  }
];

export function detectAwsSecrets(content: string): { pattern: AwsSecretPattern; match: string; line: number }[] {
  const findings: { pattern: AwsSecretPattern; match: string; line: number }[] = [];
  const lines = content.split('\n');
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    
    for (const pattern of awsSecretPatterns) {
      const matches = line.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          if (isLikelySecret(match, pattern.name)) {
            findings.push({
              pattern,
              match: match.trim(),
              line: lineIndex + 1
            });
          }
        }
      }
    }
  }
  
  return findings;
}

function isLikelySecret(value: string, patternName: string): boolean {
  const lowercaseValue = value.toLowerCase();
  
  // Enhanced exclude patterns
  const excludePatterns = [
    'example',
    'sample', 
    'test',
    'dummy',
    'placeholder',
    'your_',
    'xxx',
    'yyy',
    'zzz',
    '000',
    '111',
    '123',
    'abcd',
    'demo',
    'mock',
    'fake',
    'default'
  ];
  
  for (const exclude of excludePatterns) {
    if (lowercaseValue.includes(exclude)) {
      return false;
    }
  }
  
  // Validate AWS Access Key format
  if (patternName.includes('Access Key ID')) {
    return validateAccessKeyFormat(value);
  }
  
  // Validate Secret Access Key format
  if (patternName.includes('Secret Access Key (standalone)')) {
    return validateSecretKeyFormat(value);
  }
  
  // Validate Session Token format
  if (patternName.includes('Session Token (standalone)')) {
    return validateSessionTokenFormat(value);
  }
  
  return true;
}

function validateAccessKeyFormat(value: string): boolean {
  // Must be exactly 20 characters
  if (value.length !== 20) return false;
  
  // Must start with AKIA or ASIA
  if (!value.startsWith('AKIA') && !value.startsWith('ASIA')) return false;
  
  // Character set for the 16 chars after prefix should be A-Z and 2-7 (base32-like)
  const validChars = /^A[KS]IA[A-Z2-7]{16}$/;
  if (!validChars.test(value)) return false;
  
  // Check pattern constraints: 5th char is I or J, last char is A or Q
  const fifthChar = value[4];
  const lastChar = value[19];
  
  return (fifthChar === 'I' || fifthChar === 'J') && (lastChar === 'A' || lastChar === 'Q');
}

function validateSecretKeyFormat(value: string): boolean {
  // Must be exactly 40 characters
  if (value.length !== 40) return false;
  
  // Must be valid base64 characters
  if (!/^[A-Za-z0-9/+]{40}$/.test(value)) return false;
  
  // Should not be obviously fake patterns
  const repeatingPattern = /(.)\1{5,}/; // 6+ repeated characters
  const sequentialPattern = /012|123|234|345|456|567|678|789|abc|bcd|cde|def/i;
  
  return !repeatingPattern.test(value) && !sequentialPattern.test(value);
}

function validateSessionTokenFormat(value: string): boolean {
  // Session tokens are very long (200+ characters typically)
  if (value.length < 200) return false;
  
  // Must be valid base64
  const base64Pattern = /^[A-Za-z0-9/+]+={0,2}$/;
  if (!base64Pattern.test(value)) return false;
  
  // Should not be obviously fake patterns
  const repeatingPattern = /(.{10,})\1/; // Repeating 10+ char sequences
  return !repeatingPattern.test(value);
}