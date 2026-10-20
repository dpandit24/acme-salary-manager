// Used by the TypeORM CLI (migrations) and the seed script: always the session-mode connection.
import { DataSource } from 'typeorm';
import { require_env } from '../config/env';
import { database_options } from './database_options';

export default new DataSource(database_options(require_env('DATABASE_DIRECT_URL'), { pool_size: 2 }));
