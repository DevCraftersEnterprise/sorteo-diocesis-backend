import { BadRequestException } from '@nestjs/common';
import { ParticipantsRepository } from '../participants/participants.repository';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  it('lanza BadRequestException si no se manda wallet', async () => {
    const walletExistsMock = jest.fn();
    const repository = {
      walletExists: walletExistsMock,
    } as unknown as ParticipantsRepository;
    const service = new WalletService(repository);

    await expect(service.checkAvailability(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(walletExistsMock).not.toHaveBeenCalled();
  });

  it('lanza ConflictException con el código de negocio si la cartera ya existe', async () => {
    const walletExistsMock = jest.fn().mockResolvedValue(true);
    const repository = {
      walletExists: walletExistsMock,
    } as unknown as ParticipantsRepository;
    const service = new WalletService(repository);

    await expect(service.checkAvailability('007')).rejects.toMatchObject({
      response: { error: 'wallet_already_taken' },
    });
  });

  it('devuelve ok:true con la cartera si está disponible', async () => {
    const walletExistsMock = jest.fn().mockResolvedValue(false);
    const repository = {
      walletExists: walletExistsMock,
    } as unknown as ParticipantsRepository;
    const service = new WalletService(repository);

    const result = await service.checkAvailability('007');

    expect(result).toEqual({ ok: true, wallet: '007' });
  });
});
