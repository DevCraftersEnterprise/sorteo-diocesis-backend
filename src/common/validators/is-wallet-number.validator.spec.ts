import { isValidWalletNumber } from './is-wallet-number.validator';

describe('isValidWalletNumber', () => {
  it.each(['001', '007', '500', '840'])('acepta "%s" como válido', (value) => {
    expect(isValidWalletNumber(value)).toBe(true);
  });

  it.each(['000', '841', '999'])(
    'rechaza "%s" por estar fuera de rango (001-840)',
    (value) => {
      expect(isValidWalletNumber(value)).toBe(false);
    },
  );

  it.each(['1', '12', '0012', 'abc', '', ' 07', '7  '])(
    'rechaza "%s" por no tener exactamente 3 dígitos',
    (value) => {
      expect(isValidWalletNumber(value)).toBe(false);
    },
  );

  it('rechaza valores que no son string', () => {
    expect(isValidWalletNumber(7)).toBe(false);
    expect(isValidWalletNumber(null)).toBe(false);
    expect(isValidWalletNumber(undefined)).toBe(false);
  });
});
