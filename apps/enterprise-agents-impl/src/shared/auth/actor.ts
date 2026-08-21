import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserSchema } from '../../modules/identity/domain/schemas/user.schema';

export type Actor = {
  sub: UserSchema['id'];
  email: UserSchema['email'];
  email_verified: UserSchema['email_verified'];
};

export const CurrentActor = createParamDecorator(
  (_data: unknown, execution_context: ExecutionContext): Actor => {
    return execution_context.switchToHttp().getRequest().actor as Actor;
  },
);
