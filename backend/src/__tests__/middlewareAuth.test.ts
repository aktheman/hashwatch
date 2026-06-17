describe('auth middleware - JWT_SECRET missing', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('throws when JWT_SECRET is not set', () => {
    expect(() => require('../middleware/auth')).toThrow(
      'JWT_SECRET environment variable is required',
    );
  });
});
