export type PowerString<T> = T | (string & NonNullable<unknown>);

export type Explain<T> = { [K in keyof T]: T[K] } & NonNullable<unknown>;

export type Satisfies<T extends U, U> = T;
