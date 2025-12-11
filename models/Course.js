import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  fileId: { type: String, required: true },
  duration: { type: Number, default: 0 },
  thumbnail: { type: String },
  width: { type: Number },
  height: { type: Number },
  size: { type: Number },
  format: { type: String }
}, { _id: false });

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  video: { type: videoSchema },
  pdf: {
    url: { type: String },
    fileId: { type: String },
    fileName: { type: String },
    size: { type: Number }
  },
  duration: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  isFree: { type: Boolean, default: false }
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  instructor: { type: String, default: '' },
  duration: { type: String, default: '' },
  thumbnail: { type: String },
  modules: [moduleSchema],
  enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublished: { type: Boolean, default: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorRole: {
    type: String,
    enum: ['counsellor', 'admin'],
    required: true
  },
  counsellor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Counsellor'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Admin-created courses are auto-approved
  },
  approvalNote: { type: String },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: { type: Date },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Course', courseSchema);