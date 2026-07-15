import { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

interface TimeAgoProps {
  timestamp: number | null;
  style?: TextStyle;
}

export function TimeAgo({ timestamp, style }: TimeAgoProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    if (typeof id === 'object' && id !== null && 'unref' in id) {
      (id as { unref: () => void }).unref();
    }
    return () => clearInterval(id);
  }, []);

  if (timestamp === null) return null;

  const seconds = Math.floor((now - timestamp) / 1000);
  return (
    <Text style={style} accessibilityLabel={`${seconds}${t('common.secondsAgo')}`}>
      {seconds}
      {t('common.secondsAgo')}
    </Text>
  );
}
