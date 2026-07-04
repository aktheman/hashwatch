import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { setSetting } from '../db/database';
import { useTheme } from '../theme';
import { spacing, radius, fontSize, fontWeight, buttonText } from '../utils/design';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const slides = [
    { icon: '⬡', title: t('onboarding.slide1Title'), subtitle: t('onboarding.slide1Body') },
    { icon: '📡', title: t('onboarding.slide2Title'), subtitle: t('onboarding.slide2Body') },
    { icon: '🔔', title: t('onboarding.slide3Title'), subtitle: t('onboarding.slide3Body') },
    { icon: '⭐', title: t('onboarding.slide4Title'), subtitle: t('onboarding.slide4Body') },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await setSetting('onboarding_complete', 'true');
      onComplete();
    }
  };

  const handleSkip = async () => {
    await setSetting('onboarding_complete', 'true');
    onComplete();
  };

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
  });

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const isLast = currentIndex === slides.length - 1;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.bg,
        },
        skipBtn: {
          position: 'absolute',
          top: 60,
          right: spacing.lg,
          zIndex: 10,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          backgroundColor: theme.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: theme.border,
        },
        skipText: {
          color: theme.textDim,
          fontSize: fontSize.base,
          fontWeight: fontWeight.semibold,
        },
        slide: {
          width,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 40,
        },
        iconWrap: {
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: theme.surface,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 28,
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: `0 0 30px ${theme.glow}`,
        },
        icon: {
          fontSize: 42,
        },
        title: {
          color: theme.text,
          fontSize: fontSize.h1,
          fontWeight: fontWeight.extrabold,
          textAlign: 'center',
          marginBottom: spacing.sm,
          letterSpacing: -0.3,
        },
        subtitle: {
          color: theme.textDim,
          fontSize: fontSize.md,
          textAlign: 'center',
          lineHeight: 22,
          maxWidth: 300,
        },
        bottom: {
          paddingHorizontal: 40,
          paddingBottom: 50,
          alignItems: 'center',
        },
        dots: {
          flexDirection: 'row',
          gap: 10,
          marginBottom: 36,
        },
        dot: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: theme.primary,
        },
        btn: {
          backgroundColor: theme.primary,
          paddingHorizontal: 48,
          paddingVertical: spacing.md,
          borderRadius: radius.lg,
          width: '100%',
          alignItems: 'center',
          boxShadow: `0 4px 20px ${theme.glow}`,
        },
        btnText: {
          color: buttonText,
          fontSize: fontSize.xl,
          fontWeight: fontWeight.bold,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </Pressable>

      <FlatList
        testID="onboarding-flatlist"
        ref={flatListRef}
        data={slides}
        keyExtractor={(_, i) => i.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, { opacity: i === currentIndex ? 1 : 0.25 }]} />
          ))}
        </View>

        <Pressable accessibilityRole="button" style={styles.btn} onPress={handleNext}>
          <Text style={styles.btnText}>
            {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
