import { describe, expect, it } from 'vitest';
import {
  createBalancerRegistry,
  createRoundRobinBalancer,
  roundRobin,
} from '@/application/balancing/round-robin.js';

describe('createRoundRobinBalancer', () => {
  it('cycles through indices in order', () => {
    const balancer = createRoundRobinBalancer(3, 0);
    expect(balancer.next()).toBe(0);
    expect(balancer.next()).toBe(1);
    expect(balancer.next()).toBe(2);
    expect(balancer.next()).toBe(0);
  });

  it('honours a non-zero initial index', () => {
    const balancer = createRoundRobinBalancer(4, 2);
    expect(balancer.next()).toBe(2);
    expect(balancer.next()).toBe(3);
    expect(balancer.next()).toBe(0);
  });

  it('rejects non-positive sizes', () => {
    expect(() => createRoundRobinBalancer(0)).toThrow(/positive size/);
    expect(() => createRoundRobinBalancer(-1)).toThrow(/positive size/);
  });
});

describe('createBalancerRegistry', () => {
  it('keeps independent cursors for http and websocket', () => {
    const registry = createBalancerRegistry(roundRobin());
    const httpTargets = ['http://a', 'http://b'] as const;
    const wsTargets = ['ws://a', 'ws://b', 'ws://c'] as const;

    expect(registry.pick('route', 'http', httpTargets, 0)).toBe('http://a');
    expect(registry.pick('route', 'websocket', wsTargets, 0)).toBe('ws://a');
    expect(registry.pick('route', 'http', httpTargets, 0)).toBe('http://b');
    expect(registry.pick('route', 'websocket', wsTargets, 0)).toBe('ws://b');
    expect(registry.pick('route', 'http', httpTargets, 0)).toBe('http://a');
  });

  it('returns undefined when destinations are empty', () => {
    const registry = createBalancerRegistry();
    expect(registry.pick('route', 'http', [], 0)).toBeUndefined();
  });

  it('accepts a custom strategy', () => {
    const alwaysLast = (size: number): ReturnType<typeof createRoundRobinBalancer> => ({
      size,
      next: () => size - 1,
    });
    const registry = createBalancerRegistry(alwaysLast);
    expect(registry.pick('r', 'http', ['a', 'b', 'c'], 0)).toBe('c');
  });
});
