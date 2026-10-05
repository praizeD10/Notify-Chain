import '@testing-library/jest-dom';
import { render, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ExportHistoryPage } from './ExportHistoryPage';

expect.extend(toHaveNoViolations);

test('ExportHistoryPage has no accessibility violations', async () => {
  const { container } = render(<ExportHistoryPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

test('ExportHistoryPage renders correctly and lists mock exports', async () => {
  const { getByText, findByRole, getAllByRole } = render(<ExportHistoryPage />);
  
  // Header text
  expect(getByText('Notification Export History')).toBeInTheDocument();
  expect(getByText(/Manage, filter, and download/)).toBeInTheDocument();
  
  // Table
  expect(await findByRole('table')).toBeInTheDocument();
  
  // First page mock rows (limit is 5)
  const rows = getAllByRole('row');
  // 1 header row + 5 data rows = 6 rows total
  expect(rows).toHaveLength(6);
});

test('ExportHistoryPage search and filtering works', async () => {
  const { getByLabelText, queryByText, findByText } = render(<ExportHistoryPage />);
  
  // Search for "System Alert" which exists in the mock list
  const searchInput = getByLabelText('Search Exports');
  fireEvent.change(searchInput, { target: { value: 'System Alert' } });
  
  // Should see it
  expect(await findByText('System Alert Notification logs')).toBeInTheDocument();
  
  // Should NOT see other items
  expect(queryByText('Monthly billing export')).not.toBeInTheDocument();
});

test('ExportHistoryPage pagination limit and page switching works', async () => {
  const { getByLabelText, getByText, queryByText, findByText } = render(<ExportHistoryPage />);
  
  // Initially we are on page 1 of 3 (15 items total, limit 5)
  expect(await findByText('Page 1 of 3')).toBeInTheDocument();
  expect(getByText('15 total export records')).toBeInTheDocument();
  expect(getByText('System Alert Notification logs')).toBeInTheDocument();
  
  // Click Next
  const nextBtn = getByText('Next');
  fireEvent.click(nextBtn);
  
  expect(getByText('Page 2 of 3')).toBeInTheDocument();
  expect(queryByText('System Alert Notification logs')).not.toBeInTheDocument();
  
  // Change limit to 10
  const selectLimit = getByLabelText('Items per page');
  fireEvent.change(selectLimit, { target: { value: '10' } });
  
  // Pages should recalculate to page 1 of 2
  expect(getByText('Page 1 of 2')).toBeInTheDocument();
});
