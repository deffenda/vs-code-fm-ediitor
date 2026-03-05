import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => {
  return {
    workspace: {
      getConfiguration: () => ({
        get: () => undefined
      })
    },
    commands: {
      executeCommand: vi.fn(async () => undefined)
    },
    env: {
      openExternal: vi.fn(async () => true)
    },
    window: {
      showWarningMessage: vi.fn(async () => undefined)
    },
    Uri: {
      parse: (value: string) => ({ toString: () => value })
    }
  };
});

import { RoleGuard } from '../../src/enterprise/roleGuard';

function createConfiguration(values: Record<string, unknown>) {
  return {
    get<T>(key: string, fallback?: T): T {
      if (key in values) {
        return values[key] as T;
      }

      return fallback as T;
    },
    update: vi.fn(async () => undefined)
  };
}

describe('RoleGuard', () => {
  it('applies viewer restrictions when enterprise mode is enabled', async () => {
    const guard = new RoleGuard(
      {
        debug: vi.fn(),
        warn: vi.fn()
      },
      {
        getConfiguration: () =>
          createConfiguration({
            'enterprise.mode': true,
            'enterprise.role': 'viewer',
            'offline.mode': false
          }) as never,
        isWorkspaceTrusted: () => true,
        getWorkspaceRoot: () => '/workspace',
        readConfigFile: async () => undefined
      }
    );

    await guard.refresh();

    expect(guard.getRole()).toBe('viewer');
    expect(guard.getFeatureGuard('recordEdit').allowed).toBe(false);
    expect(guard.getFeatureGuard('batchUpdate').allowed).toBe(false);
    expect(guard.getFeatureGuard('environmentExport').allowed).toBe(false);
  });

  it('enforces config-file disabled features and forced performance mode', async () => {
    const guard = new RoleGuard(
      {
        debug: vi.fn(),
        warn: vi.fn()
      },
      {
        getConfiguration: () =>
          createConfiguration({
            'enterprise.mode': false,
            'enterprise.role': 'admin',
            'performance.mode': 'standard',
            'offline.mode': false
          }) as never,
        isWorkspaceTrusted: () => true,
        getWorkspaceRoot: () => '/workspace',
        readConfigFile: async () =>
          JSON.stringify({
            enterpriseMode: true,
            role: 'developer',
            disabledFeatures: ['environmentExport'],
            enforcedPerformanceMode: 'high-scale'
          })
      }
    );

    await guard.refresh();

    expect(guard.isEnterpriseModeEnabled()).toBe(true);
    expect(guard.getRole()).toBe('developer');
    expect(guard.resolvePerformanceMode()).toBe('high-scale');
    expect(guard.getFeatureGuard('environmentExport').allowed).toBe(false);
  });

  it('blocks write operations when offline mode is enabled', async () => {
    const guard = new RoleGuard(
      {
        debug: vi.fn(),
        warn: vi.fn()
      },
      {
        getConfiguration: () =>
          createConfiguration({
            'enterprise.mode': false,
            'offline.mode': true
          }) as never,
        isWorkspaceTrusted: () => true,
        getWorkspaceRoot: () => '/workspace',
        readConfigFile: async () => undefined
      }
    );

    await guard.refresh();

    expect(guard.getFeatureGuard('recordEdit').allowed).toBe(false);
    expect(guard.getFeatureGuard('writeOperations').allowed).toBe(false);
    expect(guard.getFeatureGuard('environmentExport').allowed).toBe(true);
  });
});
