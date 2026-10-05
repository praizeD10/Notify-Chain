import { fireEvent, render, screen } from '@testing-library/react';
import { ChannelDetailsPage } from './ChannelDetailsPage';

test('filters channel cards by keyword and shows a clearable no-results state', async () => {
  render(<ChannelDetailsPage />);

  const search = await screen.findByRole('searchbox', { name: 'Search channels' });
  fireEvent.change(search, { target: { value: 'webhook' } });

  expect(screen.getByRole('article', { name: 'Discord channel details' })).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: 'Email channel details' })).not.toBeInTheDocument();
  expect(screen.getByText('1 of 4 channels')).toBeInTheDocument();

  fireEvent.change(search, { target: { value: 'no matching channel' } });
  expect(screen.getByRole('status')).toHaveTextContent('No channels found');
  expect(screen.getByText(/No channels match "no matching channel"/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.getAllByRole('article')).toHaveLength(4);
});