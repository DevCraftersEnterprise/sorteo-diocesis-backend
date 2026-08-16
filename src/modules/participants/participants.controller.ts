import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { CreatedParticipant } from './participants.repository';
import { ParticipantsService } from './participants.service';

@ApiTags('participants')
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post()
  @ApiOperation({
    summary: 'Registra un nuevo participante',
    description:
      'Público, sin autenticación — igual que en el Express original.',
  })
  create(@Body() dto: CreateParticipantDto): Promise<CreatedParticipant> {
    return this.participantsService.create(dto);
  }
}
