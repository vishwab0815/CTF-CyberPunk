import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  teamName: string;
  isAdmin: boolean;
  startTime: Date | null;
  endTime: Date | null;
  totalTime: number;
  currentLevel: string;
  completedLevels: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    teamName: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [3, 'Team name must be at least 3 characters'],
      maxlength: [50, 'Team name must not exceed 50 characters'],
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    totalTime: {
      type: Number,
      default: 0,
    },
    currentLevel: {
      type: String,
      default: '1.1',
    },
    completedLevels: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes (email index is created automatically by unique: true)
UserSchema.index({ teamName: 1 });
UserSchema.index({ totalTime: 1 });
UserSchema.index({ completedLevels: 1 });

// Prevent model recompilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
