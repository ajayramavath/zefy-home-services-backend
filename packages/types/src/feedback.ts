export interface IFeedback {
  _id: string;
  user: {
    id: string;
    name: string;
    profilePhoto?: string;
  }
  partnerId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}