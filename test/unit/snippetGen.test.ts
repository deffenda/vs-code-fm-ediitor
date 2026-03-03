import { describe, expect, it } from 'vitest';

import { generateCurlSnippet, generateFetchSnippet } from '../../src/utils/snippetGen';

describe('snippetGen', () => {
  it('redacts authorization header by default', () => {
    const curl = generateCurlSnippet({
      method: 'POST',
      url: 'https://fm.local/fmi/data',
      headers: {
        Authorization: 'Bearer SECRET_TOKEN',
        'Content-Type': 'application/json'
      },
      body: { hello: 'world' }
    });

    expect(curl).toContain('Bearer <REDACTED>');
    expect(curl).not.toContain('SECRET_TOKEN');
  });

  it('includes authorization header when explicitly requested', () => {
    const fetchSnippet = generateFetchSnippet(
      {
        method: 'GET',
        url: 'https://fm.local/fmi/data',
        headers: {
          Authorization: 'Bearer REAL_VALUE'
        }
      },
      {
        includeAuthHeader: true
      }
    );

    expect(fetchSnippet).toContain('REAL_VALUE');
  });
});
