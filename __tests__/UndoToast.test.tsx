import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';

const mockDismissUndo = jest.fn();
let mockUndo: any = null;

jest.mock('../src/store/toast', () => ({
  useToastStore: Object.assign(
    (selector: any) => selector({ undo: mockUndo, dismissUndo: mockDismissUndo }),
    { getState: () => ({ showUndo: jest.fn(), dismissUndo: mockDismissUndo, undo: mockUndo }) },
  ),
}));

jest.mock('../src/theme', () => ({
  useTheme: () => ({
    bg: '#0a0a1a',
    surface: '#1a1a2e',
    surfaceLight: '#2a2a4e',
    border: '#2a2a4e',
    text: '#fff',
    textDim: '#888',
    primary: '#6C63FF',
  }),
}));

import { UndoToast } from '../src/components/UndoToast';

beforeEach(() => {
  jest.clearAllMocks();
  mockUndo = null;
});

it('returns null when no undo action', async () => {
  await render(<UndoToast />);
  expect(screen.queryByText('common.undo')).toBeNull();
});

it('renders message and undo button when undo action exists', async () => {
  mockUndo = { id: 'test', message: 'Miner removed', onUndo: jest.fn(), onConfirm: jest.fn() };
  await render(<UndoToast />);
  expect(screen.getByText('Miner removed')).toBeTruthy();
  expect(screen.getByText('common.undo')).toBeTruthy();
});

it('tapping undo calls onUndo and dismissUndo', async () => {
  const onUndo = jest.fn();
  mockUndo = { id: 'test', message: 'Miner removed', onUndo, onConfirm: jest.fn() };
  await render(<UndoToast />);
  fireEvent.press(screen.getByText('common.undo'));
  expect(onUndo).toHaveBeenCalled();
  expect(mockDismissUndo).toHaveBeenCalled();
});

it('undo button has correct accessibility label', async () => {
  mockUndo = { id: 'test', message: 'Miner removed', onUndo: jest.fn(), onConfirm: jest.fn() };
  await render(<UndoToast />);
  expect(screen.getByLabelText('common.undo')).toBeTruthy();
});
