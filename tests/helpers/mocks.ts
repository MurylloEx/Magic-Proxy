import type { IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';
import type { Socket } from 'node:net';

export function fakeIncomingMessage(
  headers: IncomingMessage['headers'],
  extras: Partial<IncomingMessage> = {},
): IncomingMessage {
  return {
    headers,
    url: extras.url ?? '/',
    method: extras.method ?? 'GET',
    socket: extras.socket ?? ({ destroy: () => undefined } as unknown as Socket),
    ...extras,
  } as IncomingMessage;
}

export type MockResponse = ServerResponse & {
  readonly body: Buffer[];
  readonly ended: boolean;
};

export function createMockResponse(): MockResponse {
  const headers = new Map<string, string | number | readonly string[]>();
  const body: Buffer[] = [];
  const state = {
    headersSent: false,
    writableEnded: false,
    statusCode: 200,
    destroyed: false,
  };

  const res = {
    get headersSent() {
      return state.headersSent;
    },
    get writableEnded() {
      return state.writableEnded;
    },
    get writableFinished() {
      return state.writableEnded;
    },
    get statusCode() {
      return state.statusCode;
    },
    set statusCode(value: number) {
      state.statusCode = value;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    writeHead(
      statusCode: number,
      reasonOrHeaders?: string | Record<string, string | number | string[]>,
      maybeHeaders?: Record<string, string | number | string[]>,
    ) {
      state.statusCode = statusCode;
      state.headersSent = true;
      const hdrs =
        typeof reasonOrHeaders === 'object' ? reasonOrHeaders : maybeHeaders;
      if (hdrs) {
        Object.entries(hdrs).forEach(([key, value]) => {
          headers.set(key.toLowerCase(), value);
        });
      }
      return res;
    },
    end(chunk?: unknown) {
      state.headersSent = true;
      state.writableEnded = true;
      if (chunk !== undefined && chunk !== null) {
        body.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      return res;
    },
    destroy() {
      state.destroyed = true;
    },
    on() {
      return res;
    },
    once() {
      return res;
    },
    body,
    get ended() {
      return state.writableEnded;
    },
  };

  return res as unknown as MockResponse;
}

export function createMockSocket(): Socket & {
  readonly destroyedFlag: { value: boolean };
  readonly writes: Buffer[];
} {
  const destroyedFlag = { value: false };
  const writes: Buffer[] = [];
  const emitter = new EventEmitter();

  const socket = Object.assign(emitter, {
    destroyedFlag,
    writes,
    destroy() {
      destroyedFlag.value = true;
      emitter.emit('close');
    },
    write(chunk: Buffer | string) {
      writes.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    },
    pipe() {
      return socket;
    },
    unshift() {
      return undefined;
    },
    end() {
      return socket;
    },
  });

  return socket as unknown as Socket & {
    readonly destroyedFlag: { value: boolean };
    readonly writes: Buffer[];
  };
}
