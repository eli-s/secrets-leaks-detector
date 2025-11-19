import { generateFindingId, isSameFinding } from '../src/utils/findingId';

describe('Finding ID Generation', () => {
  it('should generate consistent IDs for the same inputs', () => {
    const branchName = 'main';
    const filename = 'src/config/aws.js';
    const secretValue = 'AKIAIOSFODNN7EXAMPLE';

    const id1 = generateFindingId(branchName, filename, secretValue);
    const id2 = generateFindingId(branchName, filename, secretValue);

    expect(id1).toBe(id2);
    expect(id1).toHaveLength(16); // First 16 characters of SHA256
    expect(typeof id1).toBe('string');
  });

  it('should generate different IDs for different secrets in same file', () => {
    const branchName = 'main';
    const filename = 'src/config/aws.js';
    const secretValue1 = 'AKIAIOSFODNN7EXAMPLE';
    const secretValue2 = 'ASIAIOSLONGTERMABC123';

    const id1 = generateFindingId(branchName, filename, secretValue1);
    const id2 = generateFindingId(branchName, filename, secretValue2);

    expect(id1).not.toBe(id2);
  });

  it('should generate different IDs for same secret in different files', () => {
    const branchName = 'main';
    const filename1 = 'src/config/aws.js';
    const filename2 = 'src/config/database.js';
    const secretValue = 'AKIAIOSFODNN7EXAMPLE';

    const id1 = generateFindingId(branchName, filename1, secretValue);
    const id2 = generateFindingId(branchName, filename2, secretValue);

    expect(id1).not.toBe(id2);
  });

  it('should generate different IDs for same secret in different branches', () => {
    const branchName1 = 'main';
    const branchName2 = 'feature/auth';
    const filename = 'src/config/aws.js';
    const secretValue = 'AKIAIOSFODNN7EXAMPLE';

    const id1 = generateFindingId(branchName1, filename, secretValue);
    const id2 = generateFindingId(branchName2, filename, secretValue);

    expect(id1).not.toBe(id2);
  });

  it('should normalize inputs for consistent hashing', () => {
    // Test case insensitivity and whitespace handling
    const id1 = generateFindingId('MAIN', 'SRC/CONFIG/AWS.JS', 'AKIAIOSFODNN7EXAMPLE');
    const id2 = generateFindingId('main', 'src/config/aws.js', 'AKIAIOSFODNN7EXAMPLE');
    const id3 = generateFindingId(' main ', ' src/config/aws.js ', 'AKIAIOSFODNN7EXAMPLE');

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
  });

  it('should handle special characters in filenames', () => {
    const branchName = 'main';
    const filename = 'src/config/aws-config.json';
    const secretValue = 'AKIAIOSFODNN7EXAMPLE';

    const id = generateFindingId(branchName, filename, secretValue);
    
    expect(id).toHaveLength(16);
    expect(typeof id).toBe('string');
  });

  it('should handle empty or undefined inputs gracefully', () => {
    expect(() => generateFindingId('', '', '')).not.toThrow();
    expect(() => generateFindingId('main', '', 'secret')).not.toThrow();
    expect(() => generateFindingId('', 'file.js', 'secret')).not.toThrow();
  });
});

describe('Finding Comparison', () => {
  it('should identify same findings correctly', () => {
    const finding1 = {
      branchName: 'main',
      filename: 'src/config/aws.js',
      secretValue: 'AKIAIOSFODNN7EXAMPLE'
    };

    const finding2 = {
      branchName: 'main',
      filename: 'src/config/aws.js',
      secretValue: 'AKIAIOSFODNN7EXAMPLE'
    };

    expect(isSameFinding(finding1, finding2)).toBe(true);
  });

  it('should identify different findings correctly', () => {
    const finding1 = {
      branchName: 'main',
      filename: 'src/config/aws.js',
      secretValue: 'AKIAIOSFODNN7EXAMPLE'
    };

    const finding2 = {
      branchName: 'main',
      filename: 'src/config/aws.js',
      secretValue: 'ASIAIOSLONGTERMABC123'
    };

    expect(isSameFinding(finding1, finding2)).toBe(false);
  });

  it('should handle case differences in comparison', () => {
    const finding1 = {
      branchName: 'MAIN',
      filename: 'SRC/CONFIG/AWS.JS',
      secretValue: 'AKIAIOSFODNN7EXAMPLE'
    };

    const finding2 = {
      branchName: 'main',
      filename: 'src/config/aws.js',
      secretValue: 'AKIAIOSFODNN7EXAMPLE'
    };

    expect(isSameFinding(finding1, finding2)).toBe(true);
  });
});

describe('Finding ID Use Cases', () => {
  it('should track the same secret across different commits', () => {
    // Same secret found in different commits should have same ID
    const branchName = 'main';
    const filename = 'config/aws.js';
    const secretValue = 'wJALrXutnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY';

    const addedFindingId = generateFindingId(branchName, filename, secretValue);
    const contextFindingId = generateFindingId(branchName, filename, secretValue);
    const removedFindingId = generateFindingId(branchName, filename, secretValue);

    expect(addedFindingId).toBe(contextFindingId);
    expect(contextFindingId).toBe(removedFindingId);
  });

  it('should differentiate secrets in different file locations', () => {
    // Same secret in different locations should have different IDs
    const secretValue = 'AKIAIOSFODNN7EXAMPLE';
    const branchName = 'main';

    const productionId = generateFindingId(branchName, 'src/config/production.js', secretValue);
    const testId = generateFindingId(branchName, 'test/fixtures/aws.js', secretValue);
    const dockerId = generateFindingId(branchName, 'docker/env/aws.env', secretValue);

    expect(productionId).not.toBe(testId);
    expect(testId).not.toBe(dockerId);
    expect(productionId).not.toBe(dockerId);
  });

  it('should handle complex AWS session tokens', () => {
    const branchName = 'feature/auth';
    const filename = 'src/aws/credentials.json';
    const sessionToken = 'FQoDYXdzEPP//////////wEaDNiq11oUzqitIGSp7CKsAUoecwG4UGUhDYbo+leOoCr69T3zjxc3P4P0GM5nnHk7GX/qWtHngiwZ+qKTMsaB2LjyyR47CuAe8GZi2UKEk6aL5wyI3ZCZhUe+lRCBnG7bfPMtJ+70Ojyy6WfMdWaQwExFa/F8WfP2vChsJ3rO5zioqWkzT7qFyBK+qqhSFF7dmKzdYHW3mtfILjqeoLRmcjouNRGHdI/zdA6lZtiRKP4X0uDcEKzsfg/Z8Koow4Sl2QU=';

    const findingId = generateFindingId(branchName, filename, sessionToken);
    
    expect(findingId).toHaveLength(16);
    expect(typeof findingId).toBe('string');
    
    // Same token should generate same ID
    const duplicateId = generateFindingId(branchName, filename, sessionToken);
    expect(findingId).toBe(duplicateId);
  });
});