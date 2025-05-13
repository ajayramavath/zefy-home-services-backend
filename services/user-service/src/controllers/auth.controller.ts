import { FastifyReply, FastifyRequest } from "fastify";
import admin from "firebase-admin";
import UserModel, { AuthProvider } from "../models/user.model";

interface RawProviderData {
  providerId: string; // e.g. "google.com"
  uid: string; // Firebase UID
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  displayName?: string;
}

interface RawFirebaseUser {
  uid: string;
  displayName?: string;
  email?: string;
  isEmailVerified: boolean;
  isAnonymous: boolean;
  metadata: {
    creationTime: string; // ISO timestamp
    lastSignInTime: string;
  };
  phoneNumber?: string | null;
  photoURL?: string;
  providerData: RawProviderData[];
  // … other fields (refreshToken, tenantId) ignored …
}

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

  static async linkPhone(
    req: FastifyRequest<{ Body: { phoneIdToken: string } }>,
    reply: FastifyReply
  ) {
    const { userId } = req.session; // from your session plugin
    const { phoneIdToken } = req.body;

    // 1) Verify the Firebase phone token
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(phoneIdToken, true);
    } catch (err) {
      req.log.warn({ err }, "Invalid or revoked phone ID token");
      return reply
        .status(401)
        .send({ error: "Invalid or expired phone token" });
    }

    // 2) Ensure the token actually came with a phone number
    if (!decoded.phone_number) {
      return reply
        .status(400)
        .send({ error: "Token does not contain a phone number" });
    }

    // 3) Prepare the provider record
    const phoneData = {
      provider: AuthProvider.PHONE,
      providerId: decoded.uid,
      phoneNumber: decoded.phone_number,
      isVerified: decoded.phone_number_verified,
      createdAt: new Date(),
    };

    // 4) Atomically add it if not already present
    const result = await UserModel.updateOne(
      { _id: userId },
      { $addToSet: { providers: phoneData } }
    );

    // 5a) No matching user ⇒ 404
    if (result.matchedCount === 0) {
      return reply.status(404).send({ error: "User not found" });
    }

    // 5b) No modification ⇒ it was already linked ⇒ 409
    if (result.modifiedCount === 0) {
      return reply
        .status(409)
        .send({ error: "This phone number is already linked to your account" });
    }

    // 6) Success
    return reply.send({ success: true });
  }
}
