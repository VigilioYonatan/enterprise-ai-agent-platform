import { Module } from '@nestjs/common';
import { MeController } from './presentation/http/controllers/me.controller';
@Module({ controllers: [MeController] })
export class IdentityModule {}
