import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubmission extends Document {
  userId: mongoose.Types.ObjectId;
  teamName: string;
  level: string;
  flag: string;
  isCorrect: boolean;
  attemptNumber: number;
  timeTaken: number;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teamName: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
      enum: ['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '3.1', '3.2'],
    },
    flag: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    timeTaken: {
      type: Number,
      required: true,
      default: 0,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Create indexes for efficient queries
SubmissionSchema.index({ userId: 1, level: 1 });
SubmissionSchema.index({ level: 1, isCorrect: 1 });
SubmissionSchema.index({ createdAt: -1 });
SubmissionSchema.index({ teamName: 1 });

const Submission: Model<ISubmission> =
  mongoose.models.Submission || mongoose.model<ISubmission>('Submission', SubmissionSchema);

export default Submission;
