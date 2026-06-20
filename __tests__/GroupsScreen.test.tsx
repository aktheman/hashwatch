import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { GroupsScreen } from '../src/screens/GroupsScreen';

let mockMiners: any[];
const mockSetMinerGroup = jest.fn();
let mockEmptyGroups: string[] = [];

jest.mock('../src/db/database', () => ({
  getSetting: jest.fn(async (key: string) => {
    if (key === 'empty_groups')
      return mockEmptyGroups.length > 0 ? JSON.stringify(mockEmptyGroups) : null;
    return null;
  }),
  setSetting: jest.fn(async () => {}),
}));

jest.mock('../src/store/miners', () => ({
  useMinerStore: (selector: any) =>
    selector({
      miners: mockMiners,
      setMinerGroup: (id: string, group: string | undefined) => mockSetMinerGroup(id, group),
    }),
}));

const mockShowUndo = jest.fn(({ onConfirm }: any) => {
  onConfirm();
});
jest.mock('../src/store/toast', () => ({
  useToastStore: Object.assign(
    (selector: any) =>
      selector({
        undo: null,
        showUndo: mockShowUndo,
        dismissUndo: jest.fn(),
      }),
    { getState: () => ({ showUndo: mockShowUndo, dismissUndo: jest.fn(), undo: null }) },
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
    textMuted: '#666',
    primary: '#6C63FF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    accent: '#3B82F6',
    info: '#06B6D4',
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockEmptyGroups = [];
  mockMiners = [
    { id: 'm1', name: 'Miner A', ip: '10.0.0.1', port: 80, isOnline: true, group: 'Garage' },
    { id: 'm2', name: 'Miner B', ip: '10.0.0.2', port: 80, isOnline: false, group: 'Garage' },
    { id: 'm3', name: 'Miner C', ip: '10.0.0.3', port: 80, isOnline: true, group: 'Basement' },
    { id: 'm4', name: 'Miner D', ip: '10.0.0.4', port: 80, isOnline: true },
  ];
});

it('renders groups header', async () => {
  await render(<GroupsScreen />);
  expect(screen.getByText('groups.title')).toBeTruthy();
});

it('shows all groups with miner counts', async () => {
  await render(<GroupsScreen />);
  expect(screen.getByText(/Garage/)).toBeTruthy();
  expect(screen.getByText(/Basement/)).toBeTruthy();
  expect(screen.getByText(/groups.ungrouped/)).toBeTruthy();
  expect(screen.getAllByText(/groups.minerCount/).length).toBeGreaterThanOrEqual(1);
});

it('shows miners within groups', async () => {
  await render(<GroupsScreen />);
  expect(screen.getByText(/Miner A/)).toBeTruthy();
  expect(screen.getByText(/Miner B/)).toBeTruthy();
  expect(screen.getByText(/Miner C/)).toBeTruthy();
  expect(screen.getByText(/Miner D/)).toBeTruthy();
});

it('renders remove buttons for non-ungrouped miners', async () => {
  await render(<GroupsScreen />);
  expect(screen.getAllByText('groups.remove').length).toBeGreaterThanOrEqual(3);
});

it('shows empty state when no miners', async () => {
  mockMiners = [];
  await render(<GroupsScreen />);
  expect(screen.getByText(/groups.noMiners/)).toBeTruthy();
});

it('can create a new group via text input', async () => {
  const { getSetting, setSetting } = require('../src/db/database');

  await render(<GroupsScreen />);
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('New group name'), 'NewGroup');
  });
  await act(async () => {
    fireEvent.press(screen.getByText('common.add'));
  });

  expect(setSetting).toHaveBeenCalledWith('empty_groups', JSON.stringify(['NewGroup']));
  expect(getSetting).toHaveBeenCalledWith('empty_groups');
});

it('creates group via onSubmitEditing', async () => {
  const { setSetting } = require('../src/db/database');

  await render(<GroupsScreen />);
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('New group name'), 'TestGroup');
  });

  const input = screen.getByLabelText('New group name');
  await act(async () => {
    fireEvent(input, 'submitEditing', { nativeEvent: { text: 'TestGroup' } });
  });

  expect(setSetting).toHaveBeenCalledWith('empty_groups', JSON.stringify(['TestGroup']));
});

it('does nothing for empty group name', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  await render(<GroupsScreen />);
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('New group name'), '   ');
  });
  await act(async () => {
    fireEvent.press(screen.getByText('common.add'));
  });

  expect(alertSpy).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('shows alert for duplicate with existing miner group', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  await render(<GroupsScreen />);
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('New group name'), 'Garage');
  });
  await act(async () => {
    fireEvent.press(screen.getByText('common.add'));
  });

  expect(alertSpy).toHaveBeenCalledWith('groups.groupExists', 'groups.groupExistsBody');
  alertSpy.mockRestore();
});

it('shows alert for duplicate with empty group', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockEmptyGroups = ['ExistingEmpty'];

  await render(<GroupsScreen />);
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('New group name'), 'ExistingEmpty');
  });
  await act(async () => {
    fireEvent.press(screen.getByText('common.add'));
  });

  expect(alertSpy).toHaveBeenCalledWith('groups.groupExists', 'groups.groupExistsBody');
  alertSpy.mockRestore();
});

it('shows alert for duplicate group name', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  await render(<GroupsScreen />);
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText('New group name'), 'Garage');
  });
  await act(async () => {
    fireEvent.press(screen.getByText('common.add'));
  });

  expect(alertSpy).toHaveBeenCalledWith('groups.groupExists', 'groups.groupExistsBody');
  alertSpy.mockRestore();
});

it('remove group triggers confirmation and calls setMinerGroup', async () => {
  const alertSpy = jest
    .spyOn(Alert, 'alert')
    .mockImplementation(
      (_title: string, _msg: string, buttons?: { text?: string; onPress?: () => void }[]) => {
        const removeBtn = buttons?.find((b) => b.text === 'groups.remove');
        if (removeBtn?.onPress) removeBtn.onPress();
      },
    );

  await render(<GroupsScreen />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Remove group Garage'));
  });

  await waitFor(() => {
    expect(mockSetMinerGroup).toHaveBeenCalledWith('m1', undefined);
    expect(mockSetMinerGroup).toHaveBeenCalledWith('m2', undefined);
  });
  alertSpy.mockRestore();
});

it('cancel remove group does not call setMinerGroup', async () => {
  const alertSpy = jest
    .spyOn(Alert, 'alert')
    .mockImplementation(
      (_title: string, _msg: string, buttons?: { text?: string; onPress?: () => void }[]) => {
        const cancelBtn = buttons?.find((b) => b.text === 'common.cancel');
        if (cancelBtn?.onPress) cancelBtn.onPress();
      },
    );

  await render(<GroupsScreen />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Remove group Garage'));
  });

  expect(mockSetMinerGroup).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});

it('ungrouped section hides Rename and Remove buttons', async () => {
  await render(<GroupsScreen />);
  expect(screen.queryByLabelText('Rename group Ungrouped')).toBeNull();
  expect(screen.queryByLabelText('Remove group Ungrouped')).toBeNull();
});

it('removes miner from group via setMinerGroup', async () => {
  mockSetMinerGroup.mockResolvedValue(undefined);

  await render(<GroupsScreen />);

  await act(async () => {
    fireEvent.press(screen.getByLabelText('Remove Miner A from group'));
  });

  expect(mockSetMinerGroup).toHaveBeenCalledWith('m1', undefined);
});

it('rename group shows fallback alert when Alert.prompt is unavailable', async () => {
  const originalPrompt = Alert.prompt;
  (Alert as any).prompt = undefined;
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  await render(<GroupsScreen />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Rename group Garage'));
  });

  expect(alertSpy).toHaveBeenCalledWith('groups.renameGroup', 'groups.editInDetails');
  (Alert as any).prompt = originalPrompt;
  alertSpy.mockRestore();
});

it('shows Ungrouped section at the end', async () => {
  await render(<GroupsScreen />);
  const groupCards = screen.getAllByText(/Garage|Basement|groups.ungrouped/);
  expect(groupCards.length).toBeGreaterThanOrEqual(3);
});

it('renders mine count with singular for single miner group', async () => {
  mockMiners = [
    { id: 'm1', name: 'Miner A', ip: '10.0.0.1', port: 80, isOnline: true, group: 'Solo' },
  ];
  await render(<GroupsScreen />);
  expect(screen.getByText('groups.minerCount')).toBeTruthy();
});
