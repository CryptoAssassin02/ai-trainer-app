/**
 * Health check endpoint for monitoring application status
 */
export async function GET() {
  return Response.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'trAIner Frontend'
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
