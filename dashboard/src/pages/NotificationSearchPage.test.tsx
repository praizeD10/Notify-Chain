import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationSearchPage } from './NotificationSearchPage';
import { searchNotifications } from '../services/eventsApi';
import type { NotificationSearchResponse } from '../services/eventsApi';

jest.mock('../services/eventsApi', () => ({
  ...jest.requireActual('../services/eventsApi'),
  searchNotifications: jest.fn(),
}));

const mockedSearch = searchNotifications as jest.MockedFunction<typeof searchNotifications>;

function emptyResponse(): NotificationSearchResponse {
  return {
    results: [],
    total: 0,
    limit: 20,
    offset: 0,
    itemCount: 0,
    totalPages: 0,
  };
}

const mockResult: NotificationSearchResponse = {
  results: [
    {
      id: 1,
      source: 'scheduled',
      eventId: 'evt-abc',
      txHash: '0xdeadbeef',
      contractAddress: 'CABCDEF',
      notificationType: 'email',
      targetRecipient: 'user@example.com',
      status: 'PENDING',
      createdAt: '2026-01-15T12:00:00.000Z',
      payload: null,
      failureReason: null,
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
  itemCount: 1,
  totalPages: 1,
};

async function advanceSearchDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(300);
    await Promise.resolve();
  });
}

describe('NotificationSearchPage', () => {
  beforeEach(() => {
    mockedSearch.mockReset();
    mockedSearch.mockResolvedValue(emptyResponse());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders type, delivery status, and date filter controls', () => {
    render(<NotificationSearchPage />);

    expect(screen.getByLabelText(/filter by notification type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by delivery status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter from date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter to date/i)).toBeInTheDocument();
  });

  it('calls searchNotifications with the selected type, status, and dates', async () => {
    jest.useFakeTimers();
    render(<NotificationSearchPage />);

    fireEvent.change(screen.getByLabelText(/filter by notification type/i), {
      target: { value: 'discord' },
    });
    fireEvent.change(screen.getByLabelText(/filter by delivery status/i), {
      target: { value: 'FAILED' },
    });
    fireEvent.change(screen.getByLabelText(/filter from date/i), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText(/filter to date/i), {
      target: { value: '2026-01-31' },
    });
    await advanceSearchDebounce();

    await waitFor(() => expect(mockedSearch).toHaveBeenCalled());
    expect(mockedSearch.mock.calls[mockedSearch.mock.calls.length - 1]?.[1]).toMatchObject({
      type: 'discord',
      status: 'FAILED',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
  });

  it('shows a loading state and then renders returned results', async () => {
    jest.useFakeTimers();
    let resolveSearch!: (response: NotificationSearchResponse) => void;
    mockedSearch.mockReturnValue(new Promise((resolve) => {
      resolveSearch = resolve;
    }));

    render(<NotificationSearchPage />);
    fireEvent.change(screen.getByLabelText(/free-text search/i), {
      target: { value: 'payment' },
    });
    await advanceSearchDebounce();

    expect(screen.getByLabelText(/searching notifications/i)).toHaveAttribute('aria-busy', 'true');

    await act(async () => resolveSearch(mockResult));
    expect(await screen.findByText('evt-abc')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('shows a no-results state and clears the filters on request', async () => {
    jest.useFakeTimers();
    render(<NotificationSearchPage />);
    fireEvent.change(screen.getByLabelText(/filter by notification type/i), {
      target: { value: 'sms' },
    });
    await advanceSearchDebounce();

    expect(screen.getByText('No results found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByLabelText(/filter by notification type/i)).toHaveValue('');
  });

  it('copies the notification ID from a result card', async () => {
    jest.useFakeTimers();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    mockedSearch.mockResolvedValue(mockResult);

    render(<NotificationSearchPage />);
    fireEvent.change(screen.getByLabelText(/free-text search/i), {
      target: { value: 'test' },
    });
    await advanceSearchDebounce();

    const copyButton = await screen.findByRole('button', { name: /copy notification id/i });
    await act(async () => fireEvent.click(copyButton));
    expect(writeText).toHaveBeenCalledWith('1');
  });
});

describe('searchNotifications URL parameters', () => {
  it('serializes type, status, and dates into the request URL', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => emptyResponse(),
    });
    global.fetch = fetchMock;

    try {
      const { searchNotifications: realSearch } = jest.requireActual(
        '../services/eventsApi'
      ) as typeof import('../services/eventsApi');
      await realSearch('http://localhost:8787', {
        type: 'webhook',
        status: 'COMPLETED',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      const requestUrl = String(fetchMock.mock.calls[0][0]);
      expect(requestUrl).toContain('type=webhook');
      expect(requestUrl).toContain('status=COMPLETED');
      expect(requestUrl).toContain('startDate=2026-01-01');
      expect(requestUrl).toContain('endDate=2026-01-31');
    } finally {
      global.fetch = originalFetch;
    }
  });
});