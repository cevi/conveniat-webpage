/**
 * Handles GET requests to the /api/health endpoint.
 * @returns {Response} A response object.
 */
export async function GET(): Promise<Response> {
  try {
    const responsePayload = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
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
