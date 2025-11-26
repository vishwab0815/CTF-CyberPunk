import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFlag extends Document {
  level: string;
  flag: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FlagSchema = new Schema<IFlag>(
  {
    level: {
      type: String,
      required: true,
      unique: true,
      enum: ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '3.1', '3.2'],
    },
    flag: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Information Disclosure',
        'Client-Side Security',
        'API Security',
        'IDOR',
        'Authentication',
        'Interactive Puzzle',
        'Injection',
      ],
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    points: {
      type: Number,
      default: 100,
      min: 50,
      max: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
FlagSchema.index({ level: 1, isActive: 1 });
FlagSchema.index({ category: 1 });

const Flag: Model<IFlag> =
  mongoose.models.Flag || mongoose.model<IFlag>('Flag', FlagSchema);

export default Flag;
