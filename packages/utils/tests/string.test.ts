import util from "util";
import { fullInspect, stringify } from "../src/string";

describe("String utils", () => {
    describe(util.inspect(fullInspect), () => {
        it("Normal inspect", () => {
            const testCases: [unknown, string][] = [
                [null, "null"],
                [undefined, "undefined"],
                [123, "123"],
                ["123", "'123'"],
                [{ a: 1 }, "{ a: 1 }"],
                [[1, "a", null], "[ 1, 'a', null ]"],
            ];
            for (const [input, output] of testCases) {
                for (const result of [fullInspect(input, false), fullInspect(input)]) {
                    expect(result).toEqual(output);
                }
            }
        });
        it("Not contains short handle", () => {
            const testCases: unknown[] = [
                { a: { b: { c: { d: 1 } } } },
                { a: { b: { c: [1] } } },
                Array(1000),
                Array(1000).fill(1),
                {},
                [],
            ];
            for (const input of testCases) {
                for (const result of [fullInspect(input, false), fullInspect(input)]) {
                    expect(result).not.toMatch(/(\[Object\])/);
                    expect(result).not.toMatch(/(\[Array\])/);
                    expect(result).not.toMatch(/(more items)/);
                }
            }
        });
        it("Show colors", () => {
            const testCases: unknown[] = [null, undefined, 123, "123", { a: 1 }, [1, "a", null]];
            for (const input of testCases) {
                const result = fullInspect(input, true);
                expect(result).toMatch(/(\u001B\[)/);
            }
        });
    });

    describe(util.inspect(stringify), () => {

        it("Normal inspect", () => {
            const testCases: [unknown, string][] = [
                [null, "null"],
                [undefined, "undefined"],
                [123, "123"],
                ["123", "123"],
                [{ a: 1 }, "{ a: 1 }"],
                [[1, "a", null], "[ 1, 'a', null ]"],
            ];
            for (const [input, output] of testCases) {
                const result = stringify(input, false);
                expect(result).toEqual(output);
            }
        });
        it("Not contains short handle", () => {
            const testCases: unknown[] = [
                { a: { b: { c: { d: 1 } } } },
                { a: { b: { c: [1] } } },
                Array(1000),
                Array(1000).fill(1),
                {},
                [],
            ];
            for (const input of testCases) {
                for (const result of [stringify(input, false), stringify(input)]) {
                    expect(result).not.toMatch(/(\[Object\])/);
                    expect(result).not.toMatch(/(\[Array\])/);
                    expect(result).not.toMatch(/(more items)/);
                }
            }
        });
        it("Show colors", () => {
            const testCasesMatch: unknown[] = [null, { a: 1 }, [1, "a", null]];
            for (const input of testCasesMatch) {
                const result = stringify(input, true);
                expect(result).toMatch(/(\u001B\[)/);
            }

            const testCasesNoMatch: unknown[] = [undefined, 123, "123"];
            for (const input of testCasesNoMatch) {
                const result = stringify(input, true);
                expect(result).not.toMatch(/(\u001B\[)/);
            }
        });
    })
});
