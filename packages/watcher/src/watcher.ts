import { TypedEventEmitter } from "@ldb/types";
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
    WatcherEvents<TSchema | TSchemaEvent>
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
        this.changeStream.on(ChangeStream.CHANGE, (...args) => this.handleChangeStreamChange(...args));
        this.changeStream.on(ChangeStream.ERROR, (...args) => this.handleChangeStreamError(...args));
        this.changeStream.once(ChangeStream.CLOSE, (...args) => this.handleChangeStreamClosed(...args));
    }

    handleChangeStreamChange(data: ChangeStreamDocument<TSchema>) {
        const { operationType } = data;

        if (operationType === "insert" || operationType === "update" || operationType === "replace") {
            const { fullDocument, ...rest } = data;
            const transformedData: ChangeStreamCUDocument<TSchema | TSchemaEvent> = {
                ...rest,
                fullDocument: this.transformFullDocument(fullDocument),
            };
            this.emit(Watcher.CHANGE, transformedData);
        } else {
            this.emit(Watcher.CHANGE, data);
        }
    }

    protected transformFullDocument(document: TSchema | undefined): TSchemaEvent {
        if (!document) {
            return {} as TSchemaEvent;
        }
        return document as unknown as TSchemaEvent;
    }

    handleChangeStreamError(error: Error) {
        this.emit(Watcher.ERROR, error);
    }

    handleChangeStreamClosed() {
        const oldChangeStream = this.changeStream;
        const { parent, pipeline, options, resumeToken } = oldChangeStream;

        this.closeChangeStream(oldChangeStream);

        this.changeStream = parent.watch(pipeline, { ...options, resumeAfter: resumeToken });
        this.attachEvents();
        this.emit(Watcher.NOTIFY, "Change stream is re-initialized");
    }
    private closeChangeStream(changeStream: ChangeStream) {
        changeStream.removeAllListeners();
        changeStream.close().catch();
    }
}
