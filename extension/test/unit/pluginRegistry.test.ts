import { describe, expect, it, vi, beforeEach } from 'vitest';

const commandHandlers = new Map<string, (...args: unknown[]) => Promise<void> | void>();

vi.mock('vscode', () => {
  return {
    commands: {
      registerCommand: vi.fn((command: string, handler: (...args: unknown[]) => Promise<void> | void) => {
        commandHandlers.set(command, handler);
        return {
          dispose: () => commandHandlers.delete(command)
        };
      }),
      executeCommand: vi.fn(async () => undefined)
    },
    window: {
      registerTreeDataProvider: vi.fn(() => ({ dispose: () => undefined })),
      showInformationMessage: vi.fn(async () => undefined)
    },
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
      isTrusted: true
    }
  };
});

import { PluginRegistry } from '../../src/plugins/pluginRegistry';
import type { FileMakerPlugin } from '../../src/plugins/pluginTypes';

describe('PluginRegistry', () => {
  beforeEach(() => {
    commandHandlers.clear();
  });

  it('loads internal plugins and registers plugin commands', async () => {
    const run = vi.fn(async () => undefined);
    const plugin: FileMakerPlugin = {
      id: 'demo',
      name: 'Demo Plugin',
      activate: vi.fn(),
      commands: [
        {
          id: 'hello',
          title: 'Hello',
          run
        }
      ]
    };

    const registry = new PluginRegistry(
      {
        listProfiles: vi.fn(async () => []),
        getProfile: vi.fn(async () => undefined)
      } as never,
      {
        listLayouts: vi.fn(async () => []),
        getLayoutMetadata: vi.fn(async () => ({}))
      } as never,
      {
        getFeatureGuard: vi.fn(() => ({ allowed: true })),
        assertFeature: vi.fn(async () => true)
      } as never,
      {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      },
      {
        internalPlugins: [plugin],
        isWorkspaceTrusted: () => true,
        getWorkspaceRoot: () => '/workspace',
        readDir: async () => []
      }
    );

    await registry.reload();

    expect(registry.listActivePlugins()).toHaveLength(1);
    const command = commandHandlers.get('filemakerDataApiTools.plugin.demo.hello');
    expect(command).toBeTypeOf('function');

    await command?.();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('skips workspace plugin loading in untrusted workspaces', async () => {
    const importModule = vi.fn(async () => ({
      default: {
        id: 'workspace-plugin',
        name: 'Workspace Plugin',
        activate: async () => undefined
      }
    }));

    const registry = new PluginRegistry(
      {
        listProfiles: vi.fn(async () => []),
        getProfile: vi.fn(async () => undefined)
      } as never,
      {
        listLayouts: vi.fn(async () => []),
        getLayoutMetadata: vi.fn(async () => ({}))
      } as never,
      {
        getFeatureGuard: vi.fn(() => ({ allowed: true })),
        assertFeature: vi.fn(async () => true)
      } as never,
      {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      },
      {
        internalPlugins: [],
        isWorkspaceTrusted: () => false,
        getWorkspaceRoot: () => '/workspace',
        readDir: async () => ['demo.js'],
        importModule
      }
    );

    await registry.reload();

    expect(importModule).not.toHaveBeenCalled();
    expect(registry.listActivePlugins()).toHaveLength(0);
  });

  it('enforces requiresAdmin command restrictions', async () => {
    const run = vi.fn(async () => undefined);
    const plugin: FileMakerPlugin = {
      id: 'admin-tools',
      name: 'Admin Tools',
      activate: vi.fn(),
      commands: [
        {
          id: 'danger',
          title: 'Dangerous Command',
          requiresAdmin: true,
          run
        }
      ]
    };

    const roleGuard = {
      getFeatureGuard: vi.fn(() => ({ allowed: true })),
      assertFeature: vi.fn(async () => false)
    };

    const registry = new PluginRegistry(
      {
        listProfiles: vi.fn(async () => []),
        getProfile: vi.fn(async () => undefined)
      } as never,
      {
        listLayouts: vi.fn(async () => []),
        getLayoutMetadata: vi.fn(async () => ({}))
      } as never,
      roleGuard as never,
      {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      },
      {
        internalPlugins: [plugin],
        isWorkspaceTrusted: () => true,
        getWorkspaceRoot: () => '/workspace',
        readDir: async () => []
      }
    );

    await registry.reload();

    const command = commandHandlers.get('filemakerDataApiTools.plugin.admin-tools.danger');
    await command?.();

    expect(roleGuard.assertFeature).toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});
