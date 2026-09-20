/**
 * Strategy interface for selecting the next upstream index.
 */
export interface LoadBalancer {
  readonly next: () => number;
  readonly size: number;
}

/**
 * Round-Robin load balancer (Strategy pattern).
 * Cursor state lives in a private ref — the public config remains immutable.
 */
export function createRoundRobinBalancer(
  size: number,
  initialIndex = 0,
): LoadBalancer {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error('Round-robin balancer requires a positive size');
  }

  const normalizedInitial =
    ((initialIndex % size) + size) % size;
  const cursor = { value: normalizedInitial };

  return {
    size,
    next: (): number => {
      const current = cursor.value;
      cursor.value = (current + 1) % size;
      return current;
    },
  };
}

export type DestinationKind = 'http' | 'websocket';

export interface BalancerRegistry {
  readonly pick: (
    routeKey: string,
    kind: DestinationKind,
    destinations: readonly string[],
    initialRound: number,
  ) => string | undefined;
}

/**
 * Lazily creates and caches Round-Robin balancers per route + destination kind.
 * HTTP and WebSocket counters are independent (v3 behaviour).
 */
export function createBalancerRegistry(): BalancerRegistry {
  const balancers = new Map<string, LoadBalancer>();

  return {
    pick: (
      routeKey: string,
      kind: DestinationKind,
      destinations: readonly string[],
      initialRound: number,
    ): string | undefined => {
      if (destinations.length === 0) {
        return undefined;
      }

      const cacheKey = `${routeKey}:${kind}`;
      const existing = balancers.get(cacheKey);
      const balancer =
        existing ??
        createRoundRobinBalancer(destinations.length, initialRound);

      if (!existing) {
        balancers.set(cacheKey, balancer);
      }

      const index = balancer.next();
      return destinations[index];
    },
  };
}
