import { TypedEventEmitter } from "@ldb/types";
import {
    ChangeStream,
    ChangeStreamDocument,
    ChangeStreamEvents,
    ChangeStreamInsertDocument,
    ChangeStreamReplaceDocument,
    ChangeStreamUpdateDocument,
    Collection,
    Db,
    Document,
    MongoClient,
} from "mongodb";
import { CHANGE, ERROR, NOTIFY } from "./constants";

type WatcherEvents = {
    [CHANGE](data: ChangeStreamDocument): void;
    [ERROR](error: Error): void;
    [NOTIFY](data: unknown): void;
};

export type ChangeStreamCUDocument<TSchema extends Document> =
    | ChangeStreamInsertDocument<TSchema>
    | ChangeStreamUpdateDocument<TSchema>
    | ChangeStreamReplaceDocument<TSchema>;

export class Watcher<TSchema extends Document = Document> extends TypedEventEmitter<WatcherEvents> {
    static readonly CHANGE = CHANGE;
    static readonly ERROR = ERROR;
    static readonly NOTIFY = NOTIFY;

    changeStream: ChangeStream<TSchema>;

    private handleChangeBound: ChangeStreamEvents<TSchema>[typeof ChangeStream.CHANGE];
    private handleErrorBound: ChangeStreamEvents<TSchema>[typeof ChangeStream.ERROR];
    private handleCloseBound: ChangeStreamEvents<TSchema>[typeof ChangeStream.CLOSE];

    get parent(): MongoClient | Db | Collection<TSchema> {
        const parent = this.changeStream.parent;

        if (parent instanceof Collection) {
            return parent as unknown as Collection<TSchema>;
        }

        return parent;
    }
    get resumeToken() {
        return this.changeStream.resumeToken;
    }
    get find() {
        if (this.parent instanceof MongoClient || this.parent instanceof Db) {
            return undefined;
        }
        return this.parent.find;
    }
    get aggregate() {
        if (this.parent instanceof MongoClient) {
            return this.parent.db("admin").aggregate;
        }
        return this.parent.aggregate;
    }

    constructor(changeStream: ChangeStream<TSchema>) {
        super();
        this.changeStream = changeStream;

        this.handleChangeBound = this.handleChangeStreamChange.bind(this);
        this.handleErrorBound = this.handleChangeStreamError.bind(this);
        this.handleCloseBound = this.handleChangeStreamClosed.bind(this);

        this.attachEvents();
    }

    attachEvents() {
        this.changeStream.on(ChangeStream.CHANGE, this.handleChangeBound);
        this.changeStream.on(ChangeStream.ERROR, this.handleErrorBound);
        this.changeStream.once(ChangeStream.CLOSE, this.handleCloseBound);
    }

    handleChangeStreamChange(data: ChangeStreamDocument<TSchema>) {
        const { operationType } = data;
        if (operationType === "insert" || operationType === "update" || operationType === "replace") {
            this.transformFullDocument(data);
        }
        this.emit(Watcher.CHANGE, data);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected transformFullDocument(document: ChangeStreamCUDocument<TSchema>) {
        return;
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
