import { CreateParticipantDto } from './dto/create-participant.dto';
import {
  CreatedParticipant,
  ParticipantMasked,
} from './participants.repository';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';

describe('ParticipantsController', () => {
  it('delega en ParticipantsService.create con el DTO recibido', async () => {
    const created: CreatedParticipant = { id: 'uuid-1', createdAt: new Date() };
    const createMock = jest.fn().mockResolvedValue(created);
    const service = { create: createMock } as unknown as ParticipantsService;

    const controller = new ParticipantsController(service);
    const dto: CreateParticipantDto = {
      name: 'Juan Pérez',
      walletNumber: '007',
      phone: '6441234567',
      photoPublicId: 'ine-photos/abc',
    };

    const result = await controller.create(dto);

    expect(createMock).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('delega en ParticipantsService.findAllMasked', async () => {
    const masked: ParticipantMasked[] = [
      {
        id: 'uuid-1',
        name: 'Juan',
        walletNumber: '007',
        photoPublicId: 'x',
        photoVersion: null,
        phoneMasked: '***_***_4567',
        createdAt: new Date(),
      },
    ];
    const findAllMaskedMock = jest.fn().mockResolvedValue(masked);
    const service = {
      findAllMasked: findAllMaskedMock,
    } as unknown as ParticipantsService;

    const controller = new ParticipantsController(service);
    const result = await controller.findAllMasked();

    expect(findAllMaskedMock).toHaveBeenCalled();
    expect(result).toBe(masked);
  });
});
