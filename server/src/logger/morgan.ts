import morgan from "morgan";

import { config } from "../config";
import { stream } from "./stream";

export const morganMiddleware = morgan(
  config.NODE_ENV === "development" ? "dev" : "combined",
  {
    stream,
  },
);