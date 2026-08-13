import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CloudinaryService,
  UploadSignature,
} from '../../integrations/cloudinary/cloudinary.service';

@ApiTags('upload')
@Controller('sign-upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Firma de subida directa a Cloudinary',
    description:
      'Público, sin autenticación — igual que en el Express original. ' +
      'El binario de la foto nunca pasa por este servidor.',
  })
  signUpload(): Promise<UploadSignature> {
    return this.cloudinaryService.buildUploadSignature();
  }
}
