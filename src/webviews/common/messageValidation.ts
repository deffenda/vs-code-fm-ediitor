import type { WebviewMessageEnvelope } from '../../types/webviewMessages';

export function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

export function hasMessageType<TType extends string>(
  value: unknown,
  type: TType
): value is WebviewMessageEnvelope<TType> {
  const record = toRecord(value);
  return record?.type === type;
}

export function getStringField(
  value: Record<string, unknown>,
  field: string
): string | undefined {
  const raw = value[field];
  return typeof raw === 'string' ? raw : undefined;
}

export function getOptionalBooleanField(
  value: Record<string, unknown>,
  field: string
): boolean | undefined {
  const raw = value[field];
  return typeof raw === 'boolean' ? raw : undefined;
}

export function getOptionalNumberField(
  value: Record<string, unknown>,
  field: string
): number | undefined {
  const raw = value[field];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}
