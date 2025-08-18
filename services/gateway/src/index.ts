import Fastify from "fastify";
import routes from "./routes";
import "dotenv/config";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = Fastify({
  logger: {
    level: 'info',
  }
});

app.register(routes);

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`🚪 Gateway listening on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
