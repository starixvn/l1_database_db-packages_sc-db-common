import { SemVer, parseSemVer, parseVersion } from "../src";

describe("[function parseVersionString]", () => {
    it("Invalid version string", () => {
        const testCases: string[] = [
            "unit-test",
            "unitTest",
            "unitTest*2423523",
            "unit_test@",
            "@unit_test@",
            "@1.1.1",
            "@1.1.1-abc",
            "@",
            "",
            "unit-test@123",
            "unitTest@2..2",
            "unit_test@.10.0-111",
            "unit=test@.1.0",
            "unit*test@abcde",
            "unit2test@1.2-aaa",
            "unit+test@1.2",
        ];

        for (const input of testCases) {
            expect(parseVersion(input)).toEqual(null);
        }
    });

    it("Valid version string", () => {
        const testCases: [string, { name: string; semver: string }][] = [
            ["unit-test@0.0.1", { name: "unit-test", semver: "0.0.1" }],
            ["unitTest@2.0.2", { name: "unitTest", semver: "2.0.2" }],
            ["unit_test@0.0.0-111", { name: "unit_test", semver: "0.0.0-111" }],
            ["unit*test@0.1.3-rc1", { name: "unit*test", semver: "0.1.3-rc1" }],
            ["unit*test@1.0.3-rc1+1234", { name: "unit*test", semver: "1.0.3-rc1+1234" }],
            ["@unit-test@0.0.1", { name: "@unit-test", semver: "0.0.1" }],
            ["@unitTest@2.0.2", { name: "@unitTest", semver: "2.0.2" }],
            ["@unit_test@0.0.0-111", { name: "@unit_test", semver: "0.0.0-111" }],
            ["@unit*test@0.1.3-rc1", { name: "@unit*test", semver: "0.1.3-rc1" }],
            ["@unit*test@1.0.3-rc1+1234", { name: "@unit*test", semver: "1.0.3-rc1+1234" }],
            ["@test/unit-test@0.0.1", { name: "@test/unit-test", semver: "0.0.1" }],
            ["@test/unitTest@2.0.2", { name: "@test/unitTest", semver: "2.0.2" }],
            ["@test/unit_test@0.0.0-111", { name: "@test/unit_test", semver: "0.0.0-111" }],
            ["@test/unit*test@0.1.3-rc1", { name: "@test/unit*test", semver: "0.1.3-rc1" }],
            ["@test/unit*test@1.0.3-rc1+1234", { name: "@test/unit*test", semver: "1.0.3-rc1+1234" }],
        ];

        for (const [input, output] of testCases) {
            expect(parseVersion(input)).toEqual(output);
        }
    });
});

describe("[function parseVersionString]", () => {
    it("Invalid semver", () => {
        const testCases: string[] = [
            "1",
            "1.2",
            "1..3",
            ".2.3",
            ".",
            "",
            "a.b.c",
            "1.2.3-11@33",
            "1.2.3-11_33",
            "1.2.3-",
            "1.2.3+",
            "1.2.3-.",
            "1.2.3-.1",
            "1.2.3+.",
            "1.2.3+.2",
            "1.2.3-0000000"
        ];

        for (const test of testCases) {
            expect(parseSemVer(test)).toEqual(null);
        }
    });

    describe("Valid semver", () => {
        it("Core only", () => {
            const testCases: [string, SemVer][] = [
                ["0.0.0", { major: 0, minor: 0, patch: 0 }],
                ["0.2.1", { major: 0, minor: 2, patch: 1 }],
                ["2.3.4", { major: 2, minor: 3, patch: 4 }],
            ];

            for (const [input, output] of testCases) {
                expect(parseSemVer(input)).toEqual(output);
            }
        });
        it("With prerelease", () => {
            const testCases: [string, SemVer][] = [
                ["0.0.0-alpha", { major: 0, minor: 0, patch: 0, prerelease: "alpha" }],
                ["0.2.1-1", { major: 0, minor: 2, patch: 1, prerelease: "1" }],
                ["2.3.4-beta.1", { major: 2, minor: 3, patch: 4, prerelease: "beta.1" }],
                ["2.3.4-beta.alpha.2.1", { major: 2, minor: 3, patch: 4, prerelease: "beta.alpha.2.1" }],
                ["2.3.4-beta-alpha.2.1", { major: 2, minor: 3, patch: 4, prerelease: "beta-alpha.2.1" }],
            ];

            for (const [input, output] of testCases) {
                expect(parseSemVer(input)).toEqual(output);
            }
        });
        it("With build", () => {
            const testCases: [string, SemVer][] = [
                ["0.0.0+alpha", { major: 0, minor: 0, patch: 0, build: "alpha" }],
                ["0.2.1+1", { major: 0, minor: 2, patch: 1, build: "1" }],
                ["2.3.4+beta.1", { major: 2, minor: 3, patch: 4, build: "beta.1" }],
                ["0.2.1+00000", { major: 0, minor: 2, patch: 1, build: "00000" }],
                ["2.3.4+beta.alpha.2.1", { major: 2, minor: 3, patch: 4, build: "beta.alpha.2.1" }],
                ["2.3.4+beta-alpha-2.1", { major: 2, minor: 3, patch: 4, build: "beta-alpha-2.1" }],
            ];

            for (const [input, output] of testCases) {
                expect(parseSemVer(input)).toEqual(output);
            }
        });
        it("With prerelease & build", () => {
            const testCases: [string, SemVer][] = [
                ["0.0.0-beta+alpha", { major: 0, minor: 0, patch: 0, prerelease: "beta", build: "alpha" }],
                ["0.2.1-alpha.1+1", { major: 0, minor: 2, patch: 1, prerelease: "alpha.1", build: "1" }],
                ["2.3.4-rc.1+beta.1", { major: 2, minor: 3, patch: 4, prerelease: "rc.1", build: "beta.1" }],
                ["0.2.1-rc.1.2+00000", { major: 0, minor: 2, patch: 1, prerelease: "rc.1.2", build: "00000" }],
                ["2.3.4-rc.1-2+beta.alpha.2.1", { major: 2, minor: 3, patch: 4, prerelease: "rc.1-2", build: "beta.alpha.2.1" }],
            ];

            for (const [input, output] of testCases) {
                expect(parseSemVer(input)).toEqual(output);
            }
        });
    });
});
