import { useToastStore } from '../src/store/toast';

beforeEach(async () => {
  useToastStore.setState({ undo: null });
  jest.useFakeTimers({ legacyFakeTimers: true });
});

afterEach(() => {
  jest.useRealTimers();
});

it('starts with no undo action', () => {
  expect(useToastStore.getState().undo).toBeNull();
});

it('showUndo sets the undo action', () => {
  const action = { id: 'test', message: 'Item removed', onUndo: jest.fn(), onConfirm: jest.fn() };
  useToastStore.getState().showUndo(action);
  expect(useToastStore.getState().undo).toEqual(action);
});

it('dismissUndo clears the undo action', () => {
  useToastStore.getState().showUndo({
    id: 'test',
    message: 'Item removed',
    onUndo: jest.fn(),
    onConfirm: jest.fn(),
  });
  useToastStore.getState().dismissUndo();
  expect(useToastStore.getState().undo).toBeNull();
});

it('auto-confirms after 5000ms', () => {
  const onConfirm = jest.fn();
  useToastStore.getState().showUndo({
    id: 'test',
    message: 'Item removed',
    onUndo: jest.fn(),
    onConfirm,
  });
  expect(onConfirm).not.toHaveBeenCalled();
  jest.advanceTimersByTime(5000);
  expect(onConfirm).toHaveBeenCalled();
});

it('clears undo after auto-confirm', async () => {
  const onConfirm = jest.fn();
  useToastStore.getState().showUndo({
    id: 'test',
    message: 'Item removed',
    onUndo: jest.fn(),
    onConfirm,
  });
  jest.runAllTimers();
  await Promise.resolve();
  expect(useToastStore.getState().undo).toBeNull();
});

it('cancels previous timer when new action is shown', () => {
  const onConfirm1 = jest.fn();
  useToastStore.getState().showUndo({
    id: 'test1',
    message: 'First',
    onUndo: jest.fn(),
    onConfirm: onConfirm1,
  });
  jest.advanceTimersByTime(3000);
  useToastStore.getState().showUndo({
    id: 'test2',
    message: 'Second',
    onUndo: jest.fn(),
    onConfirm: jest.fn(),
  });
  jest.advanceTimersByTime(3000);
  expect(onConfirm1).not.toHaveBeenCalled();
});

it('cancels timer on dismissUndo', () => {
  const onConfirm = jest.fn();
  useToastStore.getState().showUndo({
    id: 'test',
    message: 'Item removed',
    onUndo: jest.fn(),
    onConfirm,
  });
  useToastStore.getState().dismissUndo();
  jest.advanceTimersByTime(5000);
  expect(onConfirm).not.toHaveBeenCalled();
});

it('dismissUndo is safe when no undo is active', () => {
  expect(() => useToastStore.getState().dismissUndo()).not.toThrow();
  expect(useToastStore.getState().undo).toBeNull();
});

it('showUndo clears timer from previous same-id action', () => {
  const onConfirm = jest.fn();
  useToastStore.getState().showUndo({
    id: 'dup',
    message: 'First',
    onUndo: jest.fn(),
    onConfirm,
  });
  jest.advanceTimersByTime(2000);
  useToastStore.getState().showUndo({
    id: 'dup',
    message: 'Second',
    onUndo: jest.fn(),
    onConfirm: jest.fn(),
  });
  jest.advanceTimersByTime(5000);
  expect(onConfirm).not.toHaveBeenCalled();
});
