const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const Purchases = {
  configure: async () => undefined,
  setLogLevel: () => undefined,
  getOfferings: async () => null,
  getCustomerInfo: async () => null,
  purchasePackage: async () => ({ customerInfo: null, productIdentifier: '' }),
  restorePurchases: async () => null,
  addCustomerInfoUpdateListener: () => undefined,
  removeCustomerInfoUpdateListener: () => undefined,
  setAttributes: async () => undefined,
  LOG_LEVEL,
};

export { LOG_LEVEL };
export default Purchases;
