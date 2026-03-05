import { describe, expect, it } from 'vitest';

import { SecretStore } from '../../src/services/secretStore';
import { InMemorySecretStorage } from './mocks';

describe('SecretStore', () => {
  it('stores and retrieves profile secrets', async () => {
    const storage = new InMemorySecretStorage();
    const store = new SecretStore(storage as never);

    await store.setPassword('profile-1', 'pass-1');
    await store.setSessionToken('profile-1', 'token-1');
    await store.setProxyApiKey('profile-1', 'proxy-1');

    await expect(store.getPassword('profile-1')).resolves.toBe('pass-1');
    await expect(store.getSessionToken('profile-1')).resolves.toBe('token-1');
    await expect(store.getProxyApiKey('profile-1')).resolves.toBe('proxy-1');

    await store.clearProfileSecrets('profile-1');

    await expect(store.getPassword('profile-1')).resolves.toBeUndefined();
    await expect(store.getSessionToken('profile-1')).resolves.toBeUndefined();
    await expect(store.getProxyApiKey('profile-1')).resolves.toBeUndefined();
  });
});
