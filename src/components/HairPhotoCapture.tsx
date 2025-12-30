import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface HairPhotoCaptureProps {
  onComplete: (images: { front: string; top: string }) => void;
}

const steps = [
  { id: 'front', name: 'Scalp', description: 'Capture your hairline and forehead' },
  { id: 'top', name: 'Crown', description: 'Tilt down to capture the crown area' }
];

const HairPhotoCapture: React.FC<HairPhotoCaptureProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [images, setImages] = useState<{[key: string]: string}>({});
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Lock screen orientation to portrait when camera is active
  useEffect(() => {
    const lockOrientation = async () => {
      if (Capacitor.getPlatform() === 'android' && showCamera) {
        try {
          // Use Screen Orientation API if available
          if (screen.orientation && 'lock' in screen.orientation) {
            await (screen.orientation as ScreenOrientation).lock('portrait');
          }
        } catch (err) {
          // Lock may fail if not user-initiated or not supported
          console.warn('Could not lock orientation:', err);
        }
      }
    };

    const unlockOrientation = async () => {
      if (Capacitor.getPlatform() === 'android') {
        try {
          if (screen.orientation && 'unlock' in screen.orientation) {
            await (screen.orientation as ScreenOrientation).unlock();
          }
        } catch (err) {
          console.warn('Could not unlock orientation:', err);
        }
      }
    };

    if (showCamera) {
      lockOrientation();
    }

    return () => {
      if (!showCamera) {
        unlockOrientation();
      }
    };
  }, [showCamera]);

  useEffect(() => {
    const stopStream = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };

    const enableStream = async () => {
      if (showCamera && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(err => {
                console.error("Video play failed:", err);
              });
            };
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          alert("Could not access the camera. Please check your browser permissions.");
          setShowCamera(false);
        }
      } else {
        stopStream();
      }
    };

    enableStream();

    return () => {
      stopStream();
    };
  }, [showCamera]);

  useEffect(() => {
    if (images.front && images.top) {
      onComplete(images as { front: string; top: string });
    }
  }, [images, onComplete]);

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  const handleCloseCamera = () => {
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        const currentStepData = steps[currentStep];
        setImages(prev => ({ ...prev, [currentStepData.id]: dataUrl }));
        setCurrentStep(prev => prev + 1);
        handleCloseCamera();
      }
    }
  };

  const progress = (Object.keys(images).length / steps.length) * 100;

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-3xl font-bold text-center mb-2 text-purple-600">Capture Your Hair Photos</h2>
      <p className="text-center text-slate-500 mb-6">For the best results, use a well-lit room and ensure your hair is clearly visible.</p>

      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
        <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className={`p-6 rounded-lg transition-all duration-300 ${currentStep === index ? 'bg-purple-50 border-2 border-purple-500 shadow-md' : images[step.id] ? 'bg-green-50 border-2 border-green-500' : 'bg-slate-100 border-2 border-transparent'}`}>
            {images[step.id] ? (
              <div className="flex flex-col items-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <h3 className="font-bold text-lg text-slate-700">{step.name}</h3>
                <p className="text-sm text-green-600">Completed</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${currentStep === index ? 'bg-purple-100' : 'bg-slate-200'}`}>
                  <Camera className={`w-6 h-6 ${currentStep === index ? 'text-purple-600' : 'text-slate-500'}`} />
                </div>
                <h3 className="font-bold text-lg text-slate-700">{step.name}</h3>
                <p className="text-sm text-slate-500 mb-2">{step.description}</p>
                {currentStep === index && (
                  <button 
                    onClick={handleOpenCamera} 
                    className="mt-3 bg-purple-500 text-white text-sm font-semibold py-3 px-6 rounded-full hover:bg-purple-600 min-h-[48px] min-w-[48px] transition-colors"
                    aria-label={`Open camera to capture ${step.name.toLowerCase()}`}
                  >
                    Open Camera
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
          <h3 className="text-white text-2xl font-bold mb-4">Capturing: {steps[currentStep].name}</h3>
          <div className="relative w-full max-w-lg">
            <video ref={videoRef} playsInline className="rounded-lg w-full h-auto aspect-square object-cover transform -scale-x-100" />
            <div className="absolute inset-0 border-4 border-white/50 rounded-lg pointer-events-none"></div>
          </div>
          <canvas ref={canvasRef} className="hidden"></canvas>
          <div className="flex gap-4 mt-6">
            <button 
              onClick={capturePhoto} 
              className="bg-purple-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-purple-600 min-h-[48px] min-w-[48px] transition-colors"
              aria-label={`Capture ${steps[currentStep].name.toLowerCase()}`}
            >
              Capture
            </button>
            <button 
              onClick={handleCloseCamera} 
              className="bg-slate-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-slate-600 min-h-[48px] min-w-[48px] transition-colors"
              aria-label="Cancel camera"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HairPhotoCapture;

