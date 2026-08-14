import { IsOptional, IsString } from 'class-validator';

export class ValidateWalletQueryDto {
  @IsOptional()
  @IsString()
  wallet?: string;
}
