import type * as vscode from 'vscode';

const PASSWORD_PREFIX = 'filemakerDataApiTools.profile.password';
const TOKEN_PREFIX = 'filemakerDataApiTools.profile.sessionToken';
const PROXY_KEY_PREFIX = 'filemakerDataApiTools.profile.proxyApiKey';

function profileKey(prefix: string, profileId: string): string {
  return `${prefix}.${profileId}`;
}

export class SecretStore {
  public constructor(private readonly secrets: vscode.SecretStorage) {}

  public async setPassword(profileId: string, password: string): Promise<void> {
    await this.secrets.store(profileKey(PASSWORD_PREFIX, profileId), password);
  }

  public async getPassword(profileId: string): Promise<string | undefined> {
    return this.secrets.get(profileKey(PASSWORD_PREFIX, profileId));
  }

  public async deletePassword(profileId: string): Promise<void> {
    await this.secrets.delete(profileKey(PASSWORD_PREFIX, profileId));
  }

  public async setSessionToken(profileId: string, token: string): Promise<void> {
    await this.secrets.store(profileKey(TOKEN_PREFIX, profileId), token);
  }

  public async getSessionToken(profileId: string): Promise<string | undefined> {
    return this.secrets.get(profileKey(TOKEN_PREFIX, profileId));
  }

  public async deleteSessionToken(profileId: string): Promise<void> {
    await this.secrets.delete(profileKey(TOKEN_PREFIX, profileId));
  }

  public async setProxyApiKey(profileId: string, apiKey: string): Promise<void> {
    await this.secrets.store(profileKey(PROXY_KEY_PREFIX, profileId), apiKey);
  }

  public async getProxyApiKey(profileId: string): Promise<string | undefined> {
    return this.secrets.get(profileKey(PROXY_KEY_PREFIX, profileId));
  }

  public async deleteProxyApiKey(profileId: string): Promise<void> {
    await this.secrets.delete(profileKey(PROXY_KEY_PREFIX, profileId));
  }

  public async clearProfileSecrets(profileId: string): Promise<void> {
    await Promise.all([
      this.deletePassword(profileId),
      this.deleteSessionToken(profileId),
      this.deleteProxyApiKey(profileId)
    ]);
  }
}
