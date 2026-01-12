/**
 * Error Reporting API Endpoint
 * Handles client-side error reports for monitoring and debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, any>;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  fingerprint?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'api' | 'client' | 'security' | 'performance' | 'unknown';
}

// Rate limiting for error reports
const reportCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_REPORTS_PER_MINUTE = 10;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const record = reportCounts.get(identifier);
  
  if (!record || now > record.resetTime) {
    reportCounts.set(identifier, { count: 1, resetTime: now + 60000 });
    return false;
  }
  
  if (record.count >= MAX_REPORTS_PER_MINUTE) {
    return true;
  }
  
  record.count++;
  return false;
}

function sanitizeErrorReport(report: any): ErrorReport | null {
  try {
    // Validate required fields
    if (!report.id || !report.timestamp || !report.error) {
      return null;
    }
    
    // Sanitize and validate error object
    const error = {
      name: String(report.error.name || 'Unknown').substring(0, 100),
      message: String(report.error.message || 'No message').substring(0, 1000),
      stack: report.error.stack ? String(report.error.stack).substring(0, 5000) : undefined
    };
    
    // Sanitize other fields
    const sanitized: ErrorReport = {
      id: String(report.id).substring(0, 50),
      timestamp: String(report.timestamp),
      error,
      userAgent: String(report.userAgent || '').substring(0, 500),
      url: String(report.url || '').substring(0, 1000),
      userId: report.userId ? String(report.userId).substring(0, 50) : undefined,
      sessionId: report.sessionId ? String(report.sessionId).substring(0, 50) : undefined,
      fingerprint: report.fingerprint ? String(report.fingerprint).substring(0, 50) : undefined,
      severity: ['low', 'medium', 'high', 'critical'].includes(report.severity) ? report.severity : 'medium',
      category: ['network', 'api', 'client', 'security', 'performance', 'unknown'].includes(report.category) ? report.category : 'unknown'
    };
    
    // Sanitize context if present
    if (report.context && typeof report.context === 'object') {
      const context: Record<string, any> = {};
      Object.keys(report.context).slice(0, 20).forEach(key => {
        const value = report.context[key];
        if (typeof value === 'string') {
          context[key] = value.substring(0, 500);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          context[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          context[key] = JSON.stringify(value).substring(0, 1000);
        }
      });
      sanitized.context = context;
    }
    
    return sanitized;
  } catch (error) {
    console.error('Error sanitizing error report:', error);
    return null;
  }
}

async function logErrorToConsole(report: ErrorReport, clientIP: string): Promise<void> {
  const timestamp = new Date(report.timestamp).toISOString();
  
  console.group(`🚨 Client Error Report [${report.severity.toUpperCase()}]`);
  console.log(`Time: ${timestamp}`);
  console.log(`ID: ${report.id}`);
  console.log(`Category: ${report.category}`);
  console.log(`URL: ${report.url}`);
  console.log(`Client IP: ${clientIP}`);
  console.log(`User Agent: ${report.userAgent}`);
  
  if (report.userId) {
    console.log(`User ID: ${report.userId}`);
  }
  
  if (report.sessionId) {
    console.log(`Session ID: ${report.sessionId}`);
  }
  
  console.error(`Error: ${report.error.name}: ${report.error.message}`);
  
  if (report.error.stack) {
    console.log(`Stack Trace:\n${report.error.stack}`);
  }
  
  if (report.context) {
    console.log('Context:', report.context);
  }
  
  console.groupEnd();
}

async function reportToExternalService(report: ErrorReport): Promise<void> {
  // In a production environment, you would integrate with services like:
  // - Sentry: Sentry.captureException()
  // - LogRocket: LogRocket.captureException()
  // - Bugsnag: Bugsnag.notify()
  // - Custom logging service
  
  if (process.env.SENTRY_DSN) {
    // Example Sentry integration
    try {
      // const Sentry = require('@sentry/nextjs');
      // Sentry.captureException(new Error(report.error.message), {
      //   contexts: {
      //     errorReport: report
      //   },
      //   tags: {
      //     category: report.category,
      //     severity: report.severity
      //   },
      //   user: report.userId ? { id: report.userId } : undefined
      // });
    } catch (error) {
      console.error('Failed to report to Sentry:', error);
    }
  }
  
  // Store in database for internal analysis
  if (process.env.DATABASE_URL) {
    try {
      // Example database storage
      // await db.errorReports.create({
      //   data: {
      //     errorId: report.id,
      //     timestamp: new Date(report.timestamp),
      //     errorName: report.error.name,
      //     errorMessage: report.error.message,
      //     errorStack: report.error.stack,
      //     context: report.context,
      //     userAgent: report.userAgent,
      //     url: report.url,
      //     userId: report.userId,
      //     sessionId: report.sessionId,
      //     fingerprint: report.fingerprint,
      //     severity: report.severity,
      //     category: report.category
      //   }
      // });
    } catch (error) {
      console.error('Failed to store error report in database:', error);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const headersList = headers();
    const clientIP = headersList.get('x-forwarded-for') || 
                    headersList.get('x-real-ip') || 
                    'unknown';
    
    // Rate limiting check
    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        { error: 'Too many error reports. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const sanitizedReport = sanitizeErrorReport(body);
    
    if (!sanitizedReport) {
      return NextResponse.json(
        { error: 'Invalid error report format' },
        { status: 400 }
      );
    }
    
    // Log to console for immediate visibility
    await logErrorToConsole(sanitizedReport, clientIP);
    
    // Report to external services in production
    if (process.env.NODE_ENV === 'production') {
      try {
        await reportToExternalService(sanitizedReport);
      } catch (error) {
        console.error('Failed to report to external service:', error);
      }
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      reportId: sanitizedReport.id,
      message: 'Error report received successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error processing error report:', error);
    
    return NextResponse.json(
      { error: 'Internal server error while processing report' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'error-reporting',
    timestamp: new Date().toISOString()
  });
}