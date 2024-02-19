import { ErrorListener, MaybePromise, TypedEventEmitter } from "@ldb/types";
import { stringify } from "@ldb/utils";

const Event = {
    FIRE: "FIRE",
    ERROR: "ERROR",
} as const;

export type FireListener = (event: string) => MaybePromise<void>;

export type SchedulerValue = [number, number];
export type SchedulerConfigs = { [k: string]: number | SchedulerValue };

type SchedulerEvents = {
    [Event.ERROR]: ErrorListener;
    [Event.FIRE]: FireListener;
};

export class Scheduler extends TypedEventEmitter<SchedulerEvents> {
    static readonly FIRE = Event.FIRE;
    static readonly ERROR = Event.ERROR;

    private static throw(event: string, errorMessage: string): never {
        throw new Error(`@${event} - ${errorMessage}`);
    }

    private static parseConfigValue(value: number | SchedulerValue): SchedulerValue {
        if (typeof value === "number") {
            return [value, 0];
        }

        if (!(value instanceof Array)) {
            Scheduler.throw("parseConfigValue", `Invalid scheduler config type: ${stringify(value, false)}`);
        }

        const [msPeriod, msOffset] = value;

        if (typeof msPeriod === "number" && typeof msOffset === "number") {
            return [msPeriod, msOffset];
        }

        Scheduler.throw("parseConfigValue", `Invalid scheduler config value: ${stringify(value, false)}`);
    }

    private static nextScheduleTimeout(config: SchedulerValue): number {
        const [msPeriod, msOffset] = config;
        const nextScheduleTimeout: number = (Math.floor((Date.now() + msOffset) / msPeriod) + 1) * msPeriod - msOffset;
        return nextScheduleTimeout - Date.now();
    }

    private readonly boundFire: FireListener = (event: string) => this.fire(event);
    private configs: Map<string, SchedulerValue> = new Map();
    private timeouts: Map<string, NodeJS.Timeout> = new Map();

    constructor(eventConfigs: SchedulerConfigs) {
        super();

        if (!eventConfigs || typeof eventConfigs !== "object") {
            Scheduler.throw("Scheduler", `Invalid constructor parameter: ${stringify(eventConfigs)}`);
        }

        for (const [event, value] of Object.entries(eventConfigs)) {
            const config = Scheduler.parseConfigValue(value);
            this.configs.set(event, config);
            this.schedule(event, config);
        }
    }

    abort(event: string) {
        const lastTimeout = this.timeouts.get(event);
        clearTimeout(lastTimeout);
    }

    private schedule(event: string, config: SchedulerValue) {
        this.abort(event);

        const nextSchedule = Scheduler.nextScheduleTimeout(config);
        this.timeouts.set(event, setTimeout(this.boundFire, nextSchedule, event));
    }

    private fire(event: string) {
        this.emit(Scheduler.FIRE, event);

        const config = this.configs.get(event) ?? Scheduler.throw(event, "[config] cannot be null");
        this.schedule(event, config);
    }
}
