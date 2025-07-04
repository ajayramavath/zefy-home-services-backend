import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import routes from "./routes";
import "dotenv/config";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = Fastify({ logger: true });

app.register(routes);

// Generate the OpenAPI spec
app.register(swagger, {
  openapi: {
    info: {
      title: "Zefy Backend API",
      description: "Gateway endpoints",
      version: "1.0.0",
    },
    servers: [{ url: "/", description: "Local dev" }],
  },

  // you can also pass `refResolver`, `security`, `components`, etc.
});

app.register(swaggerUI, {
  routePrefix: "/docs", // host the interactive UI at /docs
  uiConfig: {
    docExpansion: "none",
    deepLinking: false,
    url: "http://34.93.7.140",
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  // if you need to tweak the generated spec before UI renders, use:
  // transformSpecification: (swaggerObject, req, reply) => { …; return swaggerObject; },
});

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
