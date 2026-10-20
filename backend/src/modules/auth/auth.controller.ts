import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { CookieOptions, Response } from 'express';
import { is_production } from '../../config/env';
import { AuthenticatedRequest } from './auth.guard';
import { AUTH_ROUTES, SESSION_COOKIE } from './auth.routes';
import { AuthService, SessionUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';

function cookie_options(): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure: is_production(), signed: true, path: '/' };
}

@Controller(AUTH_ROUTES.base)
export class AuthController {
  constructor(private readonly auth_service: AuthService) {}

  @Public()
  @Post(AUTH_ROUTES.login)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<SessionUser> {
    const { session_id, expires_at, user } = await this.auth_service.login(dto.email, dto.password);
    response.cookie(SESSION_COOKIE, session_id, { ...cookie_options(), expires: expires_at });
    return user;
  }

  @Post(AUTH_ROUTES.logout)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response): Promise<void> {
    if (request.session_id) await this.auth_service.logout(request.session_id);
    response.clearCookie(SESSION_COOKIE, cookie_options());
  }

  @Get(AUTH_ROUTES.me)
  me(@Req() request: AuthenticatedRequest): SessionUser {
    return request.user!;
  }
}
