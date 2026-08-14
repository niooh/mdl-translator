export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public context?: string,
  ) {
    super(`Line ${line}: ${message}`);
    this.name = 'ParseError';
  }
}
