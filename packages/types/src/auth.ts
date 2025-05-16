export enum AuthProvider {
  PHONE = "phone",
  GOOGLE = "google",
  APPLE = "apple",
}

export interface IAuthProvider {
  provider: AuthProvider;
  providerId: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  isVerified: boolean;
  createdAt: Date;
}
