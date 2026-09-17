import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

const isTty = process.stdout.isTTY;

export const logger = pino(
  isTty
    ? {
        level,
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      }
    : { level },
);

export function stageLogger(stage: string) {
  return logger.child({ stage });
}
