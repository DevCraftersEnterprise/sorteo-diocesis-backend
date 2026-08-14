import { WalletAvailability, WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

describe('WalletController', () => {
  it('delega en WalletService.checkAvailability con el query param', async () => {
    const availability: WalletAvailability = { ok: true, wallet: '007' };
    const checkAvailabilityMock = jest.fn().mockResolvedValue(availability);
    const service = {
      checkAvailability: checkAvailabilityMock,
    } as unknown as WalletService;

    const controller = new WalletController(service);
    const result = await controller.validate({ wallet: '007' });

    expect(checkAvailabilityMock).toHaveBeenCalledWith('007');
    expect(result).toBe(availability);
  });
});
