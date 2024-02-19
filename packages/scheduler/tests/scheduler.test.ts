import { jest } from "@jest/globals";
import { waitMs } from "@ldb/utils";
import { FireEventListener, FireListener, Scheduler, SchedulerConfigs } from "../src";

afterEach(() => {
    jest.resetAllMocks();
});

describe("[class Scheduler]", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TestScheduler: any = Scheduler;

    describe("Static functions", () => {
        describe("[function throw]", () => {
            it("throws error", () => {
                expect(() => TestScheduler.throw("unit", "test")).toThrowError();
            });
        });

        describe("[function parseConfigValue]", () => {
            it("Input number > add msOffset = 0", () => {
                expect(TestScheduler.parseConfigValue(1234)).toEqual([1234, 0]);
            });
            it("Input not array > throws error", () => {
                const invalidTypes = [null, "string", undefined, {}, true];

                for (const testcase of invalidTypes) {
                    expect(() => TestScheduler.parseConfigValue(testcase)).toThrowError();
                }
            });
            it("Input valid array > return tuple", () => {
                const validInputs = [
                    [1234, 4321],
                    [1234, 4321, 1],
                    [1234, 4321, true],
                    [1234, 4321, "string"],
                    [1234, 4321, null],
                    [1234, 4321, undefined],
                    [1234, 4321, {}],
                ];

                for (const testcase of validInputs) {
                    expect(TestScheduler.parseConfigValue(testcase)).toEqual([1234, 4321]);
                }
            });
            it("Input invalid array > throws error", () => {
                const invalidInputs = [
                    [1234, true],
                    [1234, null],
                    [1234, undefined],
                    [1234, {}],
                    [1234, "string"],
                    [true, 4321],
                    [null, 4321],
                    [undefined, 4321],
                    [{}, 4321],
                    ["string", 4321],
                    [null, "string"],
                    [undefined, true],
                ];

                for (const testcase of invalidInputs) {
                    expect(() => TestScheduler.parseConfigValue(testcase)).toThrowError();
                }
            });
        });

        describe("[function nextScheduleTimeout]", () => {
            it("No offset", () => {
                const spyDateNow = jest.spyOn(Date, "now");

                const testCases = [
                    [1683004991000, 24 * 3_600_000, 67_009_000], // 2023-05-02T05:23:11Z
                    [1683072000000, 24 * 3_600_000, 86_400_000], // 2023-05-03T00:00:00Z
                    [1683219600000, 24 * 3_600_000, 25_200_000], // 2023-05-04T17:00:00Z
                    [1683219599000, 24 * 3_600_000, 25_201_000], // 2023-05-04T16:59:59Z
                ];

                for (const [mockValue, period, result] of testCases) {
                    spyDateNow.mockReturnValue(mockValue);
                    expect(TestScheduler.nextScheduleTimeout([period, 0])).toEqual(result);
                    spyDateNow.mockReset();
                }

                spyDateNow.mockRestore();
            });
            it("With offset", () => {
                const spyDateNow = jest.spyOn(Date, "now");

                const testCases = [
                    [1683004991000, 24 * 3_600_000, 7 * 3_600_000, 41_809_000], // 2023-05-02T05:23:11Z
                    [1683072000000, 24 * 3_600_000, 7 * 3_600_000, 61_200_000], // 2023-05-03T00:00:00Z
                    [1683219600000, 24 * 3_600_000, 7 * 3_600_000, 86_400_000], // 2023-05-04T17:00:00Z
                    [1683219599000, 24 * 3_600_000, 7 * 3_600_000, 1_000], // 2023-05-04T16:59:59Z
                ];

                for (const [mockValue, period, offset, result] of testCases) {
                    spyDateNow.mockReturnValue(mockValue);
                    const timeout = TestScheduler.nextScheduleTimeout([period, offset]);
                    expect(timeout).toEqual(result);
                    spyDateNow.mockReset();
                }

                spyDateNow.mockRestore();
            });
        });
    });

    describe("Instance functions", () => {
        describe("[function abort]", () => {
            const testInstance = new TestScheduler({});
            const spyClearTimeout = jest.spyOn(global, "clearTimeout");

            it("Invalid event", () => {
                testInstance.abort("invalidEvent");

                expect(spyClearTimeout).toHaveBeenCalledTimes(1);
                expect(spyClearTimeout).toHaveBeenLastCalledWith(undefined);
            });

            it("Valid event", () => {
                testInstance.timeouts.set("unit-test", { mock: "object" });
                testInstance.abort("unit-test");

                expect(spyClearTimeout).toHaveBeenCalledTimes(1);
                expect(spyClearTimeout).toHaveBeenLastCalledWith({ mock: "object" });
            });
        });

        describe("[function schedule]", () => {
            const testInstance = new TestScheduler({});

            it("calls Scheduler.nextScheduleTimeout", () => {
                const spyNextSchedule = jest.spyOn(TestScheduler, "nextScheduleTimeout").mockImplementation(() => 1111);
                testInstance.schedule("unit-test", [1122, 3344]);

                expect(spyNextSchedule).toHaveBeenCalledTimes(1);
                expect(spyNextSchedule).toHaveBeenLastCalledWith([1122, 3344]);
            });

            it("create Timeout", () => {
                const spySetTimeout = jest.spyOn(global, "setTimeout").mockImplementation(() => ({ mock: "timeout" } as never));
                testInstance.schedule("unit-test", [1111, 2222]);

                expect(spySetTimeout).toHaveBeenCalledTimes(1);
                expect(testInstance.timeouts.get("unit-test")).toEqual({ mock: "timeout" });
            });
        });

        describe("[function fire]", () => {
            const testInstance = new TestScheduler({});

            it("Fire valid event", () => {
                testInstance.configs.set("unit-test", [3333, 4444]);
                const spyEmit = jest.spyOn(testInstance, "emit");
                const spySchedule = jest.spyOn(testInstance, "schedule").mockImplementation(() => null);

                testInstance.fire("unit-test");

                expect(spyEmit).toHaveBeenCalledTimes(2);
                expect(spyEmit).toHaveBeenNthCalledWith(1, "unit-test");
                expect(spyEmit).toHaveBeenNthCalledWith(2, Scheduler.FIRE, "unit-test");
                expect(spySchedule).toHaveBeenCalledTimes(1);
                expect(spySchedule).toHaveBeenLastCalledWith("unit-test", [3333, 4444]);
            });

            it("Fire invalid event", () => {
                const spyEmit = jest.spyOn(testInstance, "emit");
                const spySchedule = jest.spyOn(testInstance, "schedule").mockImplementation(() => null);

                expect(() => testInstance.fire("non-existent")).toThrowError();

                expect(spyEmit).toHaveBeenCalledTimes(2);
                expect(spyEmit).toHaveBeenNthCalledWith(1, "non-existent");
                expect(spyEmit).toHaveBeenNthCalledWith(2, Scheduler.FIRE, "non-existent");
                expect(spySchedule).toHaveBeenCalledTimes(0);
            });
        });
    });

    describe("Fire periodically", () => {
        it("number config", async () => {
            const event = "thousandMs" as const;
            const schedulerConfig = { [event]: 1_000 };
            const spySchedule = jest.spyOn(TestScheduler.prototype, "schedule");
            const scheduler = new Scheduler(schedulerConfig);

            const mockFireListener = jest.fn<FireListener>();
            const mockFireEventListener = jest.fn<FireEventListener>();
            scheduler.addListener(event, mockFireListener);
            scheduler.addListener(Scheduler.FIRE, mockFireEventListener);

            await waitMs(5_000);
            scheduler.abort(event);

            expect(spySchedule).toHaveBeenCalledWith(event, [1_000, 0]);
            expect(mockFireListener).toHaveBeenCalledTimes(5);
            expect(mockFireListener).toHaveBeenLastCalledWith();
            expect(mockFireEventListener).toHaveBeenCalledTimes(5);
            expect(mockFireEventListener).toHaveBeenLastCalledWith(event);
        }, 10_000);
        it("array config", async () => {
            const event = "thousandMs" as const;
            const schedulerConfig = { [event]: [1_000, 10] } satisfies SchedulerConfigs;
            const spySchedule = jest.spyOn(TestScheduler.prototype, "schedule");
            const scheduler = new Scheduler(schedulerConfig);

            const mockFireListener = jest.fn<FireListener>();
            const mockFireEventListener = jest.fn<FireEventListener>();
            scheduler.addListener(event, mockFireListener);
            scheduler.addListener(Scheduler.FIRE, mockFireEventListener);

            await waitMs(3_030);
            scheduler.abort(event);

            expect(spySchedule).toHaveBeenCalledWith(event, [1_000, 10]);
            expect(mockFireListener).toHaveBeenCalledTimes(3);
            expect(mockFireListener).toHaveBeenLastCalledWith();
            expect(mockFireEventListener).toHaveBeenCalledTimes(3);
            expect(mockFireEventListener).toHaveBeenLastCalledWith(event);
        }, 10_000);
    });

    describe("Invalid states", () => {
        it("Invalid constructor parameter", () => {
            const invalidTypes = [null, "string", 1234, undefined];
            const spyThrow = jest.spyOn(TestScheduler, "throw");

            for (const testcase of invalidTypes) {
                try {
                    new TestScheduler(testcase);
                } catch (error) {}

                expect(spyThrow).toHaveBeenCalledTimes(1);
                expect(spyThrow).toHaveBeenLastCalledWith("Scheduler", expect.stringContaining("constructor parameter:"));

                spyThrow.mockClear();
            }
        });

        it("Invalid values' type", () => {
            const invalidValueTypes = [
                { nullValue: null },
                { stringValue: "string" },
                { undefinedValue: undefined },
                { booleanValue: true },
            ];
            const spyThrow = jest.spyOn(TestScheduler, "throw");

            for (const testcase of invalidValueTypes) {
                try {
                    new TestScheduler(testcase);
                } catch (error) {}

                expect(spyThrow).toHaveBeenCalledTimes(1);
                expect(spyThrow).toHaveBeenLastCalledWith("parseConfigValue", expect.stringContaining("config type:"));

                spyThrow.mockClear();
            }
        });

        it("Invalid values", () => {
            const invalidValues = [
                { nullValue: [null, null] },
                { nullValue: [1_000, null] },
                { nullValue: [null, 1_000] },
                { undefinedValue: [undefined, undefined] },
                { undefinedValue: [undefined, 1_000] },
                { undefinedValue: [1_000, undefined] },
                { stringValue: ["1234", "4321"] },
                { stringValue: [1234, "4321"] },
                { stringValue: ["1234", 4321] },
                { booleanValue: [true, false] },
                { booleanValue: [1, false] },
                { booleanValue: [true, 0] },
            ];

            const spyThrow = jest.spyOn(TestScheduler, "throw");
            for (const testcase of invalidValues) {
                try {
                    new TestScheduler(testcase);
                } catch (error) {}

                expect(spyThrow).toHaveBeenCalledTimes(1);
                expect(spyThrow).toHaveBeenLastCalledWith("parseConfigValue", expect.stringContaining("config value:"));

                spyThrow.mockClear();
            }
        });

        it("Input has parent prototype", () => {
            const parent = { parent: 9876 };
            const testCase = Object.assign(Object.create(parent), { own: 6789 });

            const spySchedule = jest.spyOn(TestScheduler.prototype, "schedule");
            const scheduler = new TestScheduler(testCase);
            scheduler.abort("own");

            expect(spySchedule).toHaveBeenCalledTimes(1);
            expect(spySchedule).toHaveBeenLastCalledWith("own", [6789, 0]);
        });
    });
});
