import morgan from "morgan";

import { config } from "../config/index.js";
import { stream } from "./stream.js";

export const morganMiddleware = morgan(
  config.NODE_ENV === "development" ? "dev" : "combined",
  {
    stream,
  },
);