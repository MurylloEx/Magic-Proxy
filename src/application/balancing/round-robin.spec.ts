import { describe, expect, it } from 'vitest';
import {
  createBalancerRegistry,
  createRoundRobinBalancer,
  roundRobin,
} from './round-robin.js';

describe('createRoundRobinBalancer', () => {
  it('cycles through indices in order', () => {
    const balancer = createRoundRobinBalancer(3, 0);
    expect(balancer.size).toBe(3);
    expect(balancer.next()).toBe(0);
    expect(balancer.next()).toBe(1);
    expect(balancer.next()).toBe(2);
    expect(balancer.next()).toBe(0);
  });

  it('normalises a negative initial index into range', () => {
    const balancer = createRoundRobinBalancer(4, -1);
    expect(balancer.next()).toBe(3);
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

describe('roundRobin', () => {
  it('returns the default strategy factory', () => {
    expect(roundRobin()).toBe(createRoundRobinBalancer);
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
  });

  it('returns undefined when destinations are empty', () => {
    expect(createBalancerRegistry().pick('route', 'http', [], 0)).toBeUndefined();
  });

  it('accepts a custom strategy', () => {
    const alwaysLast = (size: number) => ({
      size,
      next: () => size - 1,
    });
    expect(
      createBalancerRegistry(alwaysLast).pick('r', 'http', ['a', 'b', 'c'], 0),
    ).toBe('c');
  });
});
