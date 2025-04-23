import fp from "fastify-plugin";
import mongoose from "mongoose";

export default fp(async (app, opts: { uri: string }) => {
  const { uri } = opts;
  await mongoose.connect(uri);

  app.addHook("onClose", async () => {
    await mongoose.disconnect();
  });
});
