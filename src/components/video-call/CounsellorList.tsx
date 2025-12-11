import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Video, Clock, Star } from 'lucide-react';
import { useVideoCall } from '@/hooks/useVideoCall';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Counsellor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  available: boolean;
  nextAvailable?: string;
}

export function CounsellorList() {
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const { initiateCall, isCalling } = useVideoCall();

  useEffect(() => {
    const fetchCounsellors = async () => {
      try {
        const response = await fetch('/api/counsellors');
        if (!response.ok) {
          throw new Error('Failed to fetch counsellors');
        }
        const data = await response.json();
        setCounsellors(data);
      } catch (error) {
        console.error('Error fetching counsellors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounsellors();
  }, []);

  const handleCall = (counsellor: Counsellor) => {
    initiateCall(counsellor.id, counsellor.name);
  };

  const filteredCounsellors = counsellors.filter(counsellor => {
    const matchesSearch = counsellor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         counsellor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialization = specializationFilter === 'all' ||
                                 counsellor.specialization.toLowerCase().includes(specializationFilter.toLowerCase());
    return matchesSearch && matchesSpecialization;
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-40">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search counsellors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Specializations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specializations</SelectItem>
            <SelectItem value="anxiety">Anxiety</SelectItem>
            <SelectItem value="depression">Depression</SelectItem>
            <SelectItem value="stress">Stress Management</SelectItem>
            <SelectItem value="relationships">Relationships</SelectItem>
            <SelectItem value="trauma">Trauma</SelectItem>
            <SelectItem value="addiction">Addiction</SelectItem>
            <SelectItem value="career">Career Counseling</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Counsellor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCounsellors.map((counsellor) => (
          <Card key={counsellor.id} className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{counsellor.name}</CardTitle>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                  <span className="text-sm font-medium">{counsellor.rating.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{counsellor.specialization}</p>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <div className="flex items-center justify-between mb-3">
                {counsellor.available ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Available now
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {counsellor.nextAvailable
                      ? `Available ${counsellor.nextAvailable}`
                      : 'Currently unavailable'}
                  </Badge>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => handleCall(counsellor)}
                disabled={isCalling || !counsellor.available}
              >
                <Video className="mr-2 h-4 w-4" />
                {isCalling ? 'Connecting...' : 'Start Video Call'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCounsellors.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Video className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>No counsellors found matching your criteria</p>
        </div>
      )}
    </div>
  );
}