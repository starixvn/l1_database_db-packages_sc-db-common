/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals";
import { stringify, waitMs } from "@ldb/utils";
import EventEmitter from "events";
import { ChangeStream, MongoClient } from "mongodb";
import { Watcher } from "../src/watcher";

afterEach(() => {
    jest.clearAllMocks();
});

describe("[class Watcher]", () => {
    describe("Init sequence", () => {
        it("Listeners attached to ChangeStream", () => {
            const mockChangeStream: any = new EventEmitter();
            const onEvent = jest.spyOn(mockChangeStream, "on");
            const onceEvent = jest.spyOn(mockChangeStream, "once");

            const spyAttachEvents = jest.spyOn(Watcher.prototype, "attachEvents");
            const watcher = new Watcher(mockChangeStream);

            expect(watcher.changeStream).toEqual(mockChangeStream);
            expect(onEvent).toHaveBeenCalledWith("change", expect.any(Function));
            expect(onEvent).toHaveBeenCalledWith("error", expect.any(Function));
            expect(onceEvent).toHaveBeenCalledWith("close", expect.any(Function));
            expect(spyAttachEvents).toHaveBeenCalledTimes(1);
        });
    });

    describe("Watcher will re-emit CHANGE & ERROR events", () => {
        it("Watcher events' value is the same with ChangeStream events'", () => {
            expect(Watcher.CHANGE).toEqual(ChangeStream.CHANGE);
            expect(Watcher.ERROR).toEqual(ChangeStream.ERROR);
        });

        const mockChangeStream: any = new EventEmitter();
        const watcher = new Watcher(mockChangeStream);

        const mockListener = jest.fn();
        watcher.on(Watcher.CHANGE, mockListener);
        watcher.on(Watcher.ERROR, mockListener);

        it("Emit ChangeStream will emit Watcher", () => {
            mockChangeStream.emit(ChangeStream.CHANGE, { test: ChangeStream.CHANGE } as any);
            expect(mockListener).toHaveBeenLastCalledWith({ test: "change" });

            mockChangeStream.emit(ChangeStream.ERROR, { error: ChangeStream.ERROR } as any);
            expect(mockListener).toHaveBeenLastCalledWith({ error: "error" });
        });
    });

    describe("Watcher reuses parent & resumeToken of ChangeStream", () => {
        const mongoClient = new MongoClient("mongodb://X");
        const db = mongoClient.db("test");
        const collection = db.collection("test");

        for (const parent of [mongoClient, db, collection]) {
            describe(`${parent.constructor.name} change stream`, () => {
                const mockChangeStream: any = Object.assign(new EventEmitter(), {
                    parent,
                    resumeToken: { _id: "resume" },
                });
                const watcher = new Watcher(mockChangeStream);

                it("Reuse parent", () => {
                    expect(watcher.parent).toEqual(parent);
                });
                it("Reuse resumeToken", () => {
                    expect(watcher.resumeToken).toEqual({ _id: "resume" });
                });
            });
        }
    });

    describe("Watcher.CHANGE event", () => {
        const mockChangeStream: any = new EventEmitter();
        const watcher = new Watcher(mockChangeStream);
        const mockListener = jest.fn();
        watcher.on("change", mockListener);

        const spyChangeListener = jest.spyOn(watcher, "handleChangeStreamChange");
        const spyEmit = jest.spyOn(watcher, "emit");
        const spyTransform = jest.spyOn(watcher as any, "transformFullDocument");

        it("insert, update, replace with no fullDocument", () => {
            const testCases = [{ operationType: "insert" }, { operationType: "update" }, { operationType: "replace" }];

            for (const data of testCases) {
                const fullDocument = {};
                mockChangeStream.emit(ChangeStream.CHANGE, data);
                expect(spyChangeListener).toHaveBeenLastCalledWith(data);
                expect(spyTransform).toHaveBeenLastCalledWith(undefined);
                expect(spyEmit).toHaveBeenLastCalledWith(Watcher.CHANGE, { ...data, fullDocument });
                expect(mockListener).toHaveBeenLastCalledWith({ ...data, fullDocument });
            }
        });

        it("insert, update, replace with fullDocument", () => {
            const testCases = [
                [{ operationType: "insert" }, { a: 1 }, { a: 4 }],
                [{ operationType: "update" }, { a: 2 }, { a: 8 }],
                [{ operationType: "replace" }, { a: 3 }, { a: 12 }],
            ];

            for (const [data, before] of testCases) {
                const dataNoChange = { ...data, fullDocument: before };

                mockChangeStream.emit(ChangeStream.CHANGE, dataNoChange);
                expect(spyChangeListener).toHaveBeenLastCalledWith(dataNoChange);
                expect(spyTransform).toHaveBeenLastCalledWith(before);
                expect(spyEmit).toHaveBeenLastCalledWith(Watcher.CHANGE, dataNoChange);
                expect(mockListener).toHaveBeenLastCalledWith(dataNoChange);
            }

            spyTransform.mockImplementation((data: any) => {
                data.a = data.a * 4;
                return data;
            });

            for (const [data, before, after] of testCases) {
                const dataBefore = { ...data, fullDocument: before };
                const dataAfter = { ...data, fullDocument: after };

                mockChangeStream.emit(ChangeStream.CHANGE, dataBefore);
                expect(spyChangeListener).toHaveBeenLastCalledWith(dataBefore);
                expect(spyTransform).toHaveBeenLastCalledWith(before);
                expect(spyEmit).toHaveBeenLastCalledWith(Watcher.CHANGE, dataAfter);
                expect(mockListener).toHaveBeenLastCalledWith(dataAfter);
            }
        });

        it("Any other operationType", () => {
            const testCases = [
                { operationType: "drop" },
                { operationType: "rename" },
                { operationType: "dropDatabase" },
                { operationType: "invalidate" },
                { operationType: "createIndexes" },
                { operationType: "create" },
                { operationType: "dropIndexes" },
                { operationType: "shardCollection" },
                { operationType: "reshardCollection" },
                { operationType: "refineCollectionShardKey" },
                { operationType: "delete" },
            ];

            for (const data of testCases) {
                mockChangeStream.emit(ChangeStream.CHANGE, data);
                expect(spyChangeListener).toHaveBeenLastCalledWith(data);
                expect(spyTransform).not.toHaveBeenCalled();
                expect(spyEmit).toHaveBeenLastCalledWith(Watcher.CHANGE, data);
                expect(mockListener).toHaveBeenCalledWith(data);
            }
        });
    });

    describe("Watcher.ERROR event", () => {
        const mockChangeStream: any = new EventEmitter();
        const watcher = new Watcher(mockChangeStream);
        const mockListener = jest.fn();
        watcher.on("error", mockListener);

        const spyErrorListener = jest.spyOn(watcher, "handleChangeStreamError");
        const spyEmit = jest.spyOn(watcher, "emit");

        it("Re-emit error", () => {
            const testCases = [{}, { error: 1 }, new Error("1243"), undefined];

            for (const error of testCases) {
                mockChangeStream.emit(ChangeStream.ERROR, error);
                expect(spyErrorListener).toHaveBeenLastCalledWith(error);
                expect(spyEmit).toHaveBeenLastCalledWith(Watcher.ERROR, error);
                expect(mockListener).toHaveBeenCalledWith(error);
            }
        });
    });

    describe("Watcher.CLOSED event", () => {
        const mockChangeStream: any = new EventEmitter();
        const spyRemoveListeners = jest.spyOn(mockChangeStream, "removeAllListeners").mockImplementation(() => {
            return;
        });
        const onEvent = jest.spyOn(mockChangeStream, "on");
        const onceEvent = jest.spyOn(mockChangeStream, "once");
        const mockCatch = jest.fn();
        const mockClose = jest.fn(() => ({ catch: mockCatch }));
        mockChangeStream.close = mockClose;
        mockChangeStream.parent = { watch: jest.fn(() => mockChangeStream) };

        const watcher = new Watcher(mockChangeStream);
        const spyClosedListener = jest.spyOn(watcher, "handleChangeStreamClosed");
        const spyCloseChangeStream = jest.spyOn(watcher as any, "closeChangeStream");
        const spyAttachEvents = jest.spyOn(watcher, "attachEvents");
        const spyEmit = jest.spyOn(watcher, "emit");

        const mockListener = jest.fn();
        watcher.on("closed", mockListener);

        it("Re-init change stream", () => {
            mockChangeStream.emit(ChangeStream.CLOSE);
            expect(spyClosedListener).toHaveBeenCalledWith();
            expect(spyCloseChangeStream).toHaveBeenCalledWith(mockChangeStream);
            expect(spyRemoveListeners).toHaveBeenCalledTimes(1);
            expect(mockClose).toHaveBeenCalledTimes(1);
            expect(mockCatch).toHaveBeenCalledTimes(1);
            expect(spyAttachEvents).toHaveBeenCalledTimes(1);
            expect(onEvent).toHaveBeenCalledWith("change", expect.any(Function));
            expect(onEvent).toHaveBeenCalledWith("error", expect.any(Function));
            expect(onceEvent).toHaveBeenCalledWith("close", expect.any(Function));
            expect(spyEmit).toHaveBeenCalledWith(Watcher.NOTIFY, "Change stream is re-initialized");
        });
    });

    describe("Error handling", () => {
        describe("[function emitError]", () => {
            const mockChangeStream: any = new EventEmitter();
            const watcher = new Watcher(mockChangeStream);

            const spyEmit = jest.spyOn(watcher, "emit").mockImplementation(() => false);
            it("Emit Error as is", () => {
                const error = new Error("1234");
                (watcher as any).emitError(error);
                expect(spyEmit).toHaveBeenCalledTimes(1);
                expect(spyEmit).toHaveBeenLastCalledWith("error", error);
            });

            it("Emit others as new Error", () => {
                const testCases = [1234, "abcd", { a: 1, b: 2 }];

                for (const testCase of testCases) {
                    (watcher as any).emitError(testCase);
                    expect(spyEmit).toHaveBeenCalledTimes(1);
                    expect(spyEmit).toHaveBeenLastCalledWith("error", expect.objectContaining({ message: stringify(testCase) }));

                    spyEmit.mockClear();
                }
            });
        });

        describe("Emit Error when handling failed", () => {
            const mockChangeStream: any = new EventEmitter();
            const watcher = new Watcher(mockChangeStream);

            const spyHandleChangeStreamChange = jest.spyOn(watcher, "handleChangeStreamChange");
            const spyHandleChangeStreamError = jest.spyOn(watcher, "handleChangeStreamError");
            const spyHandleChangeStreamClosed = jest.spyOn(watcher, "handleChangeStreamClosed");
            const spyEmit = jest.spyOn(watcher, "emit").mockImplementation(() => false);

            it("Handle CHANGE failed", async () => {
                const error = new Error("handleChangeStreamChange");
                spyHandleChangeStreamChange.mockImplementation(() => {
                    throw error;
                });

                mockChangeStream.emit("change", {});
                await waitMs(100);
                expect(spyEmit).toHaveBeenCalledTimes(1);
                expect(spyEmit).toHaveBeenLastCalledWith("error", error);
            });

            it("Handle ERROR failed", async () => {
                const error = new Error("handleChangeStreamError");
                spyHandleChangeStreamError.mockImplementation(() => {
                    throw error;
                });

                mockChangeStream.emit("error", {});
                await waitMs(100);
                expect(spyEmit).toHaveBeenCalledTimes(1);
                expect(spyEmit).toHaveBeenLastCalledWith("error", error);
            });

            it("Handle CLOSED failed", async () => {
                const error = new Error("handleChangeStreamClosed");
                spyHandleChangeStreamClosed.mockImplementation(() => {
                    throw error;
                });

                mockChangeStream.emit("close", {});
                await waitMs(100);
                expect(spyEmit).toHaveBeenCalledTimes(1);
                expect(spyEmit).toHaveBeenLastCalledWith("error", error);
            });
        });
    });
});
