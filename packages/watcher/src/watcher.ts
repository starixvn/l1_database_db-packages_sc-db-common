import { MaybePromise, TypedEventEmitter } from "@ldb/types";
import { stringify } from "@ldb/utils";
import {
    ChangeStream,
    ChangeStreamDocument,
    ChangeStreamInsertDocument,
    ChangeStreamReplaceDocument,
    ChangeStreamUpdateDocument,
    Collection,
    Db,
    Document,
    MongoClient,
} from "mongodb";
import { CHANGE, ERROR, NOTIFY } from "./constants";

export type WatcherEvents<TSchema extends Document = Document> = {
    [CHANGE](data: ChangeStreamDocument<TSchema>): void;
    [ERROR](error: Error): void;
    [NOTIFY](data: unknown): void;
};

export type ChangeStreamCUDocument<TSchema extends Document = Document> =
    | ChangeStreamInsertDocument<TSchema>
    | ChangeStreamUpdateDocument<TSchema>
    | ChangeStreamReplaceDocument<TSchema>;

export class Watcher<TSchema extends Document = Document, TSchemaEvent extends Document = TSchema> extends TypedEventEmitter<
    WatcherEvents<TSchemaEvent>
> {
    static readonly CHANGE = CHANGE;
    static readonly ERROR = ERROR;
    static readonly NOTIFY = NOTIFY;

    changeStream: ChangeStream<TSchema>;

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

    constructor(changeStream: ChangeStream<TSchema>) {
        super();
        this.changeStream = changeStream;
        this.attachEvents();
    }

    attachEvents() {
        this.changeStream.on(ChangeStream.CHANGE, async (...args) => {
            try {
                await this.handleChangeStreamChange(...args);
            } catch (error: unknown) {
                this.emitError(error);
            }
        });
        this.changeStream.on(ChangeStream.ERROR, async (...args) => {
            try {
                await this.handleChangeStreamError(...args);
            } catch (error: unknown) {
                this.emitError(error);
            }
        });
        this.changeStream.once(ChangeStream.CLOSE, async (...args) => {
            try {
                await this.handleChangeStreamClosed(...args);
            } catch (error: unknown) {
                this.emitError(error);
            }
        });
    }

    private emitError(error: unknown) {
        if (error instanceof Error) {
            this.emit("error", error);
        } else {
            const newError = new Error(stringify(error));
            this.emit("error", newError);
        }
    }

    handleChangeStreamChange(data: ChangeStreamDocument<TSchema>): MaybePromise<void> {
        const { operationType } = data;

        if (operationType === "insert" || operationType === "update" || operationType === "replace") {
            const { fullDocument, ...rest } = data;
            const transformedData = {
                ...rest,
                fullDocument: this.transformFullDocument(fullDocument),
            } as unknown as ChangeStreamCUDocument<TSchemaEvent>;
            this.emit(Watcher.CHANGE, transformedData);
        } else {
            this.emit(Watcher.CHANGE, data as unknown as ChangeStreamDocument<TSchemaEvent>);
        }
    }

    protected transformFullDocument(document?: TSchema): TSchemaEvent {
        if (!document) {
            return {} as TSchemaEvent;
        }
        return document as unknown as TSchemaEvent;
    }

    handleChangeStreamError(error: Error): MaybePromise<void> {
        this.emit(Watcher.ERROR, error);
    }

    handleChangeStreamClosed(): MaybePromise<void> {
        const oldChangeStream = this.changeStream;
        const { parent, pipeline, options, resumeToken } = oldChangeStream;

        this.closeChangeStream(oldChangeStream);

        this.changeStream = parent.watch(pipeline, { ...options, startAfter: resumeToken });
        this.attachEvents();
        this.emit(Watcher.NOTIFY, "Change stream is re-initialized");
    }
    private closeChangeStream(changeStream: ChangeStream) {
        changeStream.removeAllListeners();
        changeStream.close().catch();
    }
}
