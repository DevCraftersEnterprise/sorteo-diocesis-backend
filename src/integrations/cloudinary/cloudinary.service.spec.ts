import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

function buildConfigService(): ConfigService {
  const values: Record<string, string> = {
    'cloudinary.cloudName': 'demo-cloud',
    'cloudinary.apiKey': 'demo-key',
    'cloudinary.apiSecret': 'demo-secret',
  };
  const getMock = jest.fn((key: string) => values[key]);
  return { get: getMock } as unknown as ConfigService;
}

function buildFakeCloudinary() {
  return {
    utils: {
      api_sign_request: jest.fn().mockReturnValue('fake-signature'),
    },
    url: jest
      .fn()
      .mockReturnValue('https://res.cloudinary.com/demo-cloud/fake-url.jpg'),
    api: {
      delete_resources: jest.fn(),
    },
  } as unknown as typeof cloudinary;
}

describe('CloudinaryService', () => {
  describe('buildUploadSignature', () => {
    it('arma la firma con folder "ine-photos" y type "authenticated"', async () => {
      const fakeCloudinary = buildFakeCloudinary();
      const service = new CloudinaryService(
        fakeCloudinary,
        buildConfigService(),
      );

      const result = await service.buildUploadSignature();
      expect(fakeCloudinary.utils.api_sign_request).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'ine-photos',
          type: 'authenticated',
        }),
        'demo-secret',
      );
      expect(typeof result.timestamp).toBe('number');
      expect(result).toEqual({
        cloudName: 'demo-cloud',
        apiKey: 'demo-key',
        timestamp: result.timestamp,
        signature: 'fake-signature',
        folder: 'ine-photos',
        type: 'authenticated',
      });
    });
  });

  describe('signedPhotoUrl', () => {
    it('pide una URL autenticada y firmada con la transformación de INE', () => {
      const fakeCloudinary = buildFakeCloudinary();
      const service = new CloudinaryService(
        fakeCloudinary,
        buildConfigService(),
      );

      const url = service.signedPhotoUrl('ine-photos/abc123', 180);

      expect(fakeCloudinary.url).toHaveBeenCalledWith(
        'ine-photos/abc123',
        expect.objectContaining({
          resource_type: 'image',
          type: 'authenticated',
          sign_url: true,
          transformation: [
            {
              width: 1080,
              height: 1080,
              crop: 'limit',
              quality: 'auto:good',
              format: 'jpg',
            },
          ],
        }),
      );
      expect(url).toBe('https://res.cloudinary.com/demo-cloud/fake-url.jpg');
    });

    it('usa 100 segundos de expiración por defecto', () => {
      const fakeCloudinary = buildFakeCloudinary();
      const service = new CloudinaryService(
        fakeCloudinary,
        buildConfigService(),
      );
      const before = Math.floor(Date.now() / 1000);

      service.signedPhotoUrl('ine-photos/abc123');

      const calls = (fakeCloudinary.url as jest.Mock).mock.calls as unknown[][];
      const options = calls[0][1] as { expire_at: number };
      expect(options.expire_at).toBeGreaterThanOrEqual(before + 100);
      expect(options.expire_at).toBeLessThanOrEqual(before + 102);
    });
  });

  describe('deletePhotosByPublicIds', () => {
    it('devuelve 0 sin llamar al SDK si la lista viene vacía', async () => {
      const fakeCloudinary = buildFakeCloudinary();
      const service = new CloudinaryService(
        fakeCloudinary,
        buildConfigService(),
      );

      const result = await service.deletePhotosByPublicIds([]);

      expect(result).toBe(0);
      expect(fakeCloudinary.api.delete_resources).not.toHaveBeenCalled();
    });

    it('cuenta solo los recursos con status "deleted", ignorando "not_found"/"error"', async () => {
      const fakeCloudinary = buildFakeCloudinary();
      (fakeCloudinary.api.delete_resources as jest.Mock).mockResolvedValue({
        deleted: { a: 'deleted', b: 'not_found', c: 'deleted', d: 'error' },
      });
      const service = new CloudinaryService(
        fakeCloudinary,
        buildConfigService(),
      );

      const result = await service.deletePhotosByPublicIds([
        'a',
        'b',
        'c',
        'd',
      ]);

      expect(result).toBe(2);
    });

    it('divide en lotes de 100 cuando hay más de 100 public_ids', async () => {
      const fakeCloudinary = buildFakeCloudinary();
      (fakeCloudinary.api.delete_resources as jest.Mock).mockResolvedValue({
        deleted: {},
      });
      const service = new CloudinaryService(
        fakeCloudinary,
        buildConfigService(),
      );
      const publicIds = Array.from({ length: 150 }, (_, i) => `id-${i}`);

      await service.deletePhotosByPublicIds(publicIds);

      expect(fakeCloudinary.api.delete_resources).toHaveBeenCalledTimes(2);
      const calls = (fakeCloudinary.api.delete_resources as jest.Mock).mock
        .calls as unknown[][];
      expect((calls[0][0] as string[]).length).toBe(100);
      expect((calls[1][0] as string[]).length).toBe(50);
    });
  });
});
