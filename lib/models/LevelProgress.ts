import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILevelProgress extends Document {
  userId: mongoose.Types.ObjectId;
  level: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startTime: Date | null;
  completionTime: Date | null;
  timeTaken: number;
  attempts: number;
  hintsUsed: number;
  lastAttempt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LevelProgressSchema = new Schema<ILevelProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    level: {
      type: String,
      required: true,
      enum: ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '3.1', '3.2'],
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    startTime: {
      type: Date,
      default: null,
    },
    completionTime: {
      type: Date,
      default: null,
    },
    timeTaken: {
      type: Number,
      default: 0,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    hintsUsed: {
      type: Number,
      default: 0,
    },
    lastAttempt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique user-level combination
LevelProgressSchema.index({ userId: 1, level: 1 }, { unique: true });
LevelProgressSchema.index({ status: 1 });
LevelProgressSchema.index({ completionTime: -1 });

const LevelProgress: Model<ILevelProgress> =
  mongoose.models.LevelProgress ||
  mongoose.model<ILevelProgress>('LevelProgress', LevelProgressSchema);

export default LevelProgress;
