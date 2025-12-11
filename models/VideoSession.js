import mongoose from 'mongoose';

const videoSessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' }, // Link to the booking session
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  counsellorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Counsellor', required: true },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number }, // in seconds
  recordingUrl: { type: String }, // URL to recorded video if any
  notes: { type: String }, // session notes
  rating: { type: Number, min: 0, max: 5 },
  feedback: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('VideoSession', videoSessionSchema);