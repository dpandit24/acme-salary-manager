import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiError } from '../../common/api_error';
import { SESSION_COOKIE } from './auth.routes';
import { AuthService, SessionUser } from './auth.service';
import { IS_PUBLIC } from './public.decorator';

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  session_id?: string;
}

/** Registered globally: every route needs a valid session unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth_service: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session_id: unknown = request.signedCookies?.[SESSION_COOKIE];
    if (typeof session_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(session_id)) throw ApiError.unauthorized();

    const user = await this.auth_service.resolve_session(session_id);
    if (!user) throw ApiError.unauthorized();
    request.user = user;
    request.session_id = session_id;
    return true;
  }
}
