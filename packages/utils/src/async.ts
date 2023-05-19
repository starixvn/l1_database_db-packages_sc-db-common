export async function waitMs(ms: number): Promise<number> {
    return new Promise((resolve) => setTimeout(resolve, ms, ms));
}
