import mongoose from 'mongoose';

const courseReviewSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Ensure one review per user per course
courseReviewSchema.index({ course: 1, user: 1 }, { unique: true });

export default mongoose.model('CourseReview', courseReviewSchema);
