/** Thrown when addToCart could not persist (store missing, API error, etc.). */
export class CartAddFailedError extends Error {
  constructor(message?: string) {
    super(message ?? "Failed to add to basket");
    this.name = "CartAddFailedError";
  }
}

export function isCartAddFailedError(error: unknown): boolean {
  return error instanceof CartAddFailedError;
}
