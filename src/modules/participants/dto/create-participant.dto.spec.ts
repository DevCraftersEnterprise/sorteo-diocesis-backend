import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateParticipantDto } from './create-participant.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateParticipantDto, payload);
  return validate(dto);
}

describe('CreateParticipantDto', () => {
  const validPayload = {
    name: 'Juan Pérez',
    walletNumber: '007',
    phone: '6441234567',
    photoPublicId: 'ine-photos/abc123',
    photoVersion: '1699999999',
  };

  it('no reporta errores con un payload válido', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('funciona sin photoVersion (es opcional)', async () => {
    const payload: Record<string, unknown> = { ...validPayload };
    delete payload.photoVersion;
    const errors = await validateDto(payload);
    expect(errors).toHaveLength(0);
  });

  it('reporta error si falta name', async () => {
    const payload: Record<string, unknown> = { ...validPayload };
    delete payload.name;
    const errors = await validateDto(payload);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('reporta error si falta photoPublicId', async () => {
    const payload: Record<string, unknown> = { ...validPayload };
    delete payload.photoPublicId;
    const errors = await validateDto(payload);
    expect(errors.some((e) => e.property === 'photoPublicId')).toBe(true);
  });

  it('reporta error si walletNumber no tiene formato válido — corrige A2/BUG-003', async () => {
    const errors = await validateDto({ ...validPayload, walletNumber: '7' });
    expect(errors.some((e) => e.property === 'walletNumber')).toBe(true);
  });

  it('reporta error si walletNumber está fuera de rango', async () => {
    const errors = await validateDto({
      ...validPayload,
      walletNumber: '999',
    });
    expect(errors.some((e) => e.property === 'walletNumber')).toBe(true);
  });
});
