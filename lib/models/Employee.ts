import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  employeeId: string;
  name: string;
  department: string;
  clearanceLevel: number; // 1-5 (5 is highest)
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  secretData?: string; // Hidden data (contains flag)
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    clearanceLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    secretData: String,
  },
  {
    timestamps: true,
  }
);

// Indexes (employeeId already has unique: true in schema)
EmployeeSchema.index({ name: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ clearanceLevel: 1 });

// Prevent model recompilation in development
const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
