import { createLogger } from '@/utils/server-logger';

const logger = createLogger('status');

/**
 * Handles GET requests to the /api/health endpoint.
 * @returns {Response} A response object.
 */
export function GET(): Response {
  try {
    const responsePayload = {
      status: 'ok',
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    const errorPayload = {
      status: 'error',
      message: 'The service is experiencing issues.',
    };
    return new Response(JSON.stringify(errorPayload), {
      status: 503, // 503 Service Unavailable is an appropriate status code for a failed health check
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
