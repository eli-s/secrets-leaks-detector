import { detectAwsSecrets, awsSecretPatterns } from '../src/utils/patterns';

describe('AWS Secret Detection', () => {
  describe('Access Key ID Detection', () => {
    it('should detect long-term AWS access keys (AKIA)', () => {
      const content = 'AKIAI2345677777777A'; // Valid format: AKIA + I + A-Z2-7 chars + A
      const findings = detectAwsSecrets(content);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].pattern.name).toBe('AWS Access Key ID (Long-term)');
      expect(findings[0].match).toBe('AKIAI2345677777777A');
    });

    it('should detect temporary AWS access keys (ASIA)', () => {
      const content = 'ASIAJ2345677777777Q'; // Valid format: ASIA + J + A-Z2-7 chars + Q
      const findings = detectAwsSecrets(content);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].pattern.name).toBe('AWS Access Key ID (Temporary)');
      expect(findings[0].match).toBe('ASIAJ2345677777777Q');
    });

    it('should validate access key format correctly', () => {
      const validKey = 'AKIAI2345677777777A'; // Proper format
      const invalidKey = 'AKIA123456789012345'; // Contains invalid chars (1, 9)
      
      const validFindings = detectAwsSecrets(validKey);
      const invalidFindings = detectAwsSecrets(invalidKey);
      
      expect(validFindings).toHaveLength(1);
      expect(invalidFindings).toHaveLength(0);
    });
  });

  describe('Secret Access Key Detection', () => {
    it('should detect standalone AWS secret keys', () => {
      const content = 'wEaDNiq11oUzqitIGSp7CKsAUoecwG4UGUhDYbo+';
      const findings = detectAwsSecrets(content);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].pattern.name).toBe('AWS Secret Access Key (standalone)');
    });

    it('should detect secret keys in configuration format', () => {
      const content = 'aws_secret_access_key = wEaDNiq11oUzqitIGSp7CKsAUoecwG4UGUhDYbo+';
      const findings = detectAwsSecrets(content);
      
      expect(findings).toHaveLength(1); // Only config pattern should match (standalone filtered out)
      expect(findings.some(f => f.pattern.name === 'AWS Secret Access Key')).toBe(true);
    });

    it('should exclude test/fake patterns', () => {
      const testPatterns = [
        'abcdefghijklmnopqrstuvwxyz1234567890ABCD', // Sequential
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // Repeated
        'exampleSecretKeyHere1234567890ABCDEFGH', // Contains 'example'
        'testSecretKeyValue1234567890ABCDEFGHIJ' // Contains 'test'
      ];
      
      testPatterns.forEach(pattern => {
        const findings = detectAwsSecrets(pattern);
        expect(findings).toHaveLength(0);
      });
    });
  });

  describe('Session Token Detection', () => {
    it('should detect AWS session tokens', () => {
      const sessionToken = 'FQoDYXdzEPP//////////wEaDNiq11oUzqitIGSp7CKsAUoecwG4UGUhDYbo+leOoCr69T3zjxc3P4P0GM5nnHk7GX/qWtHngiwZ+qKTMsaB2LjyyR47CuAe8GZi2UKEk6aL5wyI3ZCZhUe+lRCBnG7bfPMtJ+70Ojyy6WfMdWaQwExFa/F8WfP2vChsJ3rO5zioqWkzT7qFyBK+qqhSFF7dmKzdYHW3mtfILjqeoLRmcjouNRGHdI/zdA6lZtiRKP4X0uDcEKzsfg/Z8Koow4Sl2QU=';
      const findings = detectAwsSecrets(sessionToken);
      
      // Should only find the session token, not substrings
      expect(findings).toHaveLength(1);
      expect(findings[0].pattern.name).toBe('AWS Session Token (standalone)');
      expect(findings[0].match).toBe(sessionToken.replace(/=$/, '')); // Session token regex strips trailing =
    });

    it('should detect session tokens in configuration', () => {
      const content = 'aws_session_token = FQoDYXdzEPP//////////wEaDNiq11oUzqitIGSp7CKsAUoecwG4UGUhDYbo+leOoCr69T3zjxc3P4P0GM5nnHk7GX/qWtHngiwZ+qKTMsaB2LjyyR47CuAe8GZi2UKEk6aL5wyI3ZCZhUe+lRCBnG7bfPMtJ+70Ojyy6WfMdWaQwExFa/F8WfP2vChsJ3rO5zioqWkzT7qFyBK+qqhSFF7dmKzdYHW3mtfILjqeoLRmcjouNRGHdI/zdA6lZtiRKP4X0uDcEKzsfg/Z8Koow4Sl2QU=';
      const findings = detectAwsSecrets(content);
      
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings.some(f => f.pattern.name.includes('Session Token'))).toBe(true);
    });
  });

  describe('Pattern Priority and Overlaps', () => {
    it('should not create multiple findings for substrings of session tokens', () => {
      // This session token contains 40-char sequences that could match secret key patterns
      const sessionToken = 'FQoDYXdzEPP//////////wEaDNiq11oUzqitIGSp7CKsAUoecwG4UGUhDYbo+leOoCr69T3zjxc3P4P0GM5nnHk7GX/qWtHngiwZ+qKTMsaB2LjyyR47CuAe8GZi2UKEk6aL5wyI3ZCZhUe+lRCBnG7bfPMtJ+70Ojyy6WfMdWaQwExFa/F8WfP2vChsJ3rO5zioqWkzT7qFyBK+qqhSFF7dmKzdYHW3mtfILjqeoLRmcjouNRGHdI/zdA6lZtiRKP4X0uDcEKzsfg/Z8Koow4Sl2QU=';
      const findings = detectAwsSecrets(sessionToken);
      
      // Should only find the session token, not its 40-char substrings
      expect(findings).toHaveLength(1);
      expect(findings[0].pattern.name).toBe('AWS Session Token (standalone)');
    });
  });

  describe('Configuration Detection', () => {
    it('should detect AWS CLI credentials block', () => {
      const content = `[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = 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`;
      
      const findings = detectAwsSecrets(content);
      
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some(f => f.pattern.name.includes('CLI Credentials'))).toBe(true);
    });

    it('should detect account IDs', () => {
      const content = 'aws_account_id = 123456789012';
      const findings = detectAwsSecrets(content);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].pattern.name).toBe('AWS Account ID');
      expect(findings[0].match).toBe('aws_account_id = 123456789012');
    });
  });

  describe('Line Number Tracking', () => {
    it('should correctly track line numbers', () => {
      const content = `line 1
line 2 with AKIAI2345677777777A
line 3`;
      
      const findings = detectAwsSecrets(content);
      
      expect(findings.length).toBeGreaterThan(0);
      if (findings.length > 0) {
        expect(findings[0].line).toBe(2);
      }
    });
  });
});