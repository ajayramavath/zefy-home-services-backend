import Fastify from "fastify";
import "dotenv/config";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = Fastify({ logger: true });

