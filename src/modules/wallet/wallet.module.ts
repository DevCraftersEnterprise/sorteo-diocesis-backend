import { Module } from '@nestjs/common';
import { ParticipantsModule } from '../participants/participants.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [ParticipantsModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
