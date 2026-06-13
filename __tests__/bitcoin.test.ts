import { isValidBitcoinAddress } from '../src/utils/bitcoin';

it.each([
  ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', true],
  ['3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', true],
  ['bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', true],
  ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb', false],
  ['not-an-address', false],
  ['', false],
])('validates address %s => %s', (addr, expected) => {
  expect(isValidBitcoinAddress(addr)).toBe(expected);
});
