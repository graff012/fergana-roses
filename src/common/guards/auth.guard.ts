import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

// reflector is to check if the route has @Public decorator
import { Reflector } from '@nestjs/core';

// Jwt is to verify token
import { JwtService } from '@nestjs/jwt';

interface AuthUser {
  id: string;
  role: string;
}

interface getRequest extends Request {
  userId?: string;
  role?: string;
  user?: AuthUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    // if class or function is 'isPublic' decorator, then they are not required alltogether
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<getRequest>();

    // Expect Authorization: Bearer <token>
    const authHeader = (request as any).headers?.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (!token || (scheme || '').toLowerCase() !== 'bearer') {
      throw new ForbiddenException('Missing or invalid Authorization header');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        userId: string;
        role: string;
      }>(token);

      request.user = {
        id: payload.userId,
        role: payload.role,
      };

      // request.userId = payload.userId;
      // request.role = payload.role;
      // console.log('role: ', request.role);

      return true;
    } catch (err) {
      console.error(err);
      throw new ForbiddenException('Token is invalid');
    }
  }
}
