import { FastifyReply, FastifyRequest } from "fastify";
import admin from "firebase-admin";
import UserModel, { AuthProvider } from "../models/user.model";

export class AuthController {
  static async googleSignIn(
    req: FastifyRequest<{ Body: { idToken: string } }>,
    reply: FastifyReply
  ) {
    const { idToken } = req.body;
    try {
      // 1) Verify the token
      const decoded = await admin.auth().verifyIdToken(idToken, true);
      // 2) Fetch full user record
      const fbUser = await admin.auth().getUser(decoded.uid);
      // 3) Build provider entry
      const authData = {
        provider: AuthProvider.GOOGLE,
        providerId: fbUser.uid,
        email: fbUser.email!,
        displayName: fbUser.displayName!,
        photoURL: fbUser.photoURL!,
        isVerified: fbUser.emailVerified,
        createdAt: new Date(),
      };
      // 4) Upsert user
      let user = await UserModel.findOne({
        "providers.provider": AuthProvider.GOOGLE,
        "providers.providerId": fbUser.uid,
      });
      if (user) {
        await UserModel.updateOne(
          { _id: user._id, "providers.providerId": fbUser.uid },
          {
            $set: {
              "providers.$.displayName": authData.displayName,
              "providers.$.photoURL": authData.photoURL,
              "providers.$.isVerified": authData.isVerified,
            },
          }
        );
      } else {
        user = await UserModel.create({ providers: [authData] });
      }
      // 5) Create session
      const sessionToken = await req.server.createSession(user._id.toString());
      return reply.send({
        user,
        sessionToken,
        expiresIn: 7 * 24 * 3600,
      });
    } catch (err) {
      req.log.error(err);
      return reply
        .status(401)
        .send({ error: "Invalid or expired Firebase token." });
    }
  }

  // controllers/auth.controller.ts
  static async linkPhone(
    req: FastifyRequest<{ Body: { phoneIdToken: string } }>,
    reply: FastifyReply
  ) {
    // 1) Validate session
    const { userId } = req.session; // from your session plugin
    const { phoneIdToken } = req.body;
    // 2) Verify the phone token
    const decoded = await admin.auth().verifyIdToken(phoneIdToken, true);
    // 3) Build phone provider record
    const phoneData = {
      provider: AuthProvider.PHONE,
      providerId: decoded.uid,
      phoneNumber: decoded.phone_number,
      isVerified: decoded.phone_number_verified,
      createdAt: new Date(),
    };
    // 4) Push into existing User.providers
    await UserModel.updateOne(
      { _id: userId },
      { $push: { providers: phoneData } }
    );
    return reply.send({ success: true });
  }
}
