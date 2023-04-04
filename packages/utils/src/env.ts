/* eslint-disable camelcase */
export function getNpmVersion(): string | undefined;
export function getNpmVersion(objectField: string): { [k: string]: string } | undefined;
export function getNpmVersion(objectField?: string): { [k: string]: string } | string | undefined {
    const { npm_package_name, npm_package_version } = process.env;
    if (![npm_package_name, npm_package_version].every(Boolean)) {
        return undefined;
    }

    const version = `${npm_package_name}@${npm_package_version}`;

    if (objectField === undefined) {
        return version;
    }
    if (objectField) {
        return { [objectField]: version };
    }
    return { version };
}
