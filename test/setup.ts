import nock from 'nock';
import { vi } from 'vitest';

vi.mock('vscode', () => {
  const outputChannel = {
    appendLine: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn()
  };

  const createUri = (value: string) => ({ fsPath: value, toString: () => value });

  return {
    workspace: {
      isTrusted: true,
      workspaceFolders: [{ uri: createUri('/tmp/workspace') }],
      getConfiguration: vi.fn(() => ({
        get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue)
      })),
      openTextDocument: vi.fn(),
      fs: {
        writeFile: vi.fn(),
        readFile: vi.fn(),
        createDirectory: vi.fn()
      }
    },
    window: {
      showErrorMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      showQuickPick: vi.fn(),
      showInputBox: vi.fn(),
      showSaveDialog: vi.fn(),
      showOpenDialog: vi.fn(),
      showTextDocument: vi.fn(),
      createOutputChannel: vi.fn(() => outputChannel),
      createWebviewPanel: vi.fn()
    },
    commands: {
      executeCommand: vi.fn(),
      registerCommand: vi.fn(() => ({ dispose: vi.fn() }))
    },
    env: {
      clipboard: {
        writeText: vi.fn()
      },
      openExternal: vi.fn()
    },
    Uri: {
      parse: vi.fn((value: string) => createUri(value)),
      file: vi.fn((value: string) => createUri(value)),
      joinPath: vi.fn((_base: { fsPath: string }, ...segments: string[]) => createUri(segments.join('/')))
    },
    languages: {
      createDiagnosticCollection: vi.fn(() => ({
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        dispose: vi.fn()
      }))
    },
    ViewColumn: {
      One: 1
    }
  };
});

beforeAll(() => {
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.enableNetConnect();
});
