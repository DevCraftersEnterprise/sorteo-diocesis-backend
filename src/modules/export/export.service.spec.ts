import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { ExportParticipantRow, ExportService } from './export.service';

type ArchiveEventHandler = (...args: unknown[]) => void;

interface FakeArchive {
  on: jest.Mock;
  pipe: jest.Mock;
  append: jest.Mock;
  finalize: jest.Mock;
}

function buildFakeArchive(errorToEmit?: Error): FakeArchive {
  const listeners = new Map<string, ArchiveEventHandler>();
  const fake: FakeArchive = {
    on: jest.fn((event: string, handler: ArchiveEventHandler) => {
      listeners.set(event, handler);
      return fake;
    }),
    pipe: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn().mockImplementation(() => {
      if (errorToEmit) {
        listeners.get('error')?.(errorToEmit);
      }
      return Promise.resolve();
    }),
  };
  return fake;
}

let fakeArchive: FakeArchive;

jest.mock('archiver', () => ({
  __esModule: true,
  default: jest.fn(() => fakeArchive),
}));

function buildResponse(headersSent = false) {
  const statusMock = jest.fn().mockReturnThis();
  const jsonMock = jest.fn().mockReturnThis();
  const destroyMock = jest.fn();
  const response = {
    headersSent,
    status: statusMock,
    json: jsonMock,
    destroy: destroyMock,
  } as unknown as Response;
  return { response, statusMock, jsonMock, destroyMock };
}

function buildConfigService(): ConfigService {
  const getMock = jest.fn().mockReturnValue('America/Hermosillo');
  return { get: getMock } as unknown as ConfigService;
}

function buildCloudinaryService() {
  const signedPhotoUrlMock = jest
    .fn()
    .mockImplementation(
      (publicId: string) => `https://signed.example/${publicId}`,
    );
  const cloudinaryService = {
    signedPhotoUrl: signedPhotoUrlMock,
  } as unknown as CloudinaryService;
  return { cloudinaryService, signedPhotoUrlMock };
}

function buildRow(
  overrides: Partial<ExportParticipantRow> = {},
): ExportParticipantRow {
  return {
    name: 'Juan Pérez',
    walletNumber: '007',
    phoneFull: '6441234567',
    photoPublicId: 'ine-photos/abc',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    isPaid: false,
    paidAt: null,
    markedByEmail: null,
    ...overrides,
  };
}

function appendCallsOf(fake: FakeArchive) {
  return fake.append.mock.calls as [string | Buffer, { name: string }][];
}

describe('ExportService', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    fakeArchive = buildFakeArchive();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('agrega el excel al archivo con el nombre correcto', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    const { cloudinaryService } = buildCloudinaryService();
    const service = new ExportService(cloudinaryService, buildConfigService());
    const { response } = buildResponse();

    await service.streamZipWithExcelAndPhotos([buildRow()], response);

    const excelCall = appendCallsOf(fakeArchive).find(
      (call) => call[1].name === 'sorteo.xlsx',
    );
    expect(excelCall).toBeDefined();
  });

  it('descarga y agrega las fotos de las filas que tienen photoPublicId', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    const { cloudinaryService, signedPhotoUrlMock } = buildCloudinaryService();
    const service = new ExportService(cloudinaryService, buildConfigService());
    const { response } = buildResponse();

    await service.streamZipWithExcelAndPhotos(
      [buildRow({ walletNumber: '007', name: 'Juan' })],
      response,
    );

    expect(signedPhotoUrlMock).toHaveBeenCalledWith('ine-photos/abc', 180);

    const photoCall = appendCallsOf(fakeArchive).find(
      (call) => call[1].name === 'fotos/007-Juan.jpg',
    );
    expect(photoCall).toBeDefined();
  });

  it('omite las filas sin photoPublicId', async () => {
    const { cloudinaryService, signedPhotoUrlMock } = buildCloudinaryService();
    const service = new ExportService(cloudinaryService, buildConfigService());
    const { response } = buildResponse();

    await service.streamZipWithExcelAndPhotos(
      [buildRow({ photoPublicId: null })],
      response,
    );

    expect(signedPhotoUrlMock).not.toHaveBeenCalled();
  });

  it('omite la foto si Cloudinary responde con error, sin interrumpir el resto', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    const { cloudinaryService } = buildCloudinaryService();
    const service = new ExportService(cloudinaryService, buildConfigService());
    const { response } = buildResponse();

    await service.streamZipWithExcelAndPhotos([buildRow()], response);

    const photoCalls = appendCallsOf(fakeArchive).filter((call) =>
      call[1].name.startsWith('fotos/'),
    );
    expect(photoCalls).toHaveLength(0);
  });

  it('responde 500 controlado si el stream falla antes de enviar headers (corrige BUG-004/C3)', async () => {
    fakeArchive = buildFakeArchive(new Error('stream roto'));
    const { cloudinaryService } = buildCloudinaryService();
    const service = new ExportService(cloudinaryService, buildConfigService());
    const { response, statusMock, jsonMock, destroyMock } =
      buildResponse(false);

    await service.streamZipWithExcelAndPhotos([], response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'export_failed' }),
    );
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it('destruye el stream sin relanzar el error si los headers ya se enviaron (corrige BUG-004/C3)', async () => {
    const error = new Error('stream roto');
    fakeArchive = buildFakeArchive(error);
    const { cloudinaryService } = buildCloudinaryService();
    const service = new ExportService(cloudinaryService, buildConfigService());
    const { response, statusMock, destroyMock } = buildResponse(true);

    await service.streamZipWithExcelAndPhotos([], response);

    expect(destroyMock).toHaveBeenCalledWith(error);
    expect(statusMock).not.toHaveBeenCalled();
  });
});
