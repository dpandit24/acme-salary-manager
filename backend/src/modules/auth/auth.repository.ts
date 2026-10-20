import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { HrUser } from './entities/hr_user.entity';
import { UserSession } from './entities/user_session.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(HrUser) private readonly hr_users: Repository<HrUser>,
    @InjectRepository(UserSession) private readonly user_sessions: Repository<UserSession>,
  ) {}

  find_user_by_email(email: string): Promise<HrUser | null> {
    return this.hr_users.findOne({ where: { email } });
  }

  create_session(hr_user_id: string, expires_at: Date): Promise<UserSession> {
    return this.user_sessions.save(this.user_sessions.create({ hr_user_id, expires_at }));
  }

  /** Session and its user in one round trip; both tables belong to this module. */
  async find_session_with_user(id: string): Promise<{ session: UserSession; user: HrUser } | null> {
    const row = await this.user_sessions
      .createQueryBuilder('s')
      .innerJoin(HrUser, 'u', 'u.id = s.hr_user_id')
      .select(['s.id AS session_id', 's.expires_at AS expires_at', 'u.id AS user_id', 'u.email AS email'])
      .where('s.id = :id', { id })
      .getRawOne<{ session_id: string; expires_at: Date; user_id: string; email: string }>();
    if (!row) return null;
    return {
      session: Object.assign(new UserSession(), { id: row.session_id, hr_user_id: row.user_id, expires_at: row.expires_at }),
      user: Object.assign(new HrUser(), { id: row.user_id, email: row.email }),
    };
  }

  async delete_session(id: string): Promise<void> {
    await this.user_sessions.delete({ id });
  }

  async delete_expired_sessions(now: Date): Promise<void> {
    await this.user_sessions.delete({ expires_at: LessThan(now) });
  }
}
