import * as path from 'path';

import * as vscode from 'vscode';

import type { EnterpriseRole, PerformanceMode, SavedQueryScope, SchemaSnapshotStorage } from '../types/fm';
import type { LogLevel } from './logger';

interface SettingsServiceOptions {
  getConfiguration?: (section?: string) => vscode.WorkspaceConfiguration;
  isWorkspaceTrusted?: () => boolean;
}

export class SettingsService {
  private readonly getConfiguration: (section?: string) => vscode.WorkspaceConfiguration;
  private readonly isWorkspaceTrusted: () => boolean;

  public constructor(options?: SettingsServiceOptions) {
    this.getConfiguration = options?.getConfiguration ?? ((section) => vscode.workspace.getConfiguration(section));
    this.isWorkspaceTrusted = options?.isWorkspaceTrusted ?? (() => vscode.workspace.isTrusted);
  }

  public getLoggingLevel(): LogLevel {
    const configured =
      this.getConfiguration('filemaker').get<string>('logging.level') ??
      this.getConfiguration('filemakerDataApiTools').get<string>('logLevel');

    if (configured === 'debug' || configured === 'info' || configured === 'warn' || configured === 'error') {
      return configured;
    }

    return 'info';
  }

  public getRequestTimeoutMs(): number {
    const configured = this.getConfiguration('filemakerDataApiTools').get<number>('requestTimeoutMs', 15_000);
    if (!Number.isFinite(configured)) {
      return 15_000;
    }

    return clamp(Math.round(configured), 1_000, 120_000);
  }

  public getDefaultApiBasePath(): string {
    const configured = this.getConfiguration('filemakerDataApiTools').get<string>(
      'defaultApiBasePath',
      '/fmi/data'
    );

    return normalizeApiPath(configured, '/fmi/data');
  }

  public getDefaultApiVersionPath(): string {
    const configured = this.getConfiguration('filemakerDataApiTools').get<string>(
      'defaultApiVersionPath',
      'vLatest'
    );
    const trimmed = configured.trim();

    return trimmed.length > 0 ? trimmed.replace(/^\/+|\/+$/g, '') : 'vLatest';
  }

  public getSavedQueriesScope(): SavedQueryScope {
    const configured = this.getConfiguration('filemaker').get<string>('savedQueries.scope', 'workspace');
    return configured === 'global' ? 'global' : 'workspace';
  }

  public getSchemaCacheTtlSeconds(): number {
    const configured = this.getConfiguration('filemaker').get<number>('schema.cacheTtlSeconds', 300);
    if (!Number.isFinite(configured)) {
      return 300;
    }

    return clamp(Math.round(configured), 10, 86_400);
  }

  public isSchemaMetadataEnabled(): boolean {
    return this.getConfiguration('filemaker').get<boolean>('schema.metadataEnabled', true);
  }

  public getHistoryMaxEntries(): number {
    const configured = this.getConfiguration('filemaker').get<number>('history.maxEntries', 10);
    if (!Number.isInteger(configured) || configured <= 0) {
      return 10;
    }

    return clamp(configured, 1, 200);
  }

  public shouldIncludeAuthInSnippetsByDefault(): boolean {
    return this.getConfiguration('filemaker').get<boolean>('snippets.includeAuthByDefault', false);
  }

  public isScriptRunnerEnabled(): boolean {
    return this.getConfiguration('filemaker').get<boolean>('features.scriptRunner.enabled', true);
  }

  public getSchemaSnapshotsStorage(): SchemaSnapshotStorage {
    const configured = this.getConfiguration('filemaker').get<string>(
      'schema.snapshots.storage',
      this.isWorkspaceTrusted() ? 'workspaceFiles' : 'workspaceState'
    );

    if (!this.isWorkspaceTrusted()) {
      return 'workspaceState';
    }

    return configured === 'workspaceState' ? 'workspaceState' : 'workspaceFiles';
  }

  public isSchemaDiagnosticsEnabled(): boolean {
    return this.getConfiguration('filemaker').get<boolean>('schema.diagnostics.enabled', false);
  }

  public getTypegenOutputDir(): string {
    const configured = this.getConfiguration('filemaker').get<string>('typegen.outputDir', 'filemaker-types');
    return sanitizeRelativeDir(configured, 'filemaker-types');
  }

  public getBatchMaxRecords(): number {
    const configured = this.getConfiguration('filemaker').get<number>('batch.maxRecords', 10_000);
    if (!Number.isFinite(configured)) {
      return 10_000;
    }

    return clamp(Math.round(configured), 1, 1_000_000);
  }

  public getBatchConcurrency(): number {
    const configured = this.getConfiguration('filemaker').get<number>('batch.concurrency', 4);
    if (!Number.isFinite(configured)) {
      return 4;
    }

    return clamp(Math.round(configured), 1, 10);
  }

  public getBatchDryRunDefault(): boolean {
    return this.getConfiguration('filemaker').get<boolean>('batch.dryRunDefault', true);
  }

  public isRecordEditEnabled(): boolean {
    return this.getConfiguration('filemaker').get<boolean>('features.recordEdit.enabled', true);
  }

  public isBatchEnabled(): boolean {
    return this.getConfiguration('filemaker').get<boolean>('features.batch.enabled', true);
  }

  public isEnterpriseModeEnabled(): boolean {
    return this.getConfiguration('filemaker').get<boolean>('enterprise.mode', false);
  }

  public getEnterpriseRole(): EnterpriseRole {
    const configured = this.getConfiguration('filemaker').get<string>('enterprise.role', 'developer');
    if (configured === 'viewer' || configured === 'developer' || configured === 'admin') {
      return configured;
    }

    return 'developer';
  }

  public getPerformanceMode(): PerformanceMode {
    const configured = this.getConfiguration('filemaker').get<string>('performance.mode', 'standard');
    return configured === 'high-scale' ? 'high-scale' : 'standard';
  }

  public isOfflineModeEnabled(): boolean {
    return this.getConfiguration('filemaker').get<boolean>('offline.mode', false);
  }

  public getSchemaHashAlgorithm(): string {
    const configured = this.getConfiguration('filemaker').get<string>('schema.hashAlgorithm', 'sha256').trim();
    return configured.length > 0 ? configured : 'sha256';
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeApiPath(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  if (!trimmed.startsWith('/')) {
    return `/${trimmed.replace(/\/+$/, '')}`;
  }

  return trimmed.replace(/\/+$/, '');
}

function sanitizeRelativeDir(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!normalized) {
    return fallback;
  }

  if (normalized.includes('..')) {
    return fallback;
  }

  if (path.isAbsolute(normalized)) {
    return fallback;
  }

  return normalized;
}
