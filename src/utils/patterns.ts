import { AwsSecretPattern } from '../models/types';

export const awssecretpatterns: AwsSecretPattern[] = [
  {
    name: 'AWS Access Key ID',
    pattern: /AKIA[0-9A-Z]{16}/g,
    description: 'AWS Access Key ID'
  },
  {
    name: 'AWS Secret Access Key',
    pattern: /aws_secret_access_key\s*=\s*["\']?([A-Za-z0-9/+=]{40})["\']?/gi,
    description: 'AWS Secret Access Key in configuration'
  },
  {
    name: 'AWS Secret Access Key (standalone)',
    pattern: /[A-Za-z0-9/+=]{40}/g,
    description: 'Potential AWS Secret Access Key (40 chars base64)'
  },
  {
    name: 'AWS Session Token',
    pattern: /aws_session_token\s*=\s*["\']?([A-Za-z0-9/+=]{16,})["\']?/gi,
    description: 'AWS Session Token'
  },
  {
    name: 'AWS Account ID',
    pattern: /aws_account_id\s*=\s*["\']?(\d{12})["\']?/gi,
    description: 'AWS Account ID'
  },
  {
    name: 'AWS Region in config',
    pattern: /aws_default_region\s*=\s*["\']?([a-z0-9-]+)["\']?/gi,
    description: 'AWS Default Region'
  },
  {
    name: 'AWS CLI Credentials',
    pattern: /\[default\][\s\S]*?aws_access_key_id\s*=\s*([A-Z0-9]{20})/gi,
    description: 'AWS CLI Credentials in config file'
  }
];

export function detectawssecrets(content: string): { pattern: AwsSecretPattern; match: string; line: number }[] {
  const findings: { pattern: AwsSecretPattern; match: string; line: number }[] = [];
  const lines = content.split('\n');
  
  for (let lineindex = 0; lineindex < lines.length; lineindex++) {
    const line = lines[lineindex];
    
    for (const pattern of awssecretpatterns) {
      const matches = line.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          if (islikelysecret(match, pattern.name)) {
            findings.push({
              pattern,
              match: match.trim(),
              line: lineindex + 1
            });
          }
        }
      }
    }
  }
  
  return findings;
}

function islikelysecret(value: string, patternname: string): boolean {
  const lowercasevalue = value.toLowerCase();
  
  const excludepatterns = [
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
    '123'
  ];
  
  for (const exclude of excludepatterns) {
    if (lowercasevalue.includes(exclude)) {
      return false;
    }
  }
  
  if (patternname === 'AWS Secret Access Key (standalone)') {
    return value.length === 40 && /^[A-Za-z0-9/+=]+$/.test(value);
  }
  
  return true;
}