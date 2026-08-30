import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as CloudinaryClient } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.constants';

const FOLDER = 'ine-photos';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  type: 'authenticated';
}

interface DeleteResourcesResponse {
  deleted?: Record<string, string>;
}

export interface DeletePhotosResult {
  deletedCount: number;
  failedPublicIds: string[];
}

@Injectable()
export class CloudinaryService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: typeof CloudinaryClient,
    private readonly configService: ConfigService,
  ) {
    this.cloudName =
      this.configService.get<string>('cloudinary.cloudName') ?? '';
    this.apiKey = this.configService.get<string>('cloudinary.apiKey') ?? '';
    this.apiSecret =
      this.configService.get<string>('cloudinary.apiSecret') ?? '';
  }

  buildUploadSignature(): Promise<UploadSignature> {
    const timestamp = Math.floor(Date.now() / 1000);

    const paramsToSign = {
      folder: FOLDER,
      timestamp,
      type: 'authenticated' as const,
    };

    const signature = this.cloudinary.utils.api_sign_request(
      paramsToSign,
      this.apiSecret,
    );

    return Promise.resolve({
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      timestamp,
      signature,
      folder: FOLDER,
      type: 'authenticated',
    });
  }

  signedPhotoUrl(publicId: string, seconds = 100): string {
    const expireAt = Math.floor(Date.now() / 1000) + seconds;

    return this.cloudinary.url(publicId, {
      resource_type: 'image',
      type: 'authenticated',
      sign_url: true,
      expire_at: expireAt,
      transformation: [
        {
          width: 1080,
          height: 1080,
          crop: 'limit',
          quality: 'auto:good',
          format: 'jpg',
        },
      ],
    });
  }

  async deletePhotosByPublicIds(
    publicIds: string[] = [],
  ): Promise<DeletePhotosResult> {
    if (!publicIds.length) return { deletedCount: 0, failedPublicIds: [] };

    const chunks: string[][] = [];
    for (let i = 0; i < publicIds.length; i += 100) {
      chunks.push(publicIds.slice(i, i + 100));
    }

    let deletedCount = 0;
    const failedPublicIds: string[] = [];

    for (const batch of chunks) {
      const resp = (await this.cloudinary.api.delete_resources(batch, {
        resource_type: 'image',
        type: 'authenticated',
      })) as DeleteResourcesResponse;

      const deleted = resp.deleted ?? {};
      for (const id of batch) {
        if (deleted[id] === 'deleted') {
          deletedCount += 1;
        } else {
          // Falta en la respuesta o vino con status distinto de
          // "deleted" (p. ej. "not_found"/"error") — se reporta como
          // fallo explícito en lugar de perderse en un conteo global
          // (corrige A3: antes no había forma de saber CUÁLES fotos
          // quedaban huérfanas tras una purga parcial).
          failedPublicIds.push(id);
        }
      }
    }

    return { deletedCount, failedPublicIds };
  }
}
