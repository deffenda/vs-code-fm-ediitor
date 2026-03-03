import { describe, expect, it } from 'vitest';

import { SettingsService } from '../../src/services/settingsService';

type ConfigMap = Record<string, Record<string, unknown>>;

function createSettings(overrides?: ConfigMap, trusted = true): SettingsService {
  const data: ConfigMap = overrides ?? {};

  return new SettingsService({
    getConfiguration: (section?: string) =>
      ({
        get: <T>(key: string, defaultValue?: T): T => {
          const sectionData = section ? data[section] ?? {} : {};
          const value = sectionData[key] as T | undefined;
          return value ?? (defaultValue as T);
        }
      }) as never,
    isWorkspaceTrusted: () => trusted
  });
}

describe('SettingsService', () => {
  it('uses defaults when values are missing', () => {
    const settings = createSettings();
    expect(settings.getLoggingLevel()).toBe('info');
    expect(settings.getRequestTimeoutMs()).toBe(15_000);
    expect(settings.getSavedQueriesScope()).toBe('workspace');
    expect(settings.getTypegenOutputDir()).toBe('filemaker-types');
  });

  it('normalizes invalid values', () => {
    const settings = createSettings({
      filemaker: {
        'logging.level': 'verbose',
        'savedQueries.scope': 'bad',
        'batch.concurrency': 99,
        'typegen.outputDir': '../outside'
      },
      filemakerDataApiTools: {
        requestTimeoutMs: 10
      }
    });

    expect(settings.getLoggingLevel()).toBe('info');
    expect(settings.getSavedQueriesScope()).toBe('workspace');
    expect(settings.getBatchConcurrency()).toBe(10);
    expect(settings.getRequestTimeoutMs()).toBe(1_000);
    expect(settings.getTypegenOutputDir()).toBe('filemaker-types');
  });

  it('forces workspaceState storage in untrusted workspaces', () => {
    const settings = createSettings(
      {
        filemaker: {
          'schema.snapshots.storage': 'workspaceFiles'
        }
      },
      false
    );

    expect(settings.getSchemaSnapshotsStorage()).toBe('workspaceState');
  });
});
