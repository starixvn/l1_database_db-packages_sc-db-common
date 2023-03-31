import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    bail: 5,
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: "coverage",
    coveragePathIgnorePatterns: ["/node_modules/"],
    setupFilesAfterEnv: ["jest-extended"],
    verbose: true,
    extensionsToTreatAsEsm: [".ts"],
    transform: {
        "^.+\\.(ts|tsx)?$": ["ts-jest", { useESM: true }],
    },
};
export default config;
