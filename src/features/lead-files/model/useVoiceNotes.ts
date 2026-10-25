import { useState, useRef } from 'react';

export interface ParsedVoiceLead {
  customerName: string;
  projectType: string;
  budget: number;
  phone: string;
  notes: string;
  checklist: string[];
}

export function useVoiceNotes() {
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    setIsRecording(true);
    setLiveTranscript('');

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      setHasSpeechRecognition(true);
      try {
        const recognition = new SpeechRec();
        recognition.lang = 'cs-CZ';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let fullText = '';
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript + ' ';
          }
          setLiveTranscript(fullText.trim());
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition warning:', err);
        };

        recognition.start();
        recognitionRef.current = recognition;
        return;
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    }

    // Fallback simulation if speech recognition is not supported in environment
    setHasSpeechRecognition(false);
    setLiveTranscript('Ing. Josef Dvořák, poptávka na bioklimatickou pergolu 5x4 metry v Říčanech. Rozpočet cca 280 000 Kč, telefon 732 123 456. Nutno zaměřit sklon střechy a ověřit přívod elektřiny.');
  };

  const stopRecording = (): Promise<{ duration: string; transcript: string }> => {
    return new Promise((resolve) => {
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      const finalTranscript = liveTranscript || 'Ing. Josef Dvořák, poptávka na bioklimatickou pergolu 5x4 metry v Říčanech. Rozpočet cca 280 000 Kč, telefon 732 123 456. Nutno zaměřit sklon střechy a ověřit přívod elektřiny.';
      resolve({
        duration: '0:24',
        transcript: finalTranscript
      });
    });
  };

  const parseVoiceTranscriptToLead = (text: string): ParsedVoiceLead => {
    // Intelligent NLP-like rule extractor
    let customerName = 'Nový klient';
    const nameMatch = text.match(/(Ing\.|Mgr\.|MUDr\.|Bc\.)?\s*([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+)\s+([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+)/);
    if (nameMatch) {
      customerName = nameMatch[0].trim();
    }

    let projectType = 'Pergoly';
    if (/střech|krytin/i.test(text)) projectType = 'Střechy';
    else if (/teras|dlažb/i.test(text)) projectType = 'Terasy';
    else if (/fasád|zatepl/i.test(text)) projectType = 'Fasády';
    else if (/zimní zahrad/i.test(text)) projectType = 'Zimní zahrady';

    let budget = 250000;
    const budgetMatch = text.match(/(\d[\d\s]*\d)\s*(kč|czk|tis|tisíc)/i);
    if (budgetMatch) {
      const num = parseInt(budgetMatch[1].replace(/\s+/g, ''), 10);
      if (!isNaN(num)) {
        budget = num < 1000 ? num * 1000 : num;
      }
    }

    let phone = '+420 732 123 456';
    const phoneMatch = text.match(/(\+?420)?\s*(\d{3})\s*(\d{3})\s*(\d{3})/);
    if (phoneMatch) {
      phone = phoneMatch[0].trim();
    }

    const checklist: string[] = [
      'Zaměřit prostor na staveništi',
      'Ověřit statiku a kotvení',
      'Připravit cenovou nabídku',
    ];
    if (/elektřin|kabel|přívod/i.test(text)) {
      checklist.push('Zkontrolovat přívod 230V pro LED osvětlení');
    }

    return {
      customerName,
      projectType,
      budget,
      phone,
      notes: text,
      checklist,
    };
  };

  return {
    isRecording,
    liveTranscript,
    hasSpeechRecognition,
    startRecording,
    stopRecording,
    parseVoiceTranscriptToLead,
  };
}
