import { waitMs } from "../src";

describe("[function waitMs]", () => {
    it("Wait for milliseconds", async () => {
        const result = await waitMs(100);
        expect(result).toBe(100);
    });
});
