export async function waitMs(ms: number): Promise<number> {
    return new Promise((resolve) => setTimeout(resolve, ms, ms));
}

/**
 * Sleep for the specified number of milliseconds
 * @param {number} ms
 */
export async function sleep(ms: number): Promise<number> {
    return new Promise((resolve) => setTimeout(resolve, ms, ms));
}
