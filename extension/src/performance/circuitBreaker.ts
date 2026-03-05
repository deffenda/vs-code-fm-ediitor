export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold?: number;
  openMs?: number;
  halfOpenSuccessThreshold?: number;
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly openMs: number;
  private readonly halfOpenSuccessThreshold: number;

  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private openUntil = 0;
  private halfOpenSuccessCount = 0;

  public constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = normalize(options?.failureThreshold, 5, 1, 50);
    this.openMs = normalize(options?.openMs, 5_000, 100, 60_000);
    this.halfOpenSuccessThreshold = normalize(options?.halfOpenSuccessThreshold, 2, 1, 10);
  }

  public getState(now = Date.now()): CircuitBreakerState {
    return this.evaluateState(now);
  }

  public canRequest(now = Date.now()): boolean {
    const state = this.evaluateState(now);
    return state !== 'open';
  }

  public recordSuccess(now = Date.now()): void {
    const state = this.evaluateState(now);

    if (state === 'half-open') {
      this.halfOpenSuccessCount += 1;
      if (this.halfOpenSuccessCount >= this.halfOpenSuccessThreshold) {
        this.reset();
      }
      return;
    }

    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
  }

  public recordFailure(now = Date.now()): void {
    const state = this.evaluateState(now);

    if (state === 'half-open') {
      this.trip(now);
      return;
    }

    this.failureCount += 1;

    if (this.failureCount >= this.failureThreshold) {
      this.trip(now);
    }
  }

  public reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
    this.openUntil = 0;
  }

  private trip(now: number): void {
    this.state = 'open';
    this.openUntil = now + this.openMs;
    this.failureCount = this.failureThreshold;
    this.halfOpenSuccessCount = 0;
  }

  private evaluateState(now = Date.now()): CircuitBreakerState {
    if (this.state !== 'open') {
      return this.state;
    }

    if (now < this.openUntil) {
      return 'open';
    }

    this.state = 'half-open';
    this.halfOpenSuccessCount = 0;
    return 'half-open';
  }
}

function normalize(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}
