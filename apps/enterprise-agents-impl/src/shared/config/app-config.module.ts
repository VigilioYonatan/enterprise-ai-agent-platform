import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

export const APP_CONFIG = Symbol('APP_CONFIG');

@Global()
@Module({
  providers: [
    AppConfigService,
    {
      provide: APP_CONFIG,
      useExisting: AppConfigService,
    },
  ],
  exports: [AppConfigService, APP_CONFIG],
})
export class AppConfigModule {}
