const EmptyString = "" as const;

export function getNpmVersion(): string | undefined;
export function getNpmVersion<T extends typeof EmptyString>(objectField: T): { version: string } | undefined;
export function getNpmVersion<T extends Exclude<string, typeof EmptyString>>(objectField: T): { [k in T]: string } | undefined;
export function getNpmVersion<T extends string | undefined>(objectField?: T): { [k: string]: string } | string | undefined {
    const { npm_package_name: packageName, npm_package_version: packageVersion } = process.env;
    if (![packageName, packageVersion].every(Boolean)) {
        return undefined;
    }

    const version = `${packageName}@${packageVersion}`;

    if (objectField === undefined) {
        return version;
    }
    if (objectField) {
        return { [objectField]: version };
    }
    return { version };
}

export function getNodeEnv(): string {
    const { NODE_ENV } = process.env;

    if (!NODE_ENV) {
        return "DEV";
    }

    return NODE_ENV.toUpperCase();
}
