module.exports = function (api) {
  api.cache.using(() => process.env.JEST_WORKER_ID || 'metro');

  const isJest = process.env.JEST_WORKER_ID !== undefined;
  const plugins = isJest ? ['babel-plugin-dynamic-import-node'] : [];

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
