import { ErrorListener, MaybePromise, RestKeys, TypedEventEmitter } from "@ldb/types";
import { stringify } from "@ldb/utils";

const Event = {
    FIRE: "FIRE",
    ERROR: "ERROR",
} as const;

export type FireListener = () => MaybePromise<void>;
export type FireEventListener = (event: SchedulerKeys) => MaybePromise<void>;
type SchedulerEvents = Record<string, FireListener> &
    Record<typeof Event.FIRE, FireEventListener> &
    Record<typeof Event.ERROR, ErrorListener>;
type SchedulerKeys = RestKeys<SchedulerEvents, (typeof Event)[keyof typeof Event]>;
export type SchedulerValue = [number, number];
export type SchedulerConfigs = Record<SchedulerKeys, number | SchedulerValue>;

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

    private readonly boundFire = (event: SchedulerKeys) => this.fire(event);
    private configs: Map<SchedulerKeys, SchedulerValue> = new Map();
    private timeouts: Map<SchedulerKeys, NodeJS.Timeout> = new Map();

    constructor(eventConfigs: SchedulerConfigs) {
        super();

        if (!eventConfigs || typeof eventConfigs !== "object") {
            Scheduler.throw("Scheduler", `Invalid constructor parameter: ${stringify(eventConfigs)}`);
        }

        for (const event in eventConfigs) {
            if (!eventConfigs.hasOwnProperty(event)) {
                continue;
            }
            const value = eventConfigs[event];
            const config = Scheduler.parseConfigValue(value);
            this.configs.set(event, config);
            this.schedule(event, config);
        }
    }

    abort(event: SchedulerKeys) {
        const lastTimeout = this.timeouts.get(event);
        clearTimeout(lastTimeout);
    }

    private schedule(event: SchedulerKeys, config: SchedulerValue) {
        this.abort(event);

        const nextSchedule = Scheduler.nextScheduleTimeout(config);
        this.timeouts.set(event, setTimeout(this.boundFire, nextSchedule, event));
    }

    private fire(event: SchedulerKeys) {
        this.emit(event);
        this.emit("FIRE", event);

        const config = this.configs.get(event) ?? Scheduler.throw(event, "[config] cannot be null");
        this.schedule(event, config);
    }
}
