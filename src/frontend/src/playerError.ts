export enum PlayerErrors {
  CONVERSION,
  ERRONEOUS_STREAM,
  NO_STREAM,
  TERMINATED,
  UNKNOWN,
}

export class PlayerError extends Error {
  constructor(message: string, readonly code: PlayerErrors = PlayerErrors.UNKNOWN) {
    super(message)
  }
}
