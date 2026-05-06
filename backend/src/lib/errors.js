export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const assert = (condition, status, message) => {
  if (!condition) {
    throw new HttpError(status, message);
  }
};