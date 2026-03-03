import { describe, expect, it } from 'vitest';

import { JobRunner } from '../../src/services/jobRunner';
import { InMemoryMemento } from './mocks';

async function waitFor(condition: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition.');
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('JobRunner', () => {
  it('runs jobs and persists summaries', async () => {
    const memento = new InMemoryMemento();
    const runner = new JobRunner(memento as never);

    const handle = runner.startJob('Example Job', async (context) => {
      context.reportProgress(25, 'starting');
      context.reportProgress(100, 'done');
      return { ok: true };
    });

    await waitFor(() => handle.getState().status === 'completed');

    const state = handle.getState();
    expect(state.status).toBe('completed');
    expect(state.progress).toBe(100);

    const recent = runner.getRecentSummaries();
    expect(recent).toHaveLength(1);
    const first = recent.at(0);
    expect(first?.name).toBe('Example Job');
  });

  it('supports cancellation', async () => {
    const memento = new InMemoryMemento();
    const runner = new JobRunner(memento as never);

    const handle = runner.startJob('Cancelable', async (context) => {
      for (let i = 0; i < 50; i += 1) {
        if (context.isCancellationRequested()) {
          return;
        }

        context.reportProgress(i * 2);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    });

    handle.cancel();
    await waitFor(() => handle.getState().status === 'cancelled');
    expect(handle.getState().status).toBe('cancelled');
  });
});
