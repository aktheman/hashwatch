import React, { useMemo } from 'react';
import { Text, TextStyle, Linking } from 'react-native';

function parseMarkdown(text: string, baseStyle: TextStyle): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|_(.+?)_|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let key = 0;

  text.split('\n').forEach((line, lineIdx) => {
    if (lineIdx > 0) parts.push(<Text key={`nl-${key++}`}>{'\n'}</Text>);
    let match: RegExpExecArray | null;
    let lineLast = 0;
    const localRegex = new RegExp(regex.source, 'g');
    while ((match = localRegex.exec(line)) !== null) {
      if (match.index > lineLast) {
        parts.push(
          <Text key={`t-${key++}`} style={baseStyle}>
            {line.slice(lineLast, match.index)}
          </Text>,
        );
      }
      if (match[2]) {
        parts.push(
          <Text key={`b-${key++}`} style={[baseStyle, { fontWeight: 'bold', fontStyle: 'italic' }]}>
            {match[2]}
          </Text>,
        );
      } else if (match[3]) {
        parts.push(
          <Text key={`b-${key++}`} style={[baseStyle, { fontWeight: 'bold' }]}>
            {match[3]}
          </Text>,
        );
      } else if (match[4]) {
        parts.push(
          <Text key={`i-${key++}`} style={[baseStyle, { fontStyle: 'italic' }]}>
            {match[4]}
          </Text>,
        );
      } else if (match[5]) {
        parts.push(
          <Text key={`c-${key++}`} style={[baseStyle, { fontFamily: 'monospace', backgroundColor: '#333', paddingHorizontal: 4, borderRadius: 4 }]}>
            {match[5]}
          </Text>,
        );
      } else if (match[6] && match[7]) {
        parts.push(
          <Text
            key={`l-${key++}`}
            style={[baseStyle, { color: '#6C63FF', textDecorationLine: 'underline' }]}
            onPress={() => Linking.openURL(match![7])}
          >
            {match[6]}
          </Text>,
        );
      }
      lineLast = localRegex.lastIndex;
    }
    if (lineLast < line.length) {
      parts.push(
        <Text key={`t-${key++}`} style={baseStyle}>
          {line.slice(lineLast)}
        </Text>,
      );
    }
  });

  return parts;
}

interface MarkdownTextProps {
  children: string;
  style?: TextStyle;
}

export function MarkdownText({ children, style }: MarkdownTextProps) {
  const nodes = useMemo(() => parseMarkdown(children, style || {}), [children, style]);
  return <Text>{nodes}</Text>;
}
