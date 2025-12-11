import { useState } from 'react';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, isBefore } from 'date-fns';
import { useToast } from '../ui/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ScheduleCallProps {
  counsellorId?: string;
  onSchedule: (date: Date, email?: string) => Promise<void>;
}

export function ScheduleCall({ counsellorId, onSchedule }: ScheduleCallProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('12:00');
  const [counsellorEmail, setCounsellorEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSchedule = async () => {
    if (!date) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive'
      });
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes, 0, 0);

    // Validate the date is in the future
    if (isBefore(scheduledDate, new Date())) {
      toast({
        title: 'Error',
        description: 'Please select a future date and time',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      await onSchedule(scheduledDate, counsellorEmail);
      toast({
        title: 'Success',
        description: 'Video call scheduled successfully!',
      });
    } catch (error) {
      console.error('Error scheduling call:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule call. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-medium">Schedule a Video Call</h3>

      <div className="grid gap-4">
        {!counsellorId && (
          <div>
            <Label htmlFor="counsellor-email">Counsellor Email</Label>
            <Input
              id="counsellor-email"
              type="email"
              value={counsellorEmail}
              onChange={(e) => setCounsellorEmail(e.target.value)}
              placeholder="Enter counsellor's email"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                disabled={(date) =>
                  date < new Date() || date > addDays(new Date(), 30)
                }
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            min="09:00"
            max="18:00"
            step="900" // 15 minutes
          />
        </div>

        <Button
          onClick={handleSchedule}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Scheduling...' : 'Schedule Call'}
        </Button>
      </div>
    </div>
  );
}