import type { FileMakerRecord } from './fm';

export interface DataApiMessage {
  code: string;
  message: string;
}

export interface DataApiEnvelope<TResponse extends Record<string, unknown>> {
  response: TResponse;
  messages: DataApiMessage[];
}

export interface DataApiSessionResponse {
  token?: string;
  [key: string]: unknown;
}

export interface DataApiLayoutInfo {
  name?: string;
  layoutName?: string;
  layout?: string;
  displayName?: string;
  isFolder?: boolean;
  type?: string;
  folderLayoutNames?: unknown[];
  layouts?: unknown[];
  children?: unknown[];
  items?: unknown[];
  layoutNames?: unknown[];
  [key: string]: unknown;
}

export interface DataApiListLayoutsResponse {
  layouts?: DataApiLayoutInfo[];
  [key: string]: unknown;
}

export interface DataApiListRecordsResponse {
  data?: FileMakerRecord[];
  dataInfo?: Record<string, unknown>;
  [key: string]: unknown;
}
