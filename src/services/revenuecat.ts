import { Platform } from 'react-native';
import { getExtra } from '../constants';

type CustomerInfo = import('react-native-purchases').CustomerInfo;
type PurchasesOfferings = import('react-native-purchases').PurchasesOfferings;

const API_KEYS = {
  ios: getExtra().revenuecatIosKey,
  android: getExtra().revenuecatAndroidKey,
};

export async function configureRevenueCat(): Promise<void> {
  const { default: Purchases, LOG_LEVEL } = await import('react-native-purchases');

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  } else {
    Purchases.setLogLevel(LOG_LEVEL.INFO);
  }

  if (Platform.OS === 'web') return;

  const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;

  try {
    await Purchases.configure({
      apiKey,
      appUserID: null,
    });
  } catch {}
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch {
    return null;
  }
}

export async function purchasePro(): Promise<{
  customerInfo: CustomerInfo;
  productIdentifier: string;
} | null> {
  try {
    const offerings = await getOfferings();
    const pkg = offerings?.current?.availablePackages?.[0];
    if (!pkg) return null;

    const { default: Purchases } = await import('react-native-purchases');
    const result = await Purchases.purchasePackage(pkg);
    return { customerInfo: result.customerInfo, productIdentifier: result.productIdentifier };
  } catch (e: unknown) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return null;
    throw e;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch {
    return null;
  }
}

export function isPro(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  const pro = customerInfo.entitlements.active['pro'];
  return pro !== undefined;
}

export async function checkProStatus(): Promise<boolean> {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const customerInfo = await Purchases.getCustomerInfo();
    return isPro(customerInfo);
  } catch {
    return false;
  }
}

export async function listenForProChanges(callback: (isPro: boolean) => void): Promise<() => void> {
  const { default: Purchases } = await import('react-native-purchases');
  const listener = (customerInfo: CustomerInfo) => {
    callback(isPro(customerInfo));
  };
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
