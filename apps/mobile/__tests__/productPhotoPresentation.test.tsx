import { Modal } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ProductPhoto from '../src/media/ProductPhoto';
import type { ProductPhotos } from '../src/media/productPhotos';

it('does not reread/checksum the same mounted photo on unrelated parent renders', () => {
  const photos = { read: jest.fn(() => ({ status: 'available', uri: 'file:///private/a.jpg' })) } as unknown as ProductPhotos;
  const { rerender, unmount } = render(<ProductPhoto photos={photos} productId="a" compact />);
  rerender(<ProductPhoto photos={photos} productId="a" compact />);
  rerender(<ProductPhoto photos={photos} productId="a" compact />);
  expect(photos.read).toHaveBeenCalledTimes(1);
  unmount();
});

it('enlarges, closes/back-dismisses, and invalidates photos on product/store changes or image failure', () => {
  const photos = { read: jest.fn((id: string) => ({ status: 'available', uri: `file:///private/${id}.jpg` })) } as unknown as ProductPhotos;
  const { rerender, unmount } = render(<ProductPhoto photos={photos} productId="a" productName="A" compact />);
  fireEvent.press(screen.getByLabelText('Enlarge a photo'));
  expect(screen.getByLabelText('A enlarged photo')).toBeTruthy();
  fireEvent.press(screen.getByText('Close photo'));
  expect(screen.queryByLabelText('A enlarged photo')).toBeNull();
  fireEvent.press(screen.getByLabelText('Enlarge a photo'));
  fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
  expect(screen.queryByLabelText('A enlarged photo')).toBeNull();
  fireEvent.press(screen.getByLabelText('Enlarge a photo'));
  rerender(<ProductPhoto photos={photos} productId="b" productName="B" compact />);
  expect(screen.queryByLabelText('A enlarged photo')).toBeNull();
  expect(screen.getByLabelText('Product identification photo').props.source.uri).toBe('file:///private/b.jpg');
  fireEvent(screen.getByLabelText('Product identification photo'), 'error');
  expect(screen.getByText('Identification photo missing or damaged on this device.')).toBeTruthy();
  const otherStore = { read: jest.fn(() => ({ status: 'none' })) } as unknown as ProductPhotos;
  rerender(<ProductPhoto photos={otherStore} productId="b" compact />);
  expect(screen.getByText('No identification photo on this device.')).toBeTruthy();
  expect(photos.read).toHaveBeenCalledTimes(2);
  unmount();
});
