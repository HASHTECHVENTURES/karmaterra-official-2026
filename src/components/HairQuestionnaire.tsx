import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, User, Droplets, MapPin, Calendar, Heart, Waves, Scissors, Flame, Activity, Sparkles, FlaskConical, Shield } from "lucide-react";
import { getHairQuestions, HairQuestion as DBHairQuestion } from "@/services/hairQuestionService";

interface HairQuestionnaireProps {
  onComplete: (answers: HairQuestionnaireAnswers) => void;
  onBack: () => void;
  userProfile?: any; // Add user profile to check missing data
  existingAnswers?: HairQuestionnaireAnswers | null; // Pre-fill with existing answers when editing
}

export interface HairQuestionnaireAnswers {
  // Hair-specific questions
  hairType: 'Straight' | 'Wavy' | 'Curly' | 'Coily';
  hairTexture: 'Fine' | 'Medium' | 'Coarse';
  hairThickness: 'Thin' | 'Medium' | 'Thick';
  scalpCondition: 'Healthy' | 'Dry' | 'Oily' | 'Sensitive' | 'Dandruff';
  washingFrequency: 'Daily' | 'Every 2-3 days' | '2-3 times per week' | 'Once a week' | 'Less than once a week';
  hairCareProducts: 'Sulfate-free' | 'Natural/Organic' | 'Medicated' | 'Regular commercial' | 'Mixed';
  chemicalTreatments: 'None' | 'Coloring only' | 'Perming/Relaxing' | 'Bleaching' | 'Multiple treatments';
  heatStylingFrequency: 'Daily' | '3-4 times per week' | '1-2 times per week' | 'Rarely' | 'Never';
  stressLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
  waterQuality: 'Hard' | 'Soft' | 'Chlorinated';
  // Additional demographic fields for missing data
  gender?: 'male' | 'female' | 'other';
  birthdate?: string;
  city?: string;
  state?: string;
}

// Base questions for hair analysis - based on comprehensive research
const baseQuestions = [
  {
    id: 'hairType',
    title: 'What is your natural hair type?',
    icon: Waves,
    options: [
      'Straight',
      'Wavy',
      'Curly',
      'Coily'
    ]
  },
  {
    id: 'hairTexture',
    title: 'What is your hair texture?',
    icon: Sparkles,
    options: [
      'Fine',
      'Medium',
      'Coarse'
    ]
  },
  {
    id: 'hairThickness',
    title: 'How thick is your hair overall?',
    icon: Shield,
    options: [
      'Thin',
      'Medium',
      'Thick'
    ]
  },
  {
    id: 'scalpCondition',
    title: 'What is your scalp condition?',
    icon: Heart,
    options: [
      'Healthy',
      'Dry',
      'Oily',
      'Sensitive',
      'Dandruff'
    ]
  },
  {
    id: 'washingFrequency',
    title: 'How often do you wash your hair?',
    icon: Droplets,
    options: [
      'Daily',
      'Every 2-3 days',
      '2-3 times per week',
      'Once a week',
      'Less than once a week'
    ]
  },
  {
    id: 'hairCareProducts',
    title: 'What type of hair care products do you primarily use?',
    icon: FlaskConical,
    options: [
      'Sulfate-free',
      'Natural/Organic',
      'Medicated',
      'Regular commercial',
      'Mixed'
    ]
  },
  {
    id: 'chemicalTreatments',
    title: 'Have you had any chemical treatments in the past 6 months?',
    icon: Scissors,
    options: [
      'None',
      'Coloring only',
      'Perming/Relaxing',
      'Bleaching',
      'Multiple treatments'
    ]
  },
  {
    id: 'heatStylingFrequency',
    title: 'How often do you use heat styling tools (blow dryer, flat iron, curling iron)?',
    icon: Flame,
    options: [
      'Daily',
      '3-4 times per week',
      '1-2 times per week',
      'Rarely',
      'Never'
    ]
  },
  {
    id: 'stressLevel',
    title: 'How would you describe your stress levels?',
    icon: Activity,
    options: [
      'Low',
      'Moderate',
      'High',
      'Very High'
    ]
  },
  {
    id: 'waterQuality',
    title: 'What is the water quality in your area for hair washing?',
    icon: Droplets,
    options: [
      'Hard',
      'Soft',
      'Chlorinated'
    ]
  }
];

// Additional demographic questions (only if data is missing)
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

// Icon mapping for database icon names
const iconMap: Record<string, any> = {
  Waves,
  Sparkles,
  Shield,
  Heart,
  Droplets,
  FlaskConical,
  Scissors,
  Flame,
  Activity,
  Brain: Activity,
  User,
  MapPin,
  Calendar,
};

const HairQuestionnaire = ({ onComplete, onBack, userProfile, existingAnswers }: HairQuestionnaireProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dbQuestions, setDbQuestions] = useState<DBHairQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [answers, setAnswers] = useState<Partial<HairQuestionnaireAnswers>>(() => {
    // Initialize with existingAnswers if provided, otherwise empty object
    if (existingAnswers && Object.keys(existingAnswers).length > 0) {
      return existingAnswers;
    }
    return {};
  });
  
  // Add Brain icon import
  const Brain = Activity; // Using Activity as Brain icon

  // Fetch questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const questions = await getHairQuestions();
        setDbQuestions(questions);
      } catch (error) {
        console.error('Error loading hair questions:', error);
        // Fallback to hardcoded questions if database fails
        setDbQuestions([]);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, []);

  // Only initialize from existingAnswers on mount, don't reset user's current selections
  useEffect(() => {
    if (existingAnswers && Object.keys(existingAnswers).length > 0) {
      // Only set if answers state is still empty (initial load)
      // Don't overwrite if user has already made selections
      setAnswers(prev => {
        if (Object.keys(prev).length === 0) {
          return existingAnswers;
        }
        return prev; // Keep user's selections
      });
    }
  }, []); // Only run once on mount

  // Memoize missing data check to prevent recalculation on every render
  const missingData = useMemo(() => ({
    gender: !userProfile?.gender || userProfile?.gender === '' || userProfile?.gender === null,
    birthdate: (!userProfile?.birthdate && !userProfile?.date_of_birth) || userProfile?.birthdate === '' || userProfile?.date_of_birth === '',
    city: !userProfile?.city || userProfile?.city === '' || userProfile?.city === null,
    state: !userProfile?.state || userProfile?.state === '' || userProfile?.state === null
  }), [userProfile]);

  const hasMissingData = useMemo(() => Object.values(missingData).some(Boolean), [missingData]);

  // Mapping from question text to answer field names (for database questions)
  const questionToFieldMap: Record<string, keyof HairQuestionnaireAnswers> = {
    'what is your natural hair type': 'hairType',
    'what is your hair texture': 'hairTexture',
    'how thick is your hair overall': 'hairThickness',
    'what is your scalp condition': 'scalpCondition',
    'how often do you wash your hair': 'washingFrequency',
    'what type of hair care products do you primarily use': 'hairCareProducts',
    'have you had any chemical treatments in the past 6 months': 'chemicalTreatments',
    'how often do you use heat styling tools': 'heatStylingFrequency',
    'how would you describe your stress levels': 'stressLevel',
    'what is the water quality in your city': 'waterQuality',
    'what is the water quality in your area for hair washing': 'waterQuality',
  };

  // Memoize questions array - use database questions if available, otherwise fallback to hardcoded
  const allQuestions = useMemo(() => {
    // If we have database questions, use them
    if (dbQuestions.length > 0) {
      const mappedQuestions = dbQuestions.map((q) => {
        // Map database question to component format
        const IconComponent = q.icon_name ? iconMap[q.icon_name] || Waves : Waves;
        
        // Try to map to existing field name, or create a unique ID
        const questionTextLower = q.question_text.toLowerCase().trim();
        const questionId = questionToFieldMap[questionTextLower] || 
          q.question_text.toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        
        return {
          id: questionId,
          title: q.question_text,
          icon: IconComponent,
          options: q.answer_options || [],
          type: q.question_type === 'text' ? 'text' : q.question_type === 'multiple_choice' ? 'multiple' : 'single',
          helpText: q.help_text,
          isRequired: q.is_required,
        };
      });
      
      // Add demographic questions if needed
      if (hasMissingData) {
        if (missingData.gender) mappedQuestions.push(demographicQuestions[0]);
        if (missingData.birthdate) mappedQuestions.push(demographicQuestions[1]);
        if (missingData.city) mappedQuestions.push(demographicQuestions[2]);
        if (missingData.state) mappedQuestions.push(demographicQuestions[3]);
      }
      
      return mappedQuestions;
    }
    
    // Fallback to hardcoded questions if database is empty or failed
    const questions = [...baseQuestions];
    
    if (hasMissingData) {
      // Add demographic questions for missing data in order
      if (missingData.gender) questions.push(demographicQuestions[0]);
      if (missingData.birthdate) questions.push(demographicQuestions[1]);
      if (missingData.city) questions.push(demographicQuestions[2]);
      if (missingData.state) questions.push(demographicQuestions[3]);
    }
    
    return questions;
  }, [dbQuestions, hasMissingData, missingData]);

  // Debug: Log current answer when question changes
  useEffect(() => {
    if (allQuestions.length > 0 && currentStep < allQuestions.length) {
      const currentQuestion = allQuestions[currentStep];
      const currentAnswer = answers[currentQuestion.id as keyof HairQuestionnaireAnswers];
      console.log(`🔍 Question ${currentStep + 1} (${currentQuestion.id}): Current answer =`, currentAnswer);
      console.log('📝 All answers so far:', answers);
    }
  }, [currentStep, allQuestions, answers]);

  const handleAnswer = (answer: string) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [currentQuestion.id]: answer
      };
      console.log(`✅ Answer selected for ${currentQuestion.id}:`, answer);
      console.log('📝 Updated answers:', updated);
      return updated;
    });
  };

  const handleNext = () => {
    if (currentStep < allQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete questionnaire
      const completeAnswers: HairQuestionnaireAnswers = {
        // Required hair-specific questions
        hairType: (answers.hairType as HairQuestionnaireAnswers['hairType']) || 'Straight',
        hairTexture: (answers.hairTexture as HairQuestionnaireAnswers['hairTexture']) || 'Medium',
        hairThickness: (answers.hairThickness as HairQuestionnaireAnswers['hairThickness']) || 'Medium',
        scalpCondition: (answers.scalpCondition as HairQuestionnaireAnswers['scalpCondition']) || 'Healthy',
        washingFrequency: (answers.washingFrequency as HairQuestionnaireAnswers['washingFrequency']) || '2-3 times per week',
        hairCareProducts: (answers.hairCareProducts as HairQuestionnaireAnswers['hairCareProducts']) || 'Regular commercial',
        chemicalTreatments: (answers.chemicalTreatments as HairQuestionnaireAnswers['chemicalTreatments']) || 'None',
        heatStylingFrequency: (answers.heatStylingFrequency as HairQuestionnaireAnswers['heatStylingFrequency']) || '1-2 times per week',
        stressLevel: (answers.stressLevel as HairQuestionnaireAnswers['stressLevel']) || 'Moderate',
        waterQuality: (answers.waterQuality as HairQuestionnaireAnswers['waterQuality']) || 'Hard',
        // Include demographic data if provided
        ...(answers.gender && { gender: answers.gender as 'male' | 'female' | 'other' }),
        ...(answers.birthdate && { birthdate: answers.birthdate }),
        ...(answers.city && { city: answers.city }),
        ...(answers.state && { state: answers.state })
      };
      
      console.log('📋 Hair Questionnaire completed with answers:', completeAnswers);
      onComplete(completeAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progress = allQuestions.length > 0 ? ((currentStep + 1) / allQuestions.length) * 100 : 0;

  // Show loading state
  if (loadingQuestions) {
    return (
      <div className="bg-gradient-to-br from-karma-cream via-background to-karma-light-gold p-6 rounded-2xl">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-karma-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Show error state if no questions available
  if (allQuestions.length === 0) {
    return (
      <div className="bg-gradient-to-br from-karma-cream via-background to-karma-light-gold p-6 rounded-2xl">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">No questions available. Please add questions in the admin panel.</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-karma-green text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = allQuestions[currentStep];

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
              We need some additional demographic information to provide you with the most accurate hair analysis. 
              This information helps our AI understand your hair better based on your location, age, and other factors.
            </p>
            <div className="mt-2 text-xs text-blue-600">
              <strong>Missing:</strong> {Object.entries(missingData).filter(([_, missing]) => missing).map(([field]) => field).join(', ')}
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-karma-light-green rounded-full flex items-center justify-center mx-auto mb-4">
              {currentQuestion.icon && <currentQuestion.icon className="w-8 h-8 text-karma-green" />}
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{currentQuestion.title}</h2>
            {currentQuestion.helpText && (
              <p className="text-sm text-gray-500 mb-2">{currentQuestion.helpText}</p>
            )}
            <p className="text-gray-600">
              Question {currentStep + 1} of {allQuestions.length}
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.type === 'date' ? (
              <input
                type="date"
                value={answers[currentQuestion.id as keyof HairQuestionnaireAnswers] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg focus:border-karma-green focus:ring-karma-green px-4"
                max={new Date().toISOString().split('T')[0]}
              />
            ) : currentQuestion.type === 'text' ? (
              <input
                type="text"
                value={answers[currentQuestion.id as keyof HairQuestionnaireAnswers] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder={`Enter your ${currentQuestion.id}`}
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-lg focus:border-karma-green focus:ring-karma-green px-4"
              />
            ) : currentQuestion.options && currentQuestion.options.length > 0 ? (
              currentQuestion.options.map((option) => {
                const currentAnswer = answers[currentQuestion.id as keyof HairQuestionnaireAnswers];
                // Ensure both are strings for comparison
                const answerString = currentAnswer ? String(currentAnswer) : null;
                const optionString = String(option);
                const isSelected = answerString === optionString;
                
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={`w-full h-12 rounded-lg border-2 transition-all duration-200 text-left px-4 flex items-center gap-3 ${
                      isSelected
                        ? 'border-karma-green bg-karma-light-green text-karma-green font-medium'
                        : 'border-gray-200 hover:border-karma-green hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && <CheckCircle className="w-5 h-5 text-karma-green" />}
                    <span>{option}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-4">No answer options configured for this question.</p>
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
            disabled={!answers[currentQuestion.id as keyof HairQuestionnaireAnswers]}
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
          {answers[currentQuestion.id as keyof HairQuestionnaireAnswers] 
            ? '✓ Answer selected - Click Next to continue' 
            : 'Please select an answer to continue'}
        </div>
      </div>
    </div>
  );
};

export default HairQuestionnaire;

