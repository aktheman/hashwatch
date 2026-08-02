import { apiClient } from '../src/api/client';
import { darkTheme } from '../src/theme';
import { useCustomThemesStore, customThemeToTheme, CustomTheme } from '../src/store/customThemes';

jest.mock('../src/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = apiClient as jest.Mocked<typeof apiClient>;

function makeTheme(id: number, overrides: Partial<CustomTheme> = {}): CustomTheme {
  return {
    id,
    name: `Theme ${id}`,
    colors: { primary: '#000000' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useCustomThemesStore.setState({ themes: [], loading: false });
});

describe('initial state', () => {
  it('starts with empty themes and loading false', () => {
    expect(useCustomThemesStore.getState().themes).toEqual([]);
    expect(useCustomThemesStore.getState().loading).toBe(false);
  });
});

describe('load', () => {
  it('sets themes from the API and clears loading', async () => {
    const t1 = makeTheme(1);
    const t2 = makeTheme(2);
    mockApi.get.mockResolvedValue({ data: [t1, t2] });

    await useCustomThemesStore.getState().load();

    expect(mockApi.get).toHaveBeenCalledWith('/custom-themes');
    expect(useCustomThemesStore.getState().themes).toEqual([t1, t2]);
    expect(useCustomThemesStore.getState().loading).toBe(false);
  });

  it('toggles loading while the request is in flight', async () => {
    let resolveGet: (value: { data: CustomTheme[] }) => void;
    mockApi.get.mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve;
      }),
    );

    const promise = useCustomThemesStore.getState().load();
    expect(useCustomThemesStore.getState().loading).toBe(true);

    resolveGet!({ data: [] });
    await promise;
    expect(useCustomThemesStore.getState().loading).toBe(false);
  });

  it('keeps existing themes and clears loading when the request fails', async () => {
    useCustomThemesStore.setState({ themes: [makeTheme(1)] });
    mockApi.get.mockRejectedValue(new Error('Network Error'));

    await useCustomThemesStore.getState().load();

    expect(useCustomThemesStore.getState().themes).toEqual([makeTheme(1)]);
    expect(useCustomThemesStore.getState().loading).toBe(false);
  });
});

describe('create', () => {
  it('prepends the new theme and returns it', async () => {
    const existing = makeTheme(1);
    useCustomThemesStore.setState({ themes: [existing] });
    const created = makeTheme(2, { name: 'Neon Copy' });
    mockApi.post.mockResolvedValue({ data: created });

    const result = await useCustomThemesStore.getState().create('Neon Copy', {
      primary: '#ff00ff',
    });

    expect(mockApi.post).toHaveBeenCalledWith('/custom-themes', {
      name: 'Neon Copy',
      colors: { primary: '#ff00ff' },
    });
    expect(result).toEqual(created);
    expect(useCustomThemesStore.getState().themes[0]).toEqual(created);
    expect(useCustomThemesStore.getState().themes).toHaveLength(2);
  });

  it('returns null and keeps state when the request fails', async () => {
    mockApi.post.mockRejectedValue(new Error('Network Error'));

    const result = await useCustomThemesStore.getState().create('Fail', {});

    expect(result).toBeNull();
    expect(useCustomThemesStore.getState().themes).toEqual([]);
  });
});

describe('update', () => {
  it('replaces the matching theme with the API response', async () => {
    useCustomThemesStore.setState({ themes: [makeTheme(1), makeTheme(2)] });
    const updated = makeTheme(1, { name: 'Renamed' });
    mockApi.put.mockResolvedValue({ data: updated });

    await useCustomThemesStore.getState().update(1, { name: 'Renamed' });

    expect(mockApi.put).toHaveBeenCalledWith('/custom-themes/1', { name: 'Renamed' });
    expect(useCustomThemesStore.getState().themes).toEqual([updated, makeTheme(2)]);
  });

  it('does not throw when the request fails', async () => {
    const existing = makeTheme(1);
    useCustomThemesStore.setState({ themes: [existing] });
    mockApi.put.mockRejectedValue(new Error('Network Error'));

    await expect(useCustomThemesStore.getState().update(1, { name: 'x' })).resolves.toBeUndefined();
    expect(useCustomThemesStore.getState().themes).toEqual([existing]);
  });

  it('leaves state unchanged when the id does not exist', async () => {
    useCustomThemesStore.setState({ themes: [makeTheme(1)] });
    mockApi.put.mockResolvedValue({ data: makeTheme(99) });

    await useCustomThemesStore.getState().update(99, { name: 'nope' });

    expect(useCustomThemesStore.getState().themes).toEqual([makeTheme(1)]);
  });
});

describe('remove', () => {
  it('deletes the theme from the API and filters it out', async () => {
    useCustomThemesStore.setState({ themes: [makeTheme(1), makeTheme(2)] });
    mockApi.delete.mockResolvedValue({ data: {} });

    await useCustomThemesStore.getState().remove(1);

    expect(mockApi.delete).toHaveBeenCalledWith('/custom-themes/1');
    expect(useCustomThemesStore.getState().themes).toEqual([makeTheme(2)]);
  });

  it('does not throw when the request fails', async () => {
    useCustomThemesStore.setState({ themes: [makeTheme(1)] });
    mockApi.delete.mockRejectedValue(new Error('Network Error'));

    await expect(useCustomThemesStore.getState().remove(1)).resolves.toBeUndefined();
    expect(useCustomThemesStore.getState().themes).toEqual([makeTheme(1)]);
  });
});

describe('customThemeToTheme', () => {
  it('builds a full theme from partial colors', () => {
    const theme = customThemeToTheme({
      id: 1,
      name: 'Partial',
      colors: { primary: '#123456', bg: '#222222' },
      createdAt: '',
      updatedAt: '',
    });

    expect(theme.primary).toBe('#123456');
    expect(theme.bg).toBe('#222222');
  });

  it('fills missing colors with the dark theme defaults', () => {
    const theme = customThemeToTheme({
      id: 1,
      name: 'Empty',
      colors: {},
      createdAt: '',
      updatedAt: '',
    });

    expect(theme.bg).toBe(darkTheme.bg);
    expect(theme.surface).toBe(darkTheme.surface);
    expect(theme.accent).toBe(darkTheme.accent);
  });
});
