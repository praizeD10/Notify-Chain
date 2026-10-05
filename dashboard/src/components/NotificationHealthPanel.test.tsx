import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { NotificationHealthPanel } from './NotificationHealthPanel';

const initialStats = { pending: 56, processing: 4, completed: 1234, failed: 7, overdue: 2 };

const healthResponse = {
  status: 'ok',
  timestamp: '2026-10-05T12:00:00Z',
  services: {
    stellarRpc: { status: 'ok' },
    discord: { status: 'ok' },
    eventRegistry: { status: 'ok', eventCount: 10 },
  },
};

const analyticsResponse = {
  totalRecorded: 0,
  windowStart: 0,
  windowEnd: 0,
  overall: {
    total: 0,
    success: 0,
    failure: 0,
    retry: 0,
    skipped: 0,
    successRate: 0,
    averageDurationMs: 0,
  },
  byType: [],
  byContract: [],
  hourlyBuckets: [],
  errorBreakdown: {},
};

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    json: async () => data,
  } as Response;
}

describe('NotificationHealthPanel summary cards', () => {
  let currentStats = initialStats;
  let statsRequest: Promise<Response> | null = null;
  const originalFetch = global.fetch;

  beforeEach(() => {
    currentStats = initialStats;
    statsRequest = null;
    global.fetch = jest.fn((input) => {
      const url = String(input);
      if (url.endsWith('/api/schedule/stats')) {
        return statsRequest ?? Promise.resolve(jsonResponse(currentStats));
      }
      if (url.endsWith('/health')) {
        return Promise.resolve(jsonResponse(healthResponse));
      }
      return Promise.resolve(jsonResponse(analyticsResponse));
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shows a loading state until notification statistics arrive', async () => {
    let resolveStats!: (response: Response) => void;
    statsRequest = new Promise((resolve) => {
      resolveStats = resolve;
    });

    render(<NotificationHealthPanel healthUrl="http://localhost:8787" pollIntervalMs={60_000} />);

    expect(
      screen.getByRole('status', { name: 'Loading delivered notifications' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Loading pending notifications' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Loading failed notifications' })
    ).toBeInTheDocument();

    await act(async () => {
      resolveStats(jsonResponse(initialStats));
      await statsRequest;
    });

    const summary = screen.getByLabelText('Notification summary');
    expect(await within(summary).findByText('1,234')).toBeInTheDocument();
    expect(within(summary).getByText('56')).toBeInTheDocument();
    expect(within(summary).getByText('7')).toBeInTheDocument();
  });

  it('updates summary values when refreshed statistics change', async () => {
    render(<NotificationHealthPanel healthUrl="http://localhost:8787" pollIntervalMs={60_000} />);

    const summary = screen.getByLabelText('Notification summary');
    expect(await within(summary).findByText('1,234')).toBeInTheDocument();

    currentStats = { ...initialStats, pending: 12, completed: 1300, failed: 3 };
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'));
    });

    expect(await within(summary).findByText('1,300')).toBeInTheDocument();
    expect(within(summary).getByText('12')).toBeInTheDocument();
    expect(within(summary).getByText('3')).toBeInTheDocument();
  });
});