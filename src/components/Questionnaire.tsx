import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, User, Clock, Cigarette, Droplets, Wind, MapPin, Calendar, Heart, Sparkles, Sun, Activity, Moon, Sparkle, Briefcase } from "lucide-react";
import { SKIN_PARAMETERS } from "../lib/constants";

interface QuestionnaireProps {
  onComplete: (answers: QuestionnaireAnswers) => void;
  onBack: () => void;
  userProfile?: any; // Add user profile to check missing data
  existingAnswers?: QuestionnaireAnswers | null; // Pre-fill with existing answers when editing
}

export interface QuestionnaireAnswers {
  // New skin-specific questions
  primarySkinConcern: string[]; // Multiple selection from SKIN_PARAMETERS (excluding Skin Type, Skin Tone, Glow)
  skinType: 'Dry' | 'Oily' | 'Normal' | 'Sensitive to light and products' | 'Combination';
  skinTone: 'Fair' | 'Light' | 'Medium' | 'Tan' | 'Dark' | 'Deep';
  glow: 'Dull' | 'Low Glow' | 'Moderate Glow' | 'High Glow' | 'Radiant';
  middaySkinFeel: 'Fresh and well hydrated' | 'Smooth and bright' | 'Neither smooth nor rough' | 'Rough and dull';
  sunscreenUsage: 'Everyday, even if I am not stepping out' | 'Everytime I go out' | 'Only when I have a prolonged sun exposure' | 'I do not apply sunscreen';
  physicalActivity: 'Regular' | 'Sometimes' | 'Rarely';
  sleepingHabits: 'Sound Sleep' | 'Moderate Sleep' | 'Disturbed Sleep';
  skinTreatment: 'Chemical Peels' | 'Laser Treatments' | 'Bleaching' | 'None';
  // Legacy fields (kept for backward compatibility)
  profession?: string;
  workingHours?: string;
  workStress?: 'Low' | 'Medium' | 'High' | 'Very High';
  smoking?: 'Non-smoker' | 'Light smoker' | 'Heavy smoker' | 'Former smoker';
  waterQuality?: 'Hard' | 'Soft';
  acUsage?: string;
  // Additional demographic fields for missing data
  gender?: 'male' | 'female' | 'other';
  birthdate?: string;
  city?: string;
  state?: string;
}

// Base questions (always asked) - updated for better Gemini AI accuracy
// Filter out Skin Type, Skin Tone, and Glow from primary concerns since they are separate questions
const primarySkinConcernOptions = SKIN_PARAMETERS.filter(
  param => param !== 'Skin Type' && param !== 'Skin Tone' && param !== 'Glow'
);

const baseQuestions = [
    {
      id: 'primarySkinConcern',
      title: 'What Is Your Primary Skin Concern? (Select all that apply)',
      icon: Heart,
      options: primarySkinConcernOptions,
      multiple: true // Flag for multiple selection
    },
    {
      id: 'skinType',
      title: 'What is your skin type?',
      icon: Sparkles,
      options: [
        'Dry',
        'Oily',
        'Normal',
        'Sensitive to light and products',
        'Combination'
      ]
    },
    {
      id: 'skinTone',
      title: 'What is your skin tone?',
      icon: Sparkles,
      options: [
        'Fair',
        'Light',
        'Medium',
        'Tan',
        'Dark',
        'Deep'
      ]
    },
    {
      id: 'glow',
      title: 'What is your skin glow level?',
      icon: Sparkle,
      options: [
        'Dull',
        'Low Glow',
        'Moderate Glow',
        'High Glow',
        'Radiant'
      ]
    },
    {
      id: 'middaySkinFeel',
      title: 'How does your skin feel like at Midday?',
      icon: Sparkle,
      options: [
        'Fresh and well hydrated',
        'Smooth and bright',
        'Neither smooth nor rough',
        'Rough and dull'
      ]
    },
    {
      id: 'sunscreenUsage',
      title: 'How often do you use sunscreen?',
      icon: Sun,
      options: [
        'Everyday, even if I am not stepping out',
        'Everytime I go out',
        'Only when I have a prolonged sun exposure',
        'I do not apply sunscreen'
      ]
    },
    {
      id: 'physicalActivity',
      title: 'Physical Activity Or Exercise',
      icon: Activity,
      options: [
        'Regular',
        'Sometimes',
        'Rarely'
      ]
    },
    {
      id: 'sleepingHabits',
      title: 'Sleeping Habits',
      icon: Moon,
      options: [
        'Sound Sleep',
        'Moderate Sleep',
        'Disturbed Sleep'
      ]
    },
    {
      id: 'skinTreatment',
      title: 'Skin Treatment',
      icon: Sparkles,
      options: [
        'Chemical Peels',
        'Laser Treatments',
        'Bleaching',
        'None'
      ]
    },
    {
      id: 'profession',
      title: 'What is your occupation?',
      icon: Briefcase,
      type: 'text'
    },
    {
      id: 'workingHours',
      title: 'What are your regular working hours?',
      icon: Clock,
      options: [
        'Morning shift',
        'Evening shift',
        'Night shift',
        'Flexible/Remote',
        'Not working'
      ]
    },
    {
      id: 'acUsage',
      title: 'How many hours per day are you in air conditioning?',
      icon: Wind,
      options: [
        'More than 8 hours daily',
        '4-8 hours daily',
        '1-3 hours daily',
        'Less than 1 hour daily',
        'Not using AC'
      ]
    },
    {
      id: 'smoking',
      title: 'Smoking habits?',
      icon: Cigarette,
      options: [
        'Non-smoker',
        'Light smoker',
        'Heavy smoker',
        'Former smoker'
      ]
    },
    {
      id: 'waterQuality',
      title: 'What is the water quality in your city?',
      icon: Droplets,
      options: [
        'Hard',
        'Soft'
      ]
    }
  ];

// Additional demographic questions (only if data is missing) - moved outside component
const demographicQuestions = [
    {
      id: 'gender',
      title: 'What is your gender?',
      icon: User,
      options: ['Male', 'Female', 'Other', 'Prefer not to say']
    },
    {
      id: 'birthdate',
      title: 'What is your date of birth?',
      icon: Calendar,
      type: 'text'
    },
    {
      id: 'city',
      title: 'Which city do you live in?',
      icon: MapPin,
      type: 'text'
    },
    {
      id: 'state',
      title: 'Which state/province do you live in?',
      icon: MapPin,
      type: 'text'
    }
  ];

const Questionnaire = ({ onComplete, onBack, userProfile, existingAnswers }: QuestionnaireProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>(() => {
    // Initialize with existingAnswers if available
    if (existingAnswers && Object.keys(existingAnswers).length > 0) {
      console.log('📋 Questionnaire: Initializing with existing answers:', existingAnswers);
      console.log('📋 Questionnaire: primarySkinConcern in initial state:', existingAnswers.primarySkinConcern);
      // Deep clone to ensure React detects the change
      return { ...existingAnswers };
    }
    console.log('📋 Questionnaire: No existing answers, starting with empty object');
    return {};
  });

  // Keep local answers in sync when existingAnswers arrive/changes
  useEffect(() => {
    if (existingAnswers && Object.keys(existingAnswers).length > 0) {
      // Only set answers if existingAnswers is provided (has actual data)
      console.log('📋 Questionnaire: Loading existing answers:', existingAnswers);
      console.log('📋 Questionnaire: primarySkinConcern in existingAnswers:', existingAnswers.primarySkinConcern);
      // Deep clone to ensure React detects the change
      setAnswers({ ...existingAnswers });
    } else {
      // Clear answers when existingAnswers is null/undefined (new user)
      console.log('📋 Questionnaire: No existing answers, starting fresh');
      setAnswers({});
    }
  }, [existingAnswers]);

  // Memoize missing data check to prevent recalculation on every render
  // Note: missingData values are booleans where true = missing, false = present
  const missingData = useMemo(() => {
    const genderMissing = !userProfile?.gender || userProfile?.gender === '' || userProfile?.gender === null || userProfile?.gender === undefined;
    const birthdateMissing = (!userProfile?.birthdate && !userProfile?.date_of_birth) || 
                              userProfile?.birthdate === '' || 
                              userProfile?.date_of_birth === '' ||
                              (userProfile?.birthdate === null && userProfile?.date_of_birth === null) ||
                              (userProfile?.birthdate === undefined && userProfile?.date_of_birth === undefined);
    const cityMissing = !userProfile?.city || userProfile?.city === '' || userProfile?.city === null || userProfile?.city === undefined;
    const stateMissing = !userProfile?.state || userProfile?.state === '' || userProfile?.state === null || userProfile?.state === undefined;
    
    return {
      gender: genderMissing,
      birthdate: birthdateMissing,
      city: cityMissing,
      state: stateMissing
    };
  }, [userProfile]);

  const hasMissingData = useMemo(() => Object.values(missingData).some(Boolean), [missingData]);

  // Log only once when component mounts or userProfile changes
  useEffect(() => {
    console.log('🔍 QUESTIONNAIRE - Checking User Profile Data:');
    console.log('👤 User Profile:', userProfile);
    console.log('❌ Missing Data (true = missing, false = present):', missingData);
    console.log('📊 Has Missing Data:', hasMissingData);
    
    // Show actual field values for debugging
    console.log('📋 Field Values:', {
      gender: userProfile?.gender || 'MISSING',
      birthdate: userProfile?.birthdate || userProfile?.date_of_birth || 'MISSING',
      city: userProfile?.city || 'MISSING',
      state: userProfile?.state || 'MISSING'
    });
    
    if (hasMissingData) {
      const missingFields = Object.entries(missingData)
        .filter(([_, isMissing]) => isMissing)
        .map(([field]) => field);
      console.log('⚠️ MISSING FIELDS DETECTED:', missingFields.join(', '));
      console.log('✅ These fields will be asked in the questionnaire');
    } else {
      console.log('✅ All demographic data present - Only lifestyle questions will be asked');
    }
  }, [userProfile, missingData, hasMissingData]);

  // Memoize questions array to prevent rebuilding on every render
  const allQuestions = useMemo(() => {
    const questions = [...baseQuestions];
    
    if (hasMissingData) {
      // Add demographic questions for missing data in order
      if (missingData.gender) questions.push(demographicQuestions[0]);
      if (missingData.birthdate) questions.push(demographicQuestions[1]);
      if (missingData.city) questions.push(demographicQuestions[2]);
      if (missingData.state) questions.push(demographicQuestions[3]);
    }
    
    return questions;
  }, [hasMissingData, missingData]);

  // Log questions only once when they change
  useEffect(() => {
    if (hasMissingData) {
      console.log('📝 ADDING DEMOGRAPHIC QUESTIONS for missing data');
      if (missingData.gender) console.log('  ➕ Question added: Gender');
      if (missingData.birthdate) console.log('  ➕ Question added: Birthdate');
      if (missingData.city) console.log('  ➕ Question added: City');
      if (missingData.state) console.log('  ➕ Question added: State');
      console.log(`📊 Total questions to ask: ${allQuestions.length} (${baseQuestions.length} lifestyle + ${allQuestions.length - baseQuestions.length} demographic)`);
    } else {
      console.log(`📊 Total questions to ask: ${allQuestions.length} (lifestyle questions only - all demographic data present)`);
    }
  }, [allQuestions.length, hasMissingData, missingData]);

  const currentQuestion = allQuestions[currentStep];
  const isMultipleSelect = (currentQuestion as any)?.multiple === true;

  // Debug: Log current answers state (moved after currentQuestion is defined)
  useEffect(() => {
    if (currentQuestion) {
      console.log('📋 Questionnaire: Current answers state:', answers);
      console.log('📋 Questionnaire: Current question ID:', currentQuestion.id);
      const currentAnswer = answers[currentQuestion.id as keyof QuestionnaireAnswers];
      console.log('📋 Questionnaire: Answer for current question:', currentAnswer);
      if (currentQuestion.id === 'primarySkinConcern') {
        console.log('📋 Questionnaire: primarySkinConcern is array:', Array.isArray(currentAnswer));
        console.log('📋 Questionnaire: primarySkinConcern value:', currentAnswer);
      }
    }
  }, [answers, currentQuestion, currentStep]);

  const handleAnswer = (answer: string) => {
    if (isMultipleSelect) {
      // Handle multiple selection
      const currentAnswers = (answers[currentQuestion.id as keyof QuestionnaireAnswers] as string[]) || [];
      if (currentAnswers.includes(answer)) {
        // Deselect if already selected
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: currentAnswers.filter(a => a !== answer)
        }));
      } else {
        // Add to selection
        setAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: [...currentAnswers, answer]
        }));
      }
    } else {
      // Handle single selection
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: answer
      }));
    }
  };

  const handleNext = () => {
    if (currentStep < allQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete questionnaire
      const completeAnswers: QuestionnaireAnswers = {
        // Required new questions
        primarySkinConcern: Array.isArray(answers.primarySkinConcern) && answers.primarySkinConcern.length > 0
          ? answers.primarySkinConcern as string[]
          : ['Aging'], // Default to one concern if none selected
        skinType: (answers.skinType as QuestionnaireAnswers['skinType']) || 'Normal',
        skinTone: (answers.skinTone as QuestionnaireAnswers['skinTone']) || 'Medium',
        glow: (answers.glow as QuestionnaireAnswers['glow']) || 'Moderate Glow',
        middaySkinFeel: (answers.middaySkinFeel as QuestionnaireAnswers['middaySkinFeel']) || 'Neither smooth nor rough',
        sunscreenUsage: (answers.sunscreenUsage as QuestionnaireAnswers['sunscreenUsage']) || 'I do not apply sunscreen',
        physicalActivity: (answers.physicalActivity as QuestionnaireAnswers['physicalActivity']) || 'Sometimes',
        sleepingHabits: (answers.sleepingHabits as QuestionnaireAnswers['sleepingHabits']) || 'Moderate Sleep',
        skinTreatment: (answers.skinTreatment as QuestionnaireAnswers['skinTreatment']) || 'None',
        // Lifestyle fields
        profession: answers.profession || '',
        workingHours: answers.workingHours || '',
        acUsage: answers.acUsage || 'Not using AC',
        smoking: (answers.smoking as QuestionnaireAnswers['smoking']) || 'Non-smoker',
        waterQuality: (answers.waterQuality as QuestionnaireAnswers['waterQuality']) || 'Hard',
        // Legacy fields (optional)
        ...(answers.workStress && { workStress: answers.workStress as QuestionnaireAnswers['workStress'] }),
        // Include demographic data if provided
        ...(answers.gender && { gender: answers.gender as 'male' | 'female' | 'other' }),
        ...(answers.birthdate && { birthdate: answers.birthdate }),
        ...(answers.city && { city: answers.city }),
        ...(answers.state && { state: answers.state })
      };
      
      console.log('📋 Questionnaire completed with answers:', completeAnswers);
      onComplete(completeAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progress = ((currentStep + 1) / allQuestions.length) * 100;

  return (
    <div className="bg-gradient-to-br from-karma-cream via-background to-karma-light-gold p-6 rounded-2xl">
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm text-gray-600">{currentStep + 1} of {allQuestions.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-karma-green h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Missing Data Alert */}
        {hasMissingData && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Additional Information Needed</h3>
            </div>
            <p className="text-sm text-blue-700">
              We need some additional demographic information to provide you with the most accurate skin analysis. 
              This information helps our AI understand your skin better based on your location, age, and other factors.
            </p>
            <div className="mt-2 text-xs text-blue-600">
              <strong>Missing:</strong> {Object.entries(missingData).filter(([_, missing]) => missing).map(([field, _]) => field).join(', ')}
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-karma-light-green rounded-full flex items-center justify-center mx-auto mb-4">
              <currentQuestion.icon className="w-8 h-8 text-karma-green" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{currentQuestion.title}</h2>
            <p className="text-gray-600">
              Question {currentStep + 1} of {allQuestions.length}
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.type === 'date' ? (
              <input
                type="date"
                value={answers[currentQuestion.id as keyof QuestionnaireAnswers] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg focus:border-karma-green focus:ring-karma-green px-4"
                max={new Date().toISOString().split('T')[0]}
              />
            ) : currentQuestion.type === 'text' ? (
              <input
                type="text"
                value={answers[currentQuestion.id as keyof QuestionnaireAnswers] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder={`Enter your ${currentQuestion.id}`}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg focus:border-karma-green focus:ring-karma-green px-4"
              />
            ) : (
              currentQuestion.options.map((option) => {
                const isSelected = isMultipleSelect
                  ? (answers[currentQuestion.id as keyof QuestionnaireAnswers] as string[])?.includes(option) || false
                  : answers[currentQuestion.id as keyof QuestionnaireAnswers] === option;
                
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={`w-full h-12 rounded-lg border-2 transition-all duration-200 text-left px-4 flex items-center gap-3 ${
                      isSelected
                        ? 'border-karma-green bg-karma-light-green text-karma-green'
                        : 'border-gray-200 hover:border-karma-green hover:bg-gray-50'
                    }`}
                  >
                    {isMultipleSelect && (
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'border-karma-green bg-karma-green' 
                          : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    )}
                    <span>{option}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md disabled:shadow-none"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>
          
          <button
            onClick={handleNext}
            disabled={
              isMultipleSelect
                ? !answers[currentQuestion.id as keyof QuestionnaireAnswers] || 
                  (answers[currentQuestion.id as keyof QuestionnaireAnswers] as string[])?.length === 0
                : !answers[currentQuestion.id as keyof QuestionnaireAnswers]
            }
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-karma-green to-green-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {currentStep === allQuestions.length - 1 ? (
              <>
                Complete
                <CheckCircle className="w-5 h-5" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="text-center text-sm text-gray-500 mt-2">
          {isMultipleSelect ? (
            (answers[currentQuestion.id as keyof QuestionnaireAnswers] as string[])?.length > 0
              ? `✓ ${(answers[currentQuestion.id as keyof QuestionnaireAnswers] as string[]).length} concern(s) selected - Click Next to continue`
              : 'Please select at least one concern to continue'
          ) : (
            answers[currentQuestion.id as keyof QuestionnaireAnswers] 
              ? '✓ Answer selected - Click Next to continue' 
              : 'Please select an answer to continue'
          )}
        </div>
      </div>
    </div>
  );
};

export default Questionnaire;