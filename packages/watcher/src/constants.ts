import { ChangeStream } from "mongodb";

/** events */
export const CHANGE = ChangeStream.CHANGE;
export const ERROR = ChangeStream.ERROR;
export const NOTIFY = "notify" as const;
