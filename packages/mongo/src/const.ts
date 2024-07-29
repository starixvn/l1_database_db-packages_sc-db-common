import { type MongoClientOptions } from "mongodb";

export const MONGOCLIENT_DEFAULT_OPTIONS = {
    authSource: "admin",
    forceServerObjectId: true,
    writeConcern: { w: "majority" },
    compressors: ["zstd", "zlib", "snappy"],
} as const satisfies MongoClientOptions;
