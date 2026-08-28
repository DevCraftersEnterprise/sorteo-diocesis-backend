import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { ExportService } from './export.service';

@Module({
  imports: [CloudinaryModule],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
