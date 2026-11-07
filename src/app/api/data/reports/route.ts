import { NextRequest, NextResponse } from 'next/server';
import { authorizeReportRequest } from '@/modules/reports/api-access';
import { ReportOperationError } from '@/modules/reports/errors';
import { reportDateRangeSchema } from '@/modules/reports/date-range';
import { getReports } from '@/modules/reports/service';

function apiError(message: string, code: string, status: number) {
  return NextResponse.json(
    { success: false, error: message, code, timestamp: new Date().toISOString() },
    { status },
  );
}

export async function GET(request: NextRequest) {
  const denied = await authorizeReportRequest();
  if (denied) return denied;

  const parsed = reportDateRangeSchema.safeParse({
    from: request.nextUrl.searchParams.get('from') ?? undefined,
    to: request.nextUrl.searchParams.get('to') ?? undefined,
  });
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((issue) => issue.message).join(' '),
      'VALIDATION_ERROR',
      400,
    );
  }

  try {
    const report = await getReports(parsed.data);
    return NextResponse.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ReportOperationError) {
      return apiError(error.message, error.code, error.status);
    }
    return apiError('No se pudieron consultar los reportes.', 'REPORT_OPERATION_ERROR', 500);
  }
}
