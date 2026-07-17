import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./logger/index.js";

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info("======================================");
  logger.info("🚀 Hospital Management Server Started");
  logger.info(`🌐 Server : http://localhost:${PORT}`);
  logger.info(`📅 Started: ${new Date().toLocaleString()}`);
  logger.info(`🌍 Environment: ${config.NODE_ENV}`);
  logger.info(
    `📡 API Base URL: http://localhost:${PORT}${config.API_PREFIX}/${config.API_VERSION}`,
  );
  logger.info("======================================");
});