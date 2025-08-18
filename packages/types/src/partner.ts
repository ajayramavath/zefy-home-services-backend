export interface IPartner {
  _id?: string;
  userId: string;
  personalInfo?: {
    fullName: string;
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    profilePicture?: string;
    email?: string;
    phoneNumber: string;
  };
  serviceIDs?: string[];
  operationalHubId?: string;
  availabilityId?: string;
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  verification?: {
    idProof: {
      type: 'aadhaar' | 'pan' | 'driving_license';
      number: string;
      verified: boolean;
      selfiePhoto: string;
      idFrontPhoto: string;
      idBackPhoto: string;
    };
    backgroundCheck: {
      status: 'pending' | 'completed' | 'failed';
      completedAt?: Date;
    };
  };
  completionStep: number;
  status: 'not_exists' | 'incomplete' | 'pending_approval' | 'approved' | 'rejected',
  approvedAt?: Date;
  training: {
    video: boolean;
    quiz: boolean;
  },
  ratings: {
    average: number;
    count: number;
  };
  earnings: {
    totalEarned: number;
    pendingPayout: number;
    lastPayoutDate?: Date;
  };
  createdAt?: Date;
  updatedAt?: Date;
}