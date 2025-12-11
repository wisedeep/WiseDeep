import { ScheduleCall } from '@/components/video-call/ScheduleCall';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/AuthContext';

export default function ScheduleCallPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleScheduleCall = async (date: Date, counsellorEmail?: string) => {
    try {
      // In a real app, you would call the API to schedule the call
      console.log('Scheduling call:', { date, counsellorEmail });

      toast({
        title: 'Call Scheduled',
        description: `Your call has been scheduled for ${date.toLocaleString()}`,
      });

      navigate('/user/dashboard');
    } catch (error) {
      console.error('Error scheduling call:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule call. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Schedule a Call</h1>
        <p className="text-muted-foreground">
          Book a video counselling session at your preferred time
        </p>
      </div>

      <ScheduleCall onSchedule={handleScheduleCall} />
    </div>
  );
}