export const SEMVER_REGEX =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
export const VERSION_REGEX = /^(.*)@([^@]+)$/;

export function parseVersion(version: string) {
    const parsed = VERSION_REGEX.exec(version);

    if (!parsed || !parsed[1] || !parsed[2]) {
        return null;
    }

    const [, name, semver] = parsed;
    if (!SEMVER_REGEX.test(semver)) {
        return null;
    }

    return { name, semver };
}

export type SemVer = {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
};

export function parseSemVer(semver: string) {
    const parsed = SEMVER_REGEX.exec(semver);

    if (!parsed) {
        return null;
    }

    const semverPart: SemVer = {
        major: Number(parsed[1]),
        minor: Number(parsed[2]),
        patch: Number(parsed[3]),
    };
    if (parsed[4]) {
        semverPart.prerelease = parsed[4];
    }
    if (parsed[5]) {
        semverPart.build = parsed[5];
    }
    return semverPart;
}
