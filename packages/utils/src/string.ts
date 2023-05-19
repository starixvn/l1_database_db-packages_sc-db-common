import util from "util";

export function fullInspect(object: unknown, colors = false): string {
    return util.inspect(object, { showHidden: false, depth: null, maxArrayLength: null, colors });
}

export function stringify(object: unknown, colors = false): string {
    if (typeof object === "object" || typeof object === "function") {
        return fullInspect(object, colors);
    } else {
        return String(object);
    }
}
