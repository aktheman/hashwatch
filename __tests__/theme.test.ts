import { setTheme, getTheme, darkTheme, lightTheme } from '../src/theme';

beforeEach(() => {
  setTheme(darkTheme);
});

it('starts with dark theme', () => {
  const t = getTheme();
  expect(t.bg).toBe(darkTheme.bg);
});

it('switches to light theme', () => {
  setTheme(lightTheme);
  const t = getTheme();
  expect(t.bg).toBe(lightTheme.bg);
  expect(t.text).toBe(lightTheme.text);
});

it('switches back to dark theme', () => {
  setTheme(lightTheme);
  setTheme(darkTheme);
  expect(getTheme().bg).toBe(darkTheme.bg);
});
