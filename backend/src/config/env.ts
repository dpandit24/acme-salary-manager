import 'dotenv/config';

export function require_env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function database_ssl_enabled(): boolean {
  return (process.env.DATABASE_SSL ?? 'true') !== 'false';
}

export function is_production(): boolean {
  return process.env.NODE_ENV === 'production';
}
