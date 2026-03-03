import { mkdtemp, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';

import { TypeGenService } from '../../src/services/typeGenService';
import type { ConnectionProfile } from '../../src/types/fm';

function createProfile(): ConnectionProfile {
  return {
    id: 'profile-a',
    name: 'Dev',
    authMode: 'direct',
    serverUrl: 'https://fm.local',
    database: 'TestDB',
    username: 'admin'
  };
}

describe('TypeGenService', () => {
  it('generates layout type files with field maps', async () => {
    const root = await mkdtemp(join(tmpdir(), 'fm-typegen-'));

    const schemaService = {
      getLayoutSchema: vi.fn().mockResolvedValue({
        supported: true,
        fromCache: false,
        metadata: { fieldMetaData: [{ name: 'First Name', type: 'text' }] },
        fields: [
          { name: 'First Name', type: 'text' },
          { name: 'Age', type: 'number' }
        ]
      })
    };

    const fmClient = {
      listLayouts: vi.fn().mockResolvedValue(['Contacts'])
    };

    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const service = new TypeGenService(schemaService as never, fmClient as never, logger as never, {
      getOutputDir: () => 'filemaker-types',
      getWorkspaceRoot: () => root,
      isWorkspaceTrusted: () => true
    });

    const artifact = await service.generateTypesForLayout(createProfile(), 'Contacts');
    expect(artifact.filePath).toContain('filemaker-types/layouts/Contacts.ts');
    expect(artifact.content).toContain('export interface ContactsFieldData');
    expect(artifact.content).toContain('ContactsFieldNameMap');

    const content = await readFile(artifact.filePath, 'utf8');
    expect(content).toContain('"firstName": "First Name"');
  });

  it('generates snippets file for a layout', async () => {
    const root = await mkdtemp(join(tmpdir(), 'fm-snippets-'));

    const service = new TypeGenService({} as never, {} as never, {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as never, {
      getWorkspaceRoot: () => root,
      isWorkspaceTrusted: () => true
    });

    const snippets = await service.generateSnippetsForLayout(createProfile(), 'Contacts');
    expect(snippets.filePath).toContain('snippets/filemaker-data-api.code-snippets');
    expect(snippets.content).toContain('Contacts Find Records');
  });
});
