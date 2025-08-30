import { mongoose, Schema } from "@zf/common";
import { IAdmin } from "@zf/types";

const adminSchema = new Schema<IAdmin>({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'supervisor', 'super_admin'],
    required: true,
  },
  hubIds: {
    type: [String],
    required: true,
  }
},
  {
    timestamps: true,
  }
)

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);