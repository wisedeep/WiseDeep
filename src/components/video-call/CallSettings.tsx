import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Settings } from 'lucide-react';

export function CallSettings() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [videoResolution, setVideoResolution] = useState('hd');
  const [audioVolume, setAudioVolume] = useState(100);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);

        const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
        const audioInputDevices = deviceList.filter(device => device.kind === 'audioinput');
        const audioOutputDevices = deviceList.filter(device => device.kind === 'audiooutput');

        setVideoDevices(videoDevices);
        setAudioInputDevices(audioInputDevices);
        setAudioOutputDevices(audioOutputDevices);

        // Set default devices
        if (videoDevices.length > 0) {
          setSelectedVideoDevice(videoDevices[0].deviceId);
        }
        if (audioInputDevices.length > 0) {
          setSelectedAudioInput(audioInputDevices[0].deviceId);
        }
        if (audioOutputDevices.length > 0) {
          setSelectedAudioOutput(audioOutputDevices[0].deviceId);
        }

        setHasPermission(true);
      } catch (error) {
        console.error('Error getting devices:', error);
        setHasPermission(false);
      }
    };

    getDevices();
  }, []);

  const handleVideoDeviceChange = (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    // Update video track with new device
    // This would be implemented based on your WebRTC setup
  };

  const handleAudioInputChange = (deviceId: string) => {
    setSelectedAudioInput(deviceId);
    // Update audio input track with new device
  };

  const handleAudioOutputChange = (deviceId: string) => {
    setSelectedAudioOutput(deviceId);
    // Update audio output device
    if ('setSinkId' in HTMLMediaElement.prototype) {
      const elements = document.querySelectorAll('audio, video');
      elements.forEach(element => {
        (element as HTMLMediaElement).setSinkId(deviceId);
      });
    }
  };

  const handleVideoResolutionChange = (resolution: string) => {
    setVideoResolution(resolution);
    // Update video constraints based on resolution
    // This would be implemented in your WebRTC setup
  };

  const handleAudioVolumeChange = (value: number[]) => {
    setAudioVolume(value[0]);
    // Update audio volume
    const audioElements = document.querySelectorAll('audio, video');
    audioElements.forEach(element => {
      (element as HTMLAudioElement).volume = value[0] / 100;
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Call Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Video Settings */}
          <div className="space-y-2">
            <h3 className="font-medium">Video</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Camera</label>
              <Select
                value={selectedVideoDevice}
                onValueChange={handleVideoDeviceChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Resolution</label>
              <Select
                value={videoResolution}
                onValueChange={handleVideoResolutionChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sd">Standard Definition (SD)</SelectItem>
                  <SelectItem value="hd">High Definition (HD)</SelectItem>
                  <SelectItem value="fullHd">Full HD (1080p)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="space-y-2">
            <h3 className="font-medium">Audio</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Microphone</label>
              <Select
                value={selectedAudioInput}
                onValueChange={handleAudioInputChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioInputDevices.map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${audioInputDevices.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Speaker</label>
              <Select
                value={selectedAudioOutput}
                onValueChange={handleAudioOutputChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent>
                  {audioOutputDevices.map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker ${audioOutputDevices.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Volume: {audioVolume}%</label>
              <Slider
                value={[audioVolume]}
                onValueChange={handleAudioVolumeChange}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}