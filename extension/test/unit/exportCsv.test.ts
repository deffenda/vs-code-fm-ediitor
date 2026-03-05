import { describe, expect, it } from 'vitest';

import { escapeCsvValue, recordsToCsv } from '../../src/utils/exportCsv';

describe('exportCsv', () => {
  it('escapes commas, quotes, and newlines', () => {
    expect(escapeCsvValue('Hello, world')).toBe('"Hello, world"');
    expect(escapeCsvValue('He said "Hi"')).toBe('"He said ""Hi"""');
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it('exports records with header row', () => {
    const csv = recordsToCsv([
      { recordId: '1', Name: 'Ada Lovelace', Note: 'Mathematician' },
      { recordId: '2', Name: 'Grace Hopper', Note: 'Computer scientist' }
    ]);

    const lines = csv.split('\n');
    expect(lines[0]).toContain('recordId');
    expect(lines[1]).toContain('Ada Lovelace');
    expect(lines[2]).toContain('Grace Hopper');
  });
});
