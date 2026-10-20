import { Injectable } from '@nestjs/common';
import { compare, hashSync } from 'bcryptjs';
import { ApiError } from '../../common/api_error';
import { AuthRepository } from './auth.repository';

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const PASSWORD_HASH_ROUNDS = 12;

// Compared against when the email is unknown, so a wrong email and a wrong password take the same time.
const DUMMY_HASH = hashSync('no-such-user', PASSWORD_HASH_ROUNDS);

export interface SessionUser {
  id: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly auth_repository: AuthRepository) {}

  async login(email: string, password: string): Promise<{ session_id: string; expires_at: Date; user: SessionUser }> {
    const user = await this.auth_repository.find_user_by_email(email);
    const valid = await compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !valid) throw ApiError.unauthorized('Email or password is incorrect');

    const now = new Date();
    await this.auth_repository.delete_expired_sessions(now);
    const session = await this.auth_repository.create_session(user.id, new Date(now.getTime() + SESSION_TTL_MS));
    return { session_id: session.id, expires_at: session.expires_at, user: { id: user.id, email: user.email } };
  }

  /** The signed-in user for a session id, or null when the session is missing or expired. */
  async resolve_session(session_id: string): Promise<SessionUser | null> {
    const found = await this.auth_repository.find_session_with_user(session_id);
    if (!found) return null;
    if (found.session.expires_at.getTime() <= Date.now()) {
      await this.auth_repository.delete_session(found.session.id);
      return null;
    }
    return { id: found.user.id, email: found.user.email };
  }

  logout(session_id: string): Promise<void> {
    return this.auth_repository.delete_session(session_id);
  }
}
