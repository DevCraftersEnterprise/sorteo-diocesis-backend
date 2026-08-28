import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MarkPaidDto } from './dto/mark-paid.dto';

describe('AdminController', () => {
  it('usa el email del token verificado, ignorando adminEmail suplantado en el body (BUG-002)', async () => {
    const markAsPaidMock = jest.fn().mockResolvedValue(undefined);
    const service = { markAsPaid: markAsPaidMock } as unknown as AdminService;
    const controller = new AdminController(service);
    const dto: MarkPaidDto = {
      walletNumber: '007',
      adminEmail: 'suplantado@evil.com',
    };

    const result = await controller.markAsPaid(dto, 'admin-real@example.com');

    expect(markAsPaidMock).toHaveBeenCalledWith(
      '007',
      'admin-real@example.com',
    );
    expect(result).toEqual({ ok: true });
  });
});
