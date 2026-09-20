import { describe, expect, it } from 'vitest';
import {
  createForceHttpsMiddleware,
  createHstsHeaderMiddleware,
} from './force-https.js';
import {
  createMockResponse,
  fakeIncomingMessage,
} from '../../../tests/helpers/mocks.js';

describe('createForceHttpsMiddleware', () => {
  it('redirects non-localhost HTTP requests to HTTPS', () => {
    const res = createMockResponse();
    const middleware = createForceHttpsMiddleware(3_600);
    middleware(
      fakeIncomingMessage({ host: 'app.example.com' }, { url: '/path' }),
      res,
      () => {
        throw new Error('should redirect');
      },
    );

    expect(res.statusCode).toBe(301);
    expect(res.getHeader('location')).toBe('https://app.example.com/path');
  });

  it('skips redirect for localhost and continues', () => {
    const advanced = { value: false };
    const middleware = createForceHttpsMiddleware(undefined);
    middleware(
      fakeIncomingMessage({ host: 'localhost:8080' }),
      createMockResponse(),
      () => {
        advanced.value = true;
      },
    );
    expect(advanced.value).toBe(true);
  });

  it('attaches HSTS and continues when the request is already HTTPS', () => {
    const res = createMockResponse();
    const advanced = { value: false };
    const middleware = createForceHttpsMiddleware(100);
    middleware(
      fakeIncomingMessage({
        host: 'app.example.com',
        'x-forwarded-proto': 'https',
      }),
      res,
      () => {
        advanced.value = true;
      },
    );

    expect(advanced.value).toBe(true);
    expect(res.getHeader('strict-transport-security')).toBe(
      'max-age=100; includeSubDomains',
    );
  });
});

describe('createHstsHeaderMiddleware', () => {
  it('sets Strict-Transport-Security and continues', () => {
    const res = createMockResponse();
    const advanced = { value: false };
    createHstsHeaderMiddleware(31_536_000)(
      fakeIncomingMessage({ host: 'a' }),
      res,
      () => {
        advanced.value = true;
      },
    );
    expect(advanced.value).toBe(true);
    expect(res.getHeader('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });
});
