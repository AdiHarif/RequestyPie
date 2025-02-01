
import * as log from "jsr:@std/log";

export function setupLogger(moduleName: string) {
    log.setup({
        handlers: {
            console: new log.ConsoleHandler("NOTSET", {
                formatter: (logRecord) => {
                    const dateTime = new Date().toLocaleString(undefined, { hour12: false });
                    let message = `${dateTime} ${logRecord.levelName} [${moduleName}]: ${logRecord.msg}`;
                    if (logRecord.args.length > 0) {
                        message += ` (${logRecord.args.join(" ")})`;
                    }
                    return message;
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