export interface IAdmin {
  _id?: string;
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'supervisor' | 'super_admin';
  hubIds: string[];

  createdAt?: Date;
  updatedAt?: Date;
}