// What went wrong with a staff action, in the terms the page explains to staff (SDD 6).
// Details stay out of the page; Sentry gets them from step 10.

export type FailureKind =
  'permission' | 'network' | 'notFound' | 'slugTaken' | 'categoryInUse' | 'invalid' | 'unknown';

export class AdminError extends Error {
  constructor(
    readonly kind: FailureKind,
    options?: { cause?: unknown },
  ) {
    super(kind, options);
    this.name = 'AdminError';
  }
}

interface ApiError {
  code?: string;
  status?: number;
}

/** Postgres and PostgREST error codes, plus the HTTP status, to a failure kind. */
export function failureKind(error: ApiError, status: number): FailureKind {
  if (status === 0) return 'network';
  switch (error.code) {
    case '42501': // RLS or privileges refused the write.
    case 'PGRST301': // The login token is invalid or expired.
    case 'PGRST303':
      return 'permission';
    case '23503': // A category that still has items (FR-42).
      return 'categoryInUse';
    case '23505':
      return 'slugTaken';
    case '23514':
    case '22P02':
      return 'invalid';
    default:
      return status === 401 || status === 403 ? 'permission' : 'unknown';
  }
}

export function asAdminError(error: unknown): AdminError {
  if (error instanceof AdminError) return error;
  if (error instanceof TypeError) return new AdminError('network', { cause: error });
  return new AdminError('unknown', { cause: error });
}
