import { isValidBitcoinAddress } from '../src/utils/bitcoin';

describe('isValidBitcoinAddress edge cases', () => {
  it('rejects non-string-like input patterns', () => {
    expect(isValidBitcoinAddress('bc1')).toBe(false);
    expect(isValidBitcoinAddress('tb1')).toBe(false);
    expect(isValidBitcoinAddress('1')).toBe(false);
    expect(isValidBitcoinAddress('3')).toBe(false);
    expect(isValidBitcoinAddress('m')).toBe(false);
    expect(isValidBitcoinAddress('n')).toBe(false);
  });

  it('rejects addresses with invalid bech32 characters', () => {
    expect(isValidBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdo')).toBe(false);
    expect(isValidBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(true);
  });

  it('rejects base58 characters not in alphabet (0, O, I, l)', () => {
    expect(isValidBitcoinAddress('0A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(false);
    expect(isValidBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNOy')).toBe(false);
    expect(isValidBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNIy')).toBe(false);
  });

  it('rejects addresses too long for base58 (35+ chars after prefix)', () => {
    expect(isValidBitcoinAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNaXXXXXXXXX')).toBe(false);
  });

  it('accepts valid P2PKH mainnet addresses', () => {
    expect(isValidBitcoinAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(true);
  });

  it('accepts valid P2SH mainnet addresses', () => {
    expect(isValidBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true);
  });

  it('accepts valid testnet bech32 with uppercase (all caps)', () => {
    expect(isValidBitcoinAddress('TB1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KXPJZSX')).toBe(true);
  });

  it('rejects mixed-case bech32 (only all-lower or all-upper valid)', () => {
    expect(isValidBitcoinAddress('Tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx')).toBe(false);
    expect(isValidBitcoinAddress('tb1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KXPJZSX')).toBe(false);
  });

  it('rejects bech32 with separator but no data after it', () => {
    expect(isValidBitcoinAddress('bc1')).toBe(false);
    expect(isValidBitcoinAddress('tb1')).toBe(false);
  });

  it('rejects strings with spaces in the middle', () => {
    expect(isValidBitcoinAddress('1A1zP 1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe(false);
  });

  it('trims leading and trailing whitespace', () => {
    expect(isValidBitcoinAddress('  1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa  ')).toBe(true);
    expect(isValidBitcoinAddress('\t3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy\n')).toBe(true);
  });

  it('rejects bech32 with invalid checksum (last char altered)', () => {
    expect(isValidBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(true);
    expect(isValidBitcoinAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdp')).toBe(false);
  });

  it('rejects testnet legacy with bad checksum', () => {
    expect(isValidBitcoinAddress('mzB5cR7sN8QkL9pA2xR4tY6uW1vZ3x5')).toBe(false);
  });

  it('rejects all-zeros hex-like strings', () => {
    expect(isValidBitcoinAddress('0000000000000000000000000000000000')).toBe(false);
  });

  it('rejects addresses with only leading 1s (base58 leading zeros)', () => {
    expect(isValidBitcoinAddress('1111111111111111111111111111111111')).toBe(false);
    expect(isValidBitcoinAddress('111111')).toBe(false);
  });
});
