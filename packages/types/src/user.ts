export interface IUser {
  _id: string;
  fullName?: string;
  gender?: "male" | "female" | "other";
  dateOfBirth?: Date;
  email?: string;
  phoneNumber: string;
  phoneNumberVerified: boolean;
  role: 'admin' | 'user' | 'partner';
  addressIds: string[];

  createdAt?: Date;
  updatedAt?: Date;
}
