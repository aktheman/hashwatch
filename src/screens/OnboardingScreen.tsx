import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, FlatList,
} from 'react-native';
import { setSetting } from '../db/database';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: '⬡',
    title: 'Monitor Your BitAxe',
    subtitle: 'Track hashrate, temperature, and pool stats for all your miners in real-time.',
  },
  {
    icon: '📡',
    title: 'Auto-Discovery',
    subtitle: 'Scan your local network to find miners automatically, or add them manually by IP.',
  },
  {
    icon: '🔔',
    title: 'Instant Alerts',
    subtitle: 'Get notified when a miner goes offline or runs too hot — never miss an issue.',
  },
  {
    icon: '⭐',
    title: 'Ready to Mine',
    subtitle: 'Free for up to 3 miners. Upgrade to Pro for unlimited monitoring.',
  },
];

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
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

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const isLast = currentIndex === slides.length - 1;

  const dotOpacity = scrollX.interpolate({
    inputRange: slides.map((_, i) => i * width),
    outputRange: slides.map((_, i) => (i === currentIndex ? 1 : 0.3)),
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
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
            <View
              key={i}
              style={[
                styles.dot,
                { opacity: i === currentIndex ? 1 : 0.25 },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext}>
          <Text style={styles.btnText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  skipText: {
    color: theme.textDim,
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: theme.textDim,
    fontSize: 15,
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
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    boxShadow: `0 4px 20px ${theme.glow}`,
  },
  btnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
