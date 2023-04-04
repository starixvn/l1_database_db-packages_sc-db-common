import { getNpmVersion } from "../src";

describe("[function getNpmVersion]", () => {
    const envBackup = { ...process.env };

    const testInput = [
        "release",
        "version",
        "111",
    ];

    it("Non-existing version", () => {
        const testCases = [
            { npm_package_name: "unit-test", npm_package_version: "" },
            { npm_package_name: "unit-test", npm_package_version: null },
            { npm_package_name: null, npm_package_version: "1.2.3" },
            { npm_package_name: "", npm_package_version: "" },
            { npm_package_name: "", npm_package_version: null },
            { npm_package_name: null, npm_package_version: "" },
            { npm_package_name: "unit-test" },
            { npm_package_version: "1.2.3" },
            {},
        ];

        for (const env of testCases) {
            delete process.env.npm_package_name;
            delete process.env.npm_package_version;
            Object.assign(process.env, env);

            for (const input of testInput) {
                expect(getNpmVersion(input)).toEqual(undefined);
            }
            expect(getNpmVersion()).toEqual(undefined);
        }
    });

    const testCases = [
        [{ npm_package_name: "unit-test", npm_package_version: "1.2.3" }, "unit-test@1.2.3"],
        [{ npm_package_name: "123", npm_package_version: "1.2.3" }, "123@1.2.3"],
    ];

    it("Return version string", () => {
        for (const [env, output] of testCases) {
            Object.assign(process.env, env);

            expect(getNpmVersion()).toEqual(output);
        }
    })

    it("Return version object", () => {
        for (const [env, output] of testCases) {
            Object.assign(process.env, env);

            for (const input of testInput) {
                expect(getNpmVersion(input)).toEqual({ [input]: output })
            }
            expect(getNpmVersion("")).toEqual({ version: output });
        }
    })

    process.env = envBackup;
});
