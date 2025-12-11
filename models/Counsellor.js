import mongoose from 'mongoose';

const counsellorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialization: { type: String, required: true },
  credentials: { type: String, required: true },
  bio: { type: String, required: true },
  experience: { type: String },
  phone: { type: String },
  isApproved: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  availability: [{
    day: String,
    startTime: String,
    endTime: String,
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Counsellor', counsellorSchema);