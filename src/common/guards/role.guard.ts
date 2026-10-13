import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RoleUser {
  role: string;
}

interface RequestWithUser extends Request {
  user: RoleUser;
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const userRole = request.user.role;
    const handler = context.getHandler();
    const mainRoles = this.reflector.get<string[]>('roles', handler) ?? [];

    if (!mainRoles.includes(userRole)) {
      throw new ForbiddenException('Role require');
    }

    return true;
  }
}
