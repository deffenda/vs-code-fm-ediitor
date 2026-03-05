import nock from 'nock';
import { describe, expect, it, vi } from 'vitest';

import { FMClient } from '../../src/services/fmClient';
import { SecretStore } from '../../src/services/secretStore';
import type { ConnectionProfile } from '../../src/types/fm';
import { InMemorySecretStorage } from '../unit/mocks';

const server = 'https://fm.local';
const apiBase = '/fmi/data/vLatest/databases/TestDB';

function createProfile(): ConnectionProfile {
  return {
    id: 'integration-profile',
    name: 'Integration',
    authMode: 'direct',
    serverUrl: server,
    database: 'TestDB',
    username: 'admin',
    apiBasePath: '/fmi/data',
    apiVersionPath: 'vLatest'
  };
}

async function createClient(timeoutMs = 5_000) {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
  const secretStore = new SecretStore(new InMemorySecretStorage() as never);
  await secretStore.setPassword('integration-profile', 'password123');
  const client = new FMClient(secretStore, logger, timeoutMs);

  return {
    client,
    secretStore,
    logger
  };
}

describe('FMClient integration (mocked HTTP)', () => {
  it('lists layouts successfully', async () => {
    const profile = createProfile();
    const { client, logger } = await createClient();

    nock(server)
      .post(`${apiBase}/sessions`)
      .reply(200, { response: { token: 'token-1' }, messages: [{ code: '0', message: 'OK' }] });

    nock(server)
      .get(`${apiBase}/layouts`)
      .matchHeader('authorization', 'Bearer token-1')
      .reply(200, {
        response: {
          layouts: [{ name: 'Contacts' }, { name: 'Invoices' }]
        },
        messages: [{ code: '0', message: 'OK' }]
      });

    await expect(client.listLayouts(profile)).resolves.toEqual(['Contacts', 'Invoices']);

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('flattens folder layout structures from list layouts response', async () => {
    const profile = createProfile();
    const { client } = await createClient();

    nock(server)
      .post(`${apiBase}/sessions`)
      .reply(200, { response: { token: 'token-folder' }, messages: [{ code: '0', message: 'OK' }] });

    nock(server)
      .get(`${apiBase}/layouts`)
      .matchHeader('authorization', 'Bearer token-folder')
      .reply(200, {
        response: {
          layouts: [
            {
              name: 'Assets',
              folderLayoutNames: [{ name: 'Assets_List' }, { name: 'Assets_Detail' }]
            }
          ]
        },
        messages: [{ code: '0', message: 'OK' }]
      });

    await expect(client.listLayouts(profile)).resolves.toEqual(['Assets_List', 'Assets_Detail']);
  });

  it('gets a record successfully', async () => {
    const profile = createProfile();
    const { client } = await createClient();

    nock(server)
      .post(`${apiBase}/sessions`)
      .reply(200, { response: { token: 'token-2' }, messages: [{ code: '0', message: 'OK' }] });

    nock(server)
      .get(`${apiBase}/layouts/Contacts/records/1`)
      .reply(200, {
        response: {
          data: [
            {
              recordId: '1',
              modId: '0',
              fieldData: { FirstName: 'Ada', LastName: 'Lovelace' }
            }
          ]
        },
        messages: [{ code: '0', message: 'OK' }]
      });

    await expect(client.getRecord(profile, 'Contacts', '1')).resolves.toMatchObject({
      recordId: '1',
      fieldData: { FirstName: 'Ada' }
    });
  });

  it('finds records successfully', async () => {
    const profile = createProfile();
    const { client } = await createClient();

    nock(server)
      .post(`${apiBase}/sessions`)
      .reply(200, { response: { token: 'token-3' }, messages: [{ code: '0', message: 'OK' }] });

    nock(server)
      .post(`${apiBase}/layouts/Contacts/_find`)
      .reply(200, {
        response: {
          data: [
            {
              recordId: '10',
              fieldData: { FirstName: 'Grace', LastName: 'Hopper' }
            }
          ],
          dataInfo: {
            foundCount: 1
          }
        },
        messages: [{ code: '0', message: 'OK' }]
      });

    await expect(
      client.findRecords(profile, 'Contacts', {
        query: [{ FirstName: 'Grace' }],
        limit: 1,
        offset: 0
      })
    ).resolves.toMatchObject({
      data: [
        {
          recordId: '10'
        }
      ]
    });
  });

  it('re-authenticates on 401 and retries once', async () => {
    const profile = createProfile();
    const { client } = await createClient();

    nock(server)
      .post(`${apiBase}/sessions`)
      .reply(200, { response: { token: 'token-old' }, messages: [{ code: '0', message: 'OK' }] });

    nock(server)
      .get(`${apiBase}/layouts`)
      .matchHeader('authorization', 'Bearer token-old')
      .reply(401, {
        messages: [{ code: '952', message: 'Invalid token' }]
      });

    nock(server)
      .post(`${apiBase}/sessions`)
      .reply(200, { response: { token: 'token-new' }, messages: [{ code: '0', message: 'OK' }] });

    nock(server)
      .get(`${apiBase}/layouts`)
      .matchHeader('authorization', 'Bearer token-new')
      .reply(200, {
        response: {
          layouts: [{ name: 'Contacts' }]
        },
        messages: [{ code: '0', message: 'OK' }]
      });

    await expect(client.listLayouts(profile)).resolves.toEqual(['Contacts']);
  });

  it('surfaces FileMaker error payload details', async () => {
    const profile = createProfile();
    const { client } = await createClient();

    nock(server)
      .post(`${apiBase}/sessions`)
      .reply(200, { response: { token: 'token-5' }, messages: [{ code: '0', message: 'OK' }] });

    nock(server)
      .get(`${apiBase}/layouts`)
      .reply(500, {
        messages: [{ code: '500', message: 'Server processing error' }]
      });

    await expect(client.listLayouts(profile)).rejects.toThrow('Server processing error');
  });

  it('handles non-JSON server responses without crashing', async () => {
    const profile = createProfile();
    const { client } = await createClient();

    nock(server)
      .post(`${apiBase}/sessions`)
      .reply(200, { response: { token: 'token-6' }, messages: [{ code: '0', message: 'OK' }] });

    nock(server)
      .get(`${apiBase}/layouts`)
      .reply(500, 'Internal Server Error');

    await expect(client.listLayouts(profile)).rejects.toThrow('HTTP 500');
  });

  it('maps slow responses to timeout errors', async () => {
    const profile = createProfile();
    const { client } = await createClient(50);

    nock(server)
      .post(`${apiBase}/sessions`)
      .delay(100)
      .reply(200, { response: { token: 'token-7' }, messages: [{ code: '0', message: 'OK' }] });

    await expect(client.listLayouts(profile)).rejects.toThrow(/timed out|timeout/i);
  });

  it('maps aborted requests to cancellation errors', async () => {
    const profile = createProfile();
    const { client } = await createClient(5_000);
    const controller = new AbortController();

    nock(server)
      .post(`${apiBase}/sessions`)
      .reply(200, { response: { token: 'token-8' }, messages: [{ code: '0', message: 'OK' }] });

    nock(server)
      .get(`${apiBase}/layouts`)
      .delay(200)
      .reply(200, {
        response: { layouts: [{ name: 'Contacts' }] },
        messages: [{ code: '0', message: 'OK' }]
      });

    setTimeout(() => controller.abort(), 10);

    await expect(client.listLayouts(profile, { signal: controller.signal })).rejects.toThrow(
      /cancelled|canceled|abort/i
    );
  });
});
