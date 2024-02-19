import { sleep, waitMs } from "../src/async";

describe("[function waitMs]", () => {
    it("Wait for milliseconds", async () => {
        const result = await waitMs(100);
        expect(result).toBe(100);
    });
});

describe("[function sleep]", () => {
    it("Wait for milliseconds", async () => {
        const result = await sleep(100);
        expect(result).toBe(100);
    });
});
