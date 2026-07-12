import { View, Text, StyleSheet } from 'react-native';
import { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscriptionStore } from '../store/subscription';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight } from '../utils/design';

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature?: string;
}

export const SubscriptionGate = memo(function SubscriptionGate({ children, feature }: SubscriptionGateProps) {
  const { t } = useTranslation();
  const { isPro } = useSubscriptionStore();
  const theme = useTheme();
  const styles = useMemo(() => {
    const text = {
      color: theme.text,
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      marginTop: spacing.xxs,
    };
    const subtext = { color: theme.textDim, fontSize: fontSize.sm, marginTop: spacing.xxs };
    return StyleSheet.create({
      wrapper: {
        position: 'relative',
        opacity: 0.5,
      },
      overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.bg + 'A0',
        borderRadius: radius.md,
      },
      lockIcon: {
        fontSize: fontSize.lg,
      },
      text,
      subtext,
    });
  }, [theme]);

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View pointerEvents="none">{children}</View>
      <View
        style={styles.overlay}
        pointerEvents="auto"
        accessibilityElementsHidden
        accessible={false}
      >
        <Text style={styles.lockIcon}>🔒</Text>
        {feature && <Text style={styles.text}>{feature}</Text>}
        <Text style={styles.subtext}>{t('subscriptionGate.upgradeToUnlock')}</Text>
      </View>
    </View>
  );
});
