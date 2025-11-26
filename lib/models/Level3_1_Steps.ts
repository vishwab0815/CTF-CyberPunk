import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILevel3_1_Step extends Document {
  phase: number; // 1, 2, or 3
  canonicalKey: string; // Expected input value
  acceptedAliases?: string[]; // Optional alternative inputs
  fragment: string; // Fragment revealed on success
  hintText?: string; // Optional hint description
  createdAt: Date;
  updatedAt: Date;
}

const Level3_1_StepSchema = new Schema<ILevel3_1_Step>(
  {
    phase: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      max: 3,
    },
    canonicalKey: {
      type: String,
      required: true,
    },
    acceptedAliases: {
      type: [String],
      default: [],
    },
    fragment: {
      type: String,
      required: true,
    },
    hintText: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
Level3_1_StepSchema.index({ phase: 1 }, { unique: true });

// Prevent model recompilation in development
const Level3_1_Step: Model<ILevel3_1_Step> =
  mongoose.models.Level3_1_Step ||
  mongoose.model<ILevel3_1_Step>('Level3_1_Step', Level3_1_StepSchema);

export default Level3_1_Step;
