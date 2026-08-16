import { registerDecorator, ValidationOptions } from 'class-validator';

const WALLET_NUMBER_PATTERN = /^\d{3}$/;
const WALLET_NUMBER_MIN = 1;
const WALLET_NUMBER_MAX = 840;

export function isValidWalletNumber(value: unknown): boolean {
  if (typeof value !== 'string' || !WALLET_NUMBER_PATTERN.test(value)) {
    return false;
  }
  const numeric = Number(value);
  return numeric >= WALLET_NUMBER_MIN && numeric <= WALLET_NUMBER_MAX;
}

export function IsWalletNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isWalletNumber',
      target: object.constructor,
      propertyName,
      options: {
        message:
          'walletNumber debe ser un string de 3 dígitos entre "001" y "840"',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return isValidWalletNumber(value);
        },
      },
    });
  };
}
