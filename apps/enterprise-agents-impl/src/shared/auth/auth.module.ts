import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OidcGuard } from './auth.guard';
@Module({ providers: [{ provide: APP_GUARD, useClass: OidcGuard }] })
export class AuthModule {}
