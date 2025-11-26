import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILevel3_1_Progress extends Document {
  userId: mongoose.Types.ObjectId;
  completedPhases: number[]; // Array of phase numbers (1, 2, 3)
  currentPhase: number; // Current phase (1-3)
  attempts: {
    phase: number;
    input: string;
    success: boolean;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
  }[];
  fragments: string[]; // Collected fragments
  rateLimiting: {
    attemptCount: number;
    windowStart: Date;
    lockoutUntil?: Date;
  };
  startTime: Date;
  completionTime?: Date;
  timeTaken?: number;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const Level3_1_ProgressSchema = new Schema<ILevel3_1_Progress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedPhases: {
      type: [Number],
      default: [],
    },
    currentPhase: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
    attempts: [
      {
        phase: { type: Number, required: true },
        input: { type: String, required: true },
        success: { type: Boolean, required: true },
        timestamp: { type: Date, default: Date.now },
        ipAddress: String,
        userAgent: String,
      },
    ],
    fragments: {
      type: [String],
      default: [],
    },
    rateLimiting: {
      attemptCount: { type: Number, default: 0 },
      windowStart: { type: Date, default: Date.now },
      lockoutUntil: Date,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    completionTime: Date,
    timeTaken: Number,
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
Level3_1_ProgressSchema.index({ userId: 1 }, { unique: true });
Level3_1_ProgressSchema.index({ completedPhases: 1 });
Level3_1_ProgressSchema.index({ currentPhase: 1 });
Level3_1_ProgressSchema.index({ 'rateLimiting.lockoutUntil': 1 });

// Prevent model recompilation in development
const Level3_1_Progress: Model<ILevel3_1_Progress> =
  mongoose.models.Level3_1_Progress ||
  mongoose.model<ILevel3_1_Progress>('Level3_1_Progress', Level3_1_ProgressSchema);

export default Level3_1_Progress;
