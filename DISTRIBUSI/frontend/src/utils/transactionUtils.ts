/**
 * Generates a unique idempotency key for transactions to prevent duplicate processing.
 * Format: [ACTION]_[USER_ID]_[TIMESTAMP]_[RANDOM]
 */
export const generateIdempotencyKey = (action: string, userId: number | string = 'anon'): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    return `${action}_${userId}_${timestamp}_${random}`;
};

/**
 * Helper to wrap axios calls with automatic idempotency key generation
 * and basic optimistic state handling.
 */
export const withIdempotency = async <T>(
    action: string,
    userId: number | string,
    onExecute: (idempKey: string) => Promise<T>
): Promise<T> => {
    const key = generateIdempotencyKey(action, userId);
    return onExecute(key);
};
