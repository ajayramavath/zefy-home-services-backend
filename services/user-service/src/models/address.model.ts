import { mongoose, Schema } from "@zf/common";
import { IAddress } from "@zf/types";


const AddressSchema = new Schema<IAddress>({
  hubId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  label: {
    type: String,
    required: true,
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  googleMapsShortAddress: {
    type: String,
    required: true,
  },
  googleMapsLongAddress: {
    type: String,
    required: true,
  },
  house_number: {
    type: String,
    required: true,
  },
  road: {
    type: String,
    required: true,
  },
  landmark: {
    type: String,
  },
  bedrooms: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },
  bathrooms: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },
  balconies: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },
  contact_phone_number: {
    type: String,
    required: true,
  },
  contact_name: {
    type: String,
    required: true,
  },
},
  {
    timestamps: true,
  }
)

export const Address = mongoose.model<IAddress>("Address", AddressSchema);