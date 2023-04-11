import { TypedEventEmitter } from "@ldb/types";
import { ChangeStream, ChangeStreamDocument } from "mongodb";
import { CHANGE, ERROR, NOTIFY } from "./constants";

type WatcherEvents = {
    [CHANGE](data: ChangeStreamDocument): void;
    [ERROR](error: Error): void;
    [NOTIFY](data: unknown): void;
};

export class Watcher extends TypedEventEmitter<WatcherEvents> {
    static readonly CHANGE = CHANGE;
    static readonly ERROR = ERROR;
    static readonly NOTIFY = NOTIFY;

    changeStream: ChangeStream;

    get parent() {
        return this.changeStream.parent;
    }
    get resumeToken() {
        return this.changeStream.resumeToken;
    }

    constructor(changeStream: ChangeStream) {
        super();

        this.changeStream = changeStream;
        this.attachEvents();
    }

    attachEvents() {
        this.changeStream.on(ChangeStream.CHANGE, this.handleChangeStreamChange.bind(this));
        this.changeStream.on(ChangeStream.ERROR, this.handleChangeStreamError.bind(this));
        this.changeStream.once(ChangeStream.CLOSE, this.handleChangeStreamClosed.bind(this));
    }

    handleChangeStreamChange(data: ChangeStreamDocument) {
        this.emit(Watcher.CHANGE, data);
    }
    handleChangeStreamError(error: Error) {
        this.emit(Watcher.ERROR, error);
    }

    handleChangeStreamClosed() {
        const oldChangeStream = this.changeStream;
        const { parent, pipeline, options, resumeToken, namespace } = oldChangeStream;
        const { db, collection } = namespace;
        try {
            oldChangeStream.removeAllListeners();
            try {
                oldChangeStream.close();
            } catch {
                /** Ignore close error, this command is to ensure changeStream is closed before re-init */
            }

            this.changeStream = parent.watch(pipeline, { ...options, resumeAfter: resumeToken });
            this.attachEvents();
            this.emit(Watcher.NOTIFY, "Change stream is re-initialized");
        } catch (error: unknown) {
            if (error instanceof Error) {
                this.emit(Watcher.ERROR, error);
            } else {
                this.emit(Watcher.ERROR, new Error(String(error)));
            }
        } finally {
            if (this.changeStream.closed) {
                throw new Error(`Error while resume change stream on [${[db, collection].filter(Boolean).join(".")}]`);
            }
        }
    }
}
