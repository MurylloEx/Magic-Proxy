import { describe, expect, it } from 'vitest';
import { resolveConfig } from '@/application/config/resolve.js';
import { createBlockUnknownHostsMiddleware } from './block-unknown-hosts.js';
import {
  createMockResponse,
  createMockSocket,
  fakeIncomingMessage,
} from '../../../tests/helpers/mocks.js';

describe('createBlockUnknownHostsMiddleware', () => {
  const config = resolveConfig({
    policy: { allowUnknownHosts: false },
    routes: [{ host: 'allowed.test', targets: ['http://127.0.0.1:1'] }],
  });

  it('calls next for known hosts', () => {
    const advanced = { value: false };
    const middleware = createBlockUnknownHostsMiddleware(config);
    middleware(
      fakeIncomingMessage({ host: 'allowed.test' }),
      createMockResponse(),
      () => {
        advanced.value = true;
      },
    );
    expect(advanced.value).toBe(true);
  });

  it('destroys the socket for unknown hosts', () => {
    const socket = createMockSocket();
    const middleware = createBlockUnknownHostsMiddleware(config);
    middleware(
      fakeIncomingMessage({ host: 'denied.test' }, { socket }),
      createMockResponse(),
      () => {
        throw new Error('should not advance');
      },
    );
    expect(socket.destroyedFlag.value).toBe(true);
  });
});
