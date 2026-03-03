import { describe, expect, it } from 'vitest';

import {
  getOptionalBooleanField,
  getOptionalNumberField,
  getStringField,
  hasMessageType,
  toRecord
} from '../../src/webviews/common/messageValidation';

describe('messageValidation', () => {
  it('guards object records', () => {
    expect(toRecord(null)).toBeUndefined();
    expect(toRecord([])).toBeUndefined();
    expect(toRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it('checks message type', () => {
    expect(hasMessageType({ type: 'ready' }, 'ready')).toBe(true);
    expect(hasMessageType({ type: 'other' }, 'ready')).toBe(false);
  });

  it('reads typed fields', () => {
    const record = { a: 'x', b: true, c: 42 };
    expect(getStringField(record, 'a')).toBe('x');
    expect(getOptionalBooleanField(record, 'b')).toBe(true);
    expect(getOptionalNumberField(record, 'c')).toBe(42);
    expect(getOptionalNumberField(record, 'a')).toBeUndefined();
  });
});
