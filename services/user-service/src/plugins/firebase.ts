// services/user-service/src/plugins/firebase.ts
import fp from "fastify-plugin";
import admin from "firebase-admin";
import { readFileSync } from "fs";

export default fp(async (app) => {
  // 1) Read the env var directly
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS");
  }

  // 2) Load and parse the JSON
  const serviceAccount = JSON.parse(readFileSync(credPath, "utf-8"));

  // 3) Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // optionally: projectId: process.env.FIREBASE_PROJECT_ID
  });

  app.decorate("firebaseAuth", admin.auth());
});
