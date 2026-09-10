import { useState } from 'react';

export function useVoiceNotes() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    // Timer simulation
  };

  const stopRecording = (): Promise<{ duration: string; transcript: string }> => {
    return new Promise((resolve) => {
      setIsRecording(false);
      resolve({
        duration: '0:28',
        transcript: 'Zákazník požaduje změnu materiálu zábradlí na nerezové provedení. Schváleno po telefonické dohodě.'
      });
    });
  };

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording
  };
}
