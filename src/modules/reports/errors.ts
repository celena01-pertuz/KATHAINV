export class ReportOperationError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly code = 'REPORT_OPERATION_ERROR',
  ) {
    super(message);
    this.name = 'ReportOperationError';
  }
}
