import React, { lazy, Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import type { LineChart as LineChartType } from 'react-native-chart-kit';

const LazyLineChartInner = lazy(() =>
  import('react-native-chart-kit').then((m) => ({ default: m.LineChart })),
);

type LineChartProps = React.ComponentProps<typeof LineChartType>;

export function LazyLineChart(props: LineChartProps) {
  return (
    <Suspense
      fallback={
        <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="small" />
        </View>
      }
    >
      <LazyLineChartInner {...props} />
    </Suspense>
  );
}
