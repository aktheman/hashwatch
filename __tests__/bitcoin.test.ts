import { isValidBitcoinAddress } from '../src/utils/bitcoin';

it.each([
  ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', true],
  ['3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', true],
  ['bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', true],
  ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb', false],
  ['not-an-address', false],
  ['', false],
  ['tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', true],
  ['TB1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KXPJZSX', true],
  ['Tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', false],
  ['tb1qbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', false],
  ['tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsy', false],
  ['mucFNhKMYoBQYUAEsrFVscQ1YaFQPekBpg', true],
  ['n1fY4Gx8KLcFqK6S5xzGXzH8j6GVbMQjPs', false],
])('validates address %s => %s', (addr, expected) => {
  expect(isValidBitcoinAddress(addr)).toBe(expected);
});
