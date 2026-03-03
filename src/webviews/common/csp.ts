import type * as vscode from 'vscode';

interface CspOptions {
  nonce: string;
  allowInlineStyleWithNonce?: boolean;
  allowUnsafeInlineStyles?: boolean;
  connectSources?: string[];
  imageSources?: string[];
}

export function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';

  for (let index = 0; index < 32; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return value;
}

export function buildWebviewCsp(webview: vscode.Webview, options: CspOptions): string {
  const styleSources = [webview.cspSource];
  if (options.allowInlineStyleWithNonce) {
    styleSources.push(`'nonce-${options.nonce}'`);
  }
  if (options.allowUnsafeInlineStyles) {
    styleSources.push(`'unsafe-inline'`);
  }

  const connectSources = [webview.cspSource, ...(options.connectSources ?? [])];
  const imageSources = [webview.cspSource, 'data:', ...(options.imageSources ?? [])];

  return [
    "default-src 'none'",
    `img-src ${dedupe(imageSources).join(' ')}`,
    `style-src ${dedupe(styleSources).join(' ')}`,
    `script-src 'nonce-${options.nonce}'`,
    `connect-src ${dedupe(connectSources).join(' ')}`
  ].join('; ');
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}
