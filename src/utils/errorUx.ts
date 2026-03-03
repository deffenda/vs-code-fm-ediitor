import * as vscode from 'vscode';

import { normalizeError } from './normalizeError';
import { redactValue } from './redact';

interface ShowErrorOptions {
  fallbackMessage?: string;
  logger?: {
    error: (message: string, meta?: unknown) => void;
  };
  logMessage?: string;
}

const DETAILS_ACTION = 'Details…';

export async function showErrorWithDetails(
  error: unknown,
  options?: ShowErrorOptions
): Promise<void> {
  const normalized = normalizeError(error, {
    fallbackMessage: options?.fallbackMessage
  });

  options?.logger?.error(options?.logMessage ?? 'Command failed.', {
    error: normalized
  });

  const selection = await vscode.window.showErrorMessage(normalized.message, DETAILS_ACTION);
  if (selection !== DETAILS_ACTION) {
    return;
  }

  const document = await vscode.workspace.openTextDocument({
    language: 'json',
    content: JSON.stringify(
      redactValue({
        message: normalized.message,
        kind: normalized.kind,
        requestId: normalized.requestId,
        endpoint: normalized.endpoint,
        status: normalized.status,
        code: normalized.code,
        isRetryable: normalized.isRetryable,
        safeHeaders: normalized.safeHeaders,
        details: normalized.details
      }),
      null,
      2
    )
  });

  await vscode.window.showTextDocument(document, { preview: false });
}

export function toUserErrorMessage(error: unknown, fallbackMessage = 'Unexpected error.'): string {
  return normalizeError(error, { fallbackMessage }).message;
}
