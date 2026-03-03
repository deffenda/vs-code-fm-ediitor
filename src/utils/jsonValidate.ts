import { FMClientError } from '../services/errors';

export type JsonObject = Record<string, unknown>;
export type JsonObjectArray = JsonObject[];

export interface JsonValidationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

function isObjectRecord(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateObjectArray(value: unknown, label: string): JsonValidationResult<JsonObjectArray> {
  if (!Array.isArray(value)) {
    return {
      ok: false,
      error: `${label} must be a JSON array.`
    };
  }

  const invalid = value.find((item) => !isObjectRecord(item));
  if (invalid !== undefined) {
    return {
      ok: false,
      error: `${label} array items must be objects.`
    };
  }

  return {
    ok: true,
    value: value as JsonObjectArray
  };
}

export function parseObjectArrayJson(input: string, label: string): JsonValidationResult<JsonObjectArray> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return {
      ok: false,
      error: `${label} must be valid JSON.`
    };
  }

  return validateObjectArray(parsed, label);
}

export function parseFindJson(input: string): JsonValidationResult<JsonObjectArray> {
  return parseObjectArrayJson(input, 'Find JSON');
}

export function parseSortJson(input: string): JsonValidationResult<JsonObjectArray> {
  return parseObjectArrayJson(input, 'Sort JSON');
}

export function assertObjectArray(value: unknown, label: string): JsonObjectArray {
  const validated = validateObjectArray(value, label);
  if (!validated.ok || !validated.value) {
    throw new FMClientError(validated.error ?? `${label} is invalid.`);
  }

  return validated.value;
}

export function parseOptionalNonNegativeInteger(value: string | undefined, label: string): number | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FMClientError(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

export function validateServerUrl(value: string): JsonValidationResult<string> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Server URL is required.'
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        ok: false,
        error: 'Server URL must start with http:// or https://.'
      };
    }

    return {
      ok: true,
      value: parsed.toString().replace(/\/+$/, '')
    };
  } catch {
    return {
      ok: false,
      error: 'Server URL is invalid.'
    };
  }
}

export function validateDatabaseName(value: string): JsonValidationResult<string> {
  return validateBasicName(value, 'Database name');
}

export function validateLayoutName(value: string): JsonValidationResult<string> {
  return validateBasicName(value, 'Layout name');
}

export function validateRecordId(value: string): JsonValidationResult<string> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Record ID is required.'
    };
  }

  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    return {
      ok: false,
      error: 'Record ID contains unsupported characters.'
    };
  }

  return {
    ok: true,
    value: trimmed
  };
}

export function validateProfileId(value: string): JsonValidationResult<string> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Profile ID is required.'
    };
  }

  if (!/^[A-Za-z0-9._-]{1,120}$/.test(trimmed)) {
    return {
      ok: false,
      error: 'Profile ID must be 1-120 chars and use only letters, numbers, dots, underscores, or dashes.'
    };
  }

  return {
    ok: true,
    value: trimmed
  };
}

function validateBasicName(value: string, label: string): JsonValidationResult<string> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: `${label} is required.`
    };
  }

  if (trimmed.length > 255) {
    return {
      ok: false,
      error: `${label} is too long.`
    };
  }

  if (hasControlCharacters(trimmed)) {
    return {
      ok: false,
      error: `${label} contains invalid control characters.`
    };
  }

  return {
    ok: true,
    value: trimmed
  };
}

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) < 32) {
      return true;
    }
  }

  return false;
}
