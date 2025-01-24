
import * as log from "jsr:@std/log";

export function setupLogger(moduleName: string) {
    log.setup({
        handlers: {
            console: new log.ConsoleHandler("NOTSET", {
                formatter: (logRecord) => {
                    const dateTime = new Date().toLocaleString(undefined, { hour12: false });
                    return `${dateTime} ${logRecord.levelName} [${moduleName}]: ${logRecord.msg}`;
                },
            }),
        },
        loggers: {
            default: {
                level: "NOTSET",
                handlers: ["console"],
            },
        },
    });
}