import 'server-only';
import { z } from 'zod';
import { AppError } from '../errors/app-error';

/**
 * Server-only Environment Configuration
 * Validates required environment variables without leaking secrets to the client.
 */

const ServerEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

function loadServerEnv(): ServerEnv {
  const parsed = ServerEnvSchema.safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Server environment configuration validation failed',
      500,
      false
    );
  }

  return parsed.data;
}

export const serverEnv = loadServerEnv();
