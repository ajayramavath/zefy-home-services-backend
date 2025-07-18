export interface IPartner {
  _id?: string;
  userId: string; // Reference to user collection
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    profilePicture?: string;
  };
  contact: {
    phone: string;
    email?: string;
    emergencyContact?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
  };
  services: string[]; // Array of service IDs
  operationalHubs: string[]; // Array of hub IDs
  availability: {
    isAvailable: boolean;
    workingDays: number[]; // 0-6 (Sunday to Saturday)
    workingHours: {
      start: string; // "09:00"
      end: string; // "18:00"
    };
    unavailableDates?: Date[];
  };
  verification: {
    idProof: {
      type: 'aadhaar' | 'pan' | 'driving_license';
      number: string;
      verified: boolean;
      frontPhoto: string;
      backPhoto: string;
    };
    backgroundCheck: {
      status: 'pending' | 'completed' | 'failed';
      completedAt?: Date;
    };
  };
  ratings: {
    average: number;
    count: number;
  };
  earnings: {
    totalEarned: number;
    pendingPayout: number;
    lastPayoutDate?: Date;
  };
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  joinedAt: Date;
  lastActiveAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}