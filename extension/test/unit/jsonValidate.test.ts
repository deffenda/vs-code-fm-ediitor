import { describe, expect, it } from 'vitest';

import {
  parseFindJson,
  parseOptionalNonNegativeInteger,
  parseSortJson,
  validateObjectArray
} from '../../src/utils/jsonValidate';

describe('jsonValidate', () => {
  it('parses valid find/sort arrays', () => {
    const find = parseFindJson('[{"Name":"Ada"}]');
    const sort = parseSortJson('[{"fieldName":"Name","sortOrder":"ascend"}]');

    expect(find.ok).toBe(true);
    expect(sort.ok).toBe(true);
    expect(find.value).toEqual([{ Name: 'Ada' }]);
  });

  it('rejects invalid JSON and non-array payloads', () => {
    const invalidJson = parseFindJson('{');
    const invalidType = validateObjectArray({ Name: 'Ada' }, 'Find JSON');
    const invalidItems = validateObjectArray([1, 2], 'Find JSON');

    expect(invalidJson.ok).toBe(false);
    expect(invalidType.ok).toBe(false);
    expect(invalidItems.ok).toBe(false);
  });

  it('parses optional non-negative integers', () => {
    expect(parseOptionalNonNegativeInteger(undefined, 'Limit')).toBeUndefined();
    expect(parseOptionalNonNegativeInteger('', 'Limit')).toBeUndefined();
    expect(parseOptionalNonNegativeInteger('10', 'Limit')).toBe(10);
    expect(() => parseOptionalNonNegativeInteger('-1', 'Limit')).toThrow();
  });
});
