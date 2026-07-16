import { logger } from "./index";

export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};