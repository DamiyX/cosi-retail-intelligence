import { render } from '@testing-library/react-native';

import RootLayout from '../app/_layout';

jest.mock('../src/db/initialize', () => ({
  initializeAppDatabase: () => ({
    state: 'failed',
    code: 'MIGRATION_FAILED',
    message: 'Migration 2 (catalogue) failed and was rolled back.',
  }),
}));

it('shows a diagnosable database error instead of a false ready shell', async () => {
  const { findByText, queryByText } = render(<RootLayout />);
  expect(await findByText('Local database unavailable')).toBeTruthy();
  expect(queryByText('Products')).toBeNull();
});
