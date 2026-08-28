import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CreateParticipantDto } from './dto/create-participant.dto';
import {
  CreatedParticipant,
  ParticipantMasked,
} from './participants.repository';
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

  @Get()
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista participantes con el teléfono enmascarado',
    description:
      'Requiere token Firebase válido con el custom claim admin:true.',
  })
  findAllMasked(): Promise<ParticipantMasked[]> {
    return this.participantsService.findAllMasked();
  }
}
