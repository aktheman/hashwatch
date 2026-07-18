import { memo } from 'react';
import { SubscriptionGate } from './SubscriptionGate';

interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
}

export const FeatureGate = memo(function FeatureGate({ children, feature }: FeatureGateProps) {
  return <SubscriptionGate feature={feature}>{children}</SubscriptionGate>;
});
