export class JourneyError extends Error {
  override name = 'Journey Error';
  override message!: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, JourneyError.prototype);
  }
}
