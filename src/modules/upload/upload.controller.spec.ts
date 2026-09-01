import {
  CloudinaryService,
  UploadSignature,
} from '../../integrations/cloudinary/cloudinary.service';
import { UploadController } from './upload.controller';

describe('UploadController', () => {
  it('devuelve la firma que arma CloudinaryService', async () => {
    const signature: UploadSignature = {
      cloudName: 'demo',
      apiKey: 'key',
      timestamp: 123,
      signature: 'sig',
      folder: 'diocesis-sorteo/dev',
      type: 'authenticated',
    };
    const buildUploadSignatureMock = jest.fn().mockResolvedValue(signature);
    const cloudinaryService = {
      buildUploadSignature: buildUploadSignatureMock,
    } as unknown as CloudinaryService;

    const controller = new UploadController(cloudinaryService);
    const result = await controller.signUpload();

    expect(buildUploadSignatureMock).toHaveBeenCalled();
    expect(result).toBe(signature);
  });
});
