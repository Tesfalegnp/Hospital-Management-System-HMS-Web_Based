import { logger } from "./index.js";

export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};