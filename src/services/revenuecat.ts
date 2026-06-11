import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { getExtra } from '../constants';

const API_KEYS = {
  ios: getExtra().revenuecatIosKey,
  android: getExtra().revenuecatAndroidKey,
};

const PRO_MONTHLY_ID = 'hashwatch_pro_monthly';

export async function configureRevenueCat(): Promise<void> {
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
  } catch {
    // RevenueCat not available on this platform
  }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch {
    return null;
  }
}

export async function purchasePro(): Promise<CustomerInfo | null> {
  try {
    const offerings = await getOfferings();
    const pkg = offerings?.current?.availablePackages?.[0];
    if (!pkg) return null;

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e: any) {
    if (e.userCancelled) return null;
    throw e;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
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
    const customerInfo = await Purchases.getCustomerInfo();
    return isPro(customerInfo);
  } catch {
    return false;
  }
}

export function listenForProChanges(callback: (isPro: boolean) => void): () => void {
  const listener = (customerInfo: CustomerInfo) => {
    callback(isPro(customerInfo));
  };
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {};
}
