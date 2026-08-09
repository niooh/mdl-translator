export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
  ) {
    super(`Line ${line}: ${message}`);
    this.name = 'ParseError';
  }
}
