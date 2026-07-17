import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MarkdownText } from '../src/utils/markdown';

describe('MarkdownText', () => {
  it('renders plain text', async () => {
    await render(<MarkdownText>Hello world</MarkdownText>);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('renders bold text', async () => {
    await render(<MarkdownText>**bold**</MarkdownText>);
    const el = screen.getByText('bold');
    expect(el.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontWeight: 'bold' })]),
    );
  });

  it('renders italic text', async () => {
    await render(<MarkdownText>_italic_</MarkdownText>);
    const el = screen.getByText('italic');
    expect(el.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontStyle: 'italic' })]),
    );
  });

  it('renders bold italic text', async () => {
    await render(<MarkdownText>***bold italic***</MarkdownText>);
    const el = screen.getByText('bold italic');
    expect(el.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: 'bold', fontStyle: 'italic' }),
      ]),
    );
  });

  it('renders inline code', async () => {
    await render(<MarkdownText>`code`</MarkdownText>);
    const el = screen.getByText('code');
    expect(el.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontFamily: 'monospace' })]),
    );
  });

  it('renders links', async () => {
    await render(<MarkdownText>[click here](https://example.com)</MarkdownText>);
    const el = screen.getByText('click here');
    expect(el.props.onPress).toBeDefined();
    expect(el.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ textDecorationLine: 'underline' })]),
    );
  });

  it('renders multiline text', async () => {
    await render(<MarkdownText>{'line1\nline2'}</MarkdownText>);
    expect(screen.getByText('line1')).toBeTruthy();
    expect(screen.getByText('line2')).toBeTruthy();
  });

  it('renders mixed formatting', async () => {
    await render(<MarkdownText>{'hello **world** _foo_ `bar`'}</MarkdownText>);
    expect(screen.getByText('hello ')).toBeTruthy();
    expect(screen.getByText('world')).toBeTruthy();
    expect(screen.getByText('foo')).toBeTruthy();
    expect(screen.getByText('bar')).toBeTruthy();
  });

  it('applies custom base style', async () => {
    const baseStyle = { fontSize: 14, color: '#fff' };
    await render(<MarkdownText style={baseStyle}>plain text</MarkdownText>);
    const el = screen.getByText('plain text');
    expect(el.props.style).toEqual(expect.objectContaining(baseStyle));
  });

  it('renders empty string without errors', async () => {
    const r = await render(<MarkdownText>{''}</MarkdownText>);
    expect(r.toJSON()).toBeTruthy();
  });

  it('renders text with no markdown syntax as plain', async () => {
    await render(<MarkdownText>no special chars here</MarkdownText>);
    expect(screen.getByText('no special chars here')).toBeTruthy();
  });

  it('handles adjacent formatting tokens', async () => {
    await render(<MarkdownText>{'**bold**_italic_'}</MarkdownText>);
    expect(screen.getByText('bold')).toBeTruthy();
    expect(screen.getByText('italic')).toBeTruthy();
  });

  it('handles unclosed formatting gracefully', async () => {
    await render(<MarkdownText>{'**unclosed'}</MarkdownText>);
    expect(screen.getByText('**unclosed')).toBeTruthy();
  });
});
