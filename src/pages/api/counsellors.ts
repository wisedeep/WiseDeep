import { Request, Response } from 'express';
import User from '../../../models/User.js';
import Counsellor from '../../../models/Counsellor.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all approved counsellors with their profiles
    const counsellors = await Counsellor.find({ isApproved: true })
      .populate('user', 'firstName lastName email specialization rating')
      .sort('user.firstName');

    // Format the response
    const formattedCounsellors = counsellors.map(counsellor => ({
      id: counsellor.user._id,
      name: `${counsellor.user.firstName} ${counsellor.user.lastName}`,
      specialization: counsellor.specialization || counsellor.user.specialization || 'Mental Health Counsellor',
      rating: counsellor.rating || counsellor.user.rating || 4.5,
      available: counsellor.availability?.some(slot =>
        slot.day === new Date().getDay() &&
        slot.startTime <= new Date().toTimeString().slice(0, 5) &&
        slot.endTime >= new Date().toTimeString().slice(0, 5)
      ) || false,
      nextAvailable: counsellor.availability?.[0]?.startTime || null,
    }));

    res.status(200).json(formattedCounsellors);
  } catch (error) {
    console.error('Error fetching counsellors:', error);
    res.status(500).json({ message: 'Failed to fetch counsellors' });
  }
}