import { mkdir, readFile, writeFile } from 'fs/promises';
import { isAbsolute, relative, resolve } from 'path';

import type { FMClient } from './fmClient';
import type { Logger } from './logger';
import type { SchemaService } from './schemaService';
import type {
  ConnectionProfile,
  FileMakerFieldMetadata,
  GeneratedLayoutArtifacts,
  GeneratedSnippetsArtifacts
} from '../types/fm';
import { hashObject } from '../utils/hash';
import { createNameMap, toPascalCaseIdentifier } from '../utils/nameSanitize';

interface TypeGenServiceOptions {
  getOutputDir?: () => string;
  getWorkspaceRoot?: () => string | undefined;
  isWorkspaceTrusted?: () => boolean;
}

export class TypeGenService {
  private readonly getOutputDir: () => string;
  private readonly getWorkspaceRoot: () => string | undefined;
  private readonly isWorkspaceTrusted: () => boolean;

  public constructor(
    private readonly schemaService: SchemaService,
    private readonly fmClient: FMClient,
    private readonly logger: Pick<Logger, 'debug' | 'info' | 'warn' | 'error'>,
    options?: TypeGenServiceOptions
  ) {
    this.getOutputDir = options?.getOutputDir ?? (() => 'filemaker-types');
    this.getWorkspaceRoot = options?.getWorkspaceRoot ?? (() => undefined);
    this.isWorkspaceTrusted = options?.isWorkspaceTrusted ?? (() => true);
  }

  public async generateTypesForLayout(
    profile: ConnectionProfile,
    layout: string
  ): Promise<GeneratedLayoutArtifacts> {
    const schema = await this.schemaService.getLayoutSchema(profile, layout);
    if (!schema.supported) {
      throw new Error(schema.message ?? 'Schema metadata is not available for this layout.');
    }

    const metadataHash = hashObject(schema.metadata ?? schema.fields);
    const content = this.renderTypeFile(profile, layout, schema.fields, metadataHash);
    const filePath = await this.writeTypeFile(layout, content);

    return {
      layout,
      filePath,
      content,
      metadataHash
    };
  }

  public async generateTypesForAllLayouts(profile: ConnectionProfile): Promise<GeneratedLayoutArtifacts[]> {
    const layouts = await this.fmClient.listLayouts(profile);
    const artifacts: GeneratedLayoutArtifacts[] = [];

    for (const layout of layouts) {
      try {
        artifacts.push(await this.generateTypesForLayout(profile, layout));
      } catch (error) {
        this.logger.warn('Skipping type generation for layout due to metadata error.', {
          profileId: profile.id,
          layout,
          error
        });
      }
    }

    return artifacts;
  }

  public async generateSnippetsForLayout(
    profile: ConnectionProfile,
    layout: string
  ): Promise<GeneratedSnippetsArtifacts> {
    if (!this.isWorkspaceTrusted()) {
      throw new Error('Workspace is untrusted. Snippet generation to files is disabled.');
    }

    const root = this.getWorkspaceRoot();
    if (!root) {
      throw new Error('Open a workspace folder to generate snippets.');
    }

    const snippetsDir = resolveSafeWorkspacePath(root, 'snippets');
    const filePath = resolveSafeWorkspacePath(root, 'snippets', 'filemaker-data-api.code-snippets');
    await mkdir(snippetsDir, { recursive: true });

    const snippets = await this.readExistingSnippets(filePath);
    const keyPrefix = sanitizeSnippetKey(layout);

    snippets[`${keyPrefix} Find Records`] = {
      prefix: `fm find ${layout}`,
      description: `Find ${layout} records via extension client`,
      body: [
        "const result = await vscode.commands.executeCommand('filemakerDataApiTools.runFindJson', {",
        `  profileId: '\${1:${profile.id}}',`,
        `  layout: '\${2:${layout}}'`,
        '});',
        'console.log(result);'
      ]
    };

    snippets[`${keyPrefix} Get Record`] = {
      prefix: `fm get ${layout}`,
      description: `Get ${layout} record by ID via extension client`,
      body: [
        "await vscode.commands.executeCommand('filemakerDataApiTools.getRecordById', {",
        `  profileId: '\${1:${profile.id}}',`,
        `  layout: '\${2:${layout}}'`,
        '});'
      ]
    };

    const content = `${JSON.stringify(snippets, null, 2)}\n`;
    await writeFile(filePath, content, 'utf8');

    return {
      filePath,
      content
    };
  }

  private async writeTypeFile(layout: string, content: string): Promise<string> {
    if (!this.isWorkspaceTrusted()) {
      throw new Error('Workspace is untrusted. Type generation to files is disabled.');
    }

    const root = this.getWorkspaceRoot();
    if (!root) {
      throw new Error('Open a workspace folder to generate files.');
    }

    const outputDir = sanitizeRelativeOutputDir(this.getOutputDir());
    const fileName = `${sanitizeLayoutFileName(layout)}.ts`;
    const outputLayoutsDir = resolveSafeWorkspacePath(root, outputDir, 'layouts');
    const filePath = resolveSafeWorkspacePath(root, outputDir, 'layouts', fileName);

    await mkdir(outputLayoutsDir, { recursive: true });
    await writeFile(filePath, content, 'utf8');

    return filePath;
  }

  private renderTypeFile(
    profile: ConnectionProfile,
    layout: string,
    fields: FileMakerFieldMetadata[],
    metadataHash: string
  ): string {
    const timestamp = new Date().toISOString();
    const nameMap = createNameMap(fields.map((field) => field.name));
    const baseName = toPascalCaseIdentifier(layout);
    const fieldDataTypeName = `${baseName}FieldData`;
    const rawFieldTypeName = `${baseName}RawFieldData`;
    const recordTypeName = `${baseName}Record`;
    const findRequestTypeName = `${baseName}FindRequest`;
    const findResponseTypeName = `${baseName}FindResponse`;

    const rawTypeRows = fields
      .map((field) => `  ${JSON.stringify(field.name)}?: ${toTsType(field)};`)
      .join('\n');

    const friendlyRows = nameMap.mappings
      .map(
        (mapping) =>
          `  ${mapping.friendlyName}?: ${toTsType(findField(fields, mapping.rawName))}; // ${mapping.rawName}`
      )
      .join('\n');

    const mapRows = nameMap.mappings
      .map((mapping) => `  ${JSON.stringify(mapping.friendlyName)}: ${JSON.stringify(mapping.rawName)},`)
      .join('\n');

    return `/**
 * AUTO-GENERATED FILE. DO NOT EDIT.
 * Generated at: ${timestamp}
 * Profile: ${profile.name} (${profile.id})
 * Layout: ${layout}
 * Metadata hash (sha256): ${metadataHash}
 */

export interface ${rawFieldTypeName} {
${rawTypeRows}
}

export interface ${fieldDataTypeName} {
${friendlyRows}
}

export const ${baseName}FieldNameMap = {
${mapRows}
} as const;

export interface ${recordTypeName} {
  recordId: string;
  modId?: string;
  fieldData: ${rawFieldTypeName};
  portalData?: Record<string, Array<Record<string, unknown>>>;
}

export interface ${findRequestTypeName} {
  query: Array<Partial<${rawFieldTypeName}>>;
  sort?: Array<Record<string, unknown>>;
  limit?: number;
  offset?: number;
}

export interface ${findResponseTypeName} {
  data: ${recordTypeName}[];
  dataInfo?: Record<string, unknown>;
}
`;
  }

  private async readExistingSnippets(path: string): Promise<Record<string, unknown>> {
    try {
      const content = await readFile(path, 'utf8');
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
}

function toTsType(field: FileMakerFieldMetadata | undefined): string {
  if (!field) {
    return 'unknown';
  }

  const type = `${field.type ?? field.result ?? ''}`.toLowerCase();

  if (type.includes('number') || type.includes('integer') || type.includes('float') || type.includes('decimal')) {
    return 'number';
  }

  if (type.includes('boolean')) {
    return 'boolean';
  }

  if (type.includes('timestamp') || type.includes('date') || type.includes('time')) {
    return 'string';
  }

  if (type.includes('container')) {
    return 'string | { src?: string }';
  }

  if (type.length > 0) {
    return 'string';
  }

  return 'unknown';
}

function findField(
  fields: FileMakerFieldMetadata[],
  fieldName: string
): FileMakerFieldMetadata | undefined {
  return fields.find((field) => field.name === fieldName);
}

function sanitizeLayoutFileName(layout: string): string {
  const normalized = layout
    .trim()
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.length > 0 ? normalized : 'layout';
}

function sanitizeSnippetKey(layout: string): string {
  return layout.replace(/[^\w\s-]+/g, '').trim() || 'Layout';
}

function sanitizeRelativeOutputDir(value: string): string {
  const normalized = value.replace(/\\/g, '/').trim().replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('..') || isAbsolute(normalized)) {
    return 'filemaker-types';
  }

  return normalized;
}

function resolveSafeWorkspacePath(root: string, ...segments: string[]): string {
  const resolved = resolve(root, ...segments);
  const relativePath = relative(root, resolved);
  const parts = relativePath.split(/[\\/]/).filter((part) => part.length > 0);
  if (relativePath.startsWith('..') || parts.includes('..')) {
    throw new Error('Refusing to write outside workspace root.');
  }

  return resolved;
}
