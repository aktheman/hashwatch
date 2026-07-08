import { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';

interface TimeAgoProps {
  timestamp: number | null;
  style?: TextStyle;
}

export function TimeAgo({ timestamp, style }: TimeAgoProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    if (typeof id === 'object' && id !== null && 'unref' in id) {
      (id as { unref: () => void }).unref();
    }
    return () => clearInterval(id);
  }, []);

  if (timestamp === null) return null;

  return <Text style={style}>{Math.floor((now - timestamp) / 1000)}s ago</Text>;
}
