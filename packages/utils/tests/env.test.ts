import { getNodeEnv, getProjectNpmPackageVersion } from "../src";

describe("[function getProjectNpmPackageVersion]", () => {
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
                expect(getProjectNpmPackageVersion(input)).toEqual(undefined);
            }
            expect(getProjectNpmPackageVersion()).toEqual(undefined);
        }
    });

    const testCases = [
        [{ npm_package_name: "unit-test", npm_package_version: "1.2.3" }, "unit-test@1.2.3"],
        [{ npm_package_name: "123", npm_package_version: "1.2.3" }, "123@1.2.3"],
    ];

    it("Return version string", () => {
        for (const [env, output] of testCases) {
            Object.assign(process.env, env);

            expect(getProjectNpmPackageVersion()).toEqual(output);
        }
    })

    it("Return version object", () => {
        for (const [env, output] of testCases) {
            Object.assign(process.env, env);

            for (const input of testInput) {
                expect(getProjectNpmPackageVersion(input)).toEqual({ [input]: output })
            }
            expect(getProjectNpmPackageVersion("")).toEqual({ version: output });
        }
    })

    process.env = envBackup;
});

describe("[function getNodeEnv]", () => {
    const envBackup = { ...process.env };

    it("Non-existing NODE_ENV", () => {
        const testCases = [
            undefined,
            "",
        ];

        for (const test of testCases) {
            process.env.NODE_ENV = test;
            expect(getNodeEnv()).toEqual("DEV");
        }

        delete process.env.NODE_ENV;
        expect(getNodeEnv()).toEqual("DEV");
    });

    it("Existing NODE_ENV", () => {
        const testCases: [string, string][] = [
            ["dev", "DEV"],
            ["development", "DEVELOPMENT"],
            ["DEV", "DEV"],
            ["TEST", "TEST"],
            ["igt", "IGT"],
            ["local-1", "LOCAL-1"],
            ["sit", "SIT"],
            ["uat", "UAT"],
            ["PROD", "PROD"],
            ["production", "PRODUCTION"],
            ["111", "111"],
        ];

        for (const [env, output] of testCases) {
            process.env.NODE_ENV = env;
            expect(getNodeEnv()).toEqual(output);
        }
    })

    process.env = envBackup;
});
