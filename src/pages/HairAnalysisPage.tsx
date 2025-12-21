import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AndroidPageHeader } from "../components/AndroidBackButton";
import HairQuestionnaire, { HairQuestionnaireAnswers } from "../components/HairQuestionnaire";
import HairPhotoCapture from "../components/HairPhotoCapture";
import { analyzeHair, HairAnalysisResult } from "../services/geminiServiceEdge";
import { useAuth } from "../App";
import { supabase } from "../lib/supabase";
import { UserData, Report, AnalysisResult } from "../types";

const HairAnalysisPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any | undefined>(undefined);
  const [localMode, setLocalMode] = useState<'questionnaire' | 'camera' | 'analyzing' | 'error'>('questionnaire');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<HairQuestionnaireAnswers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      // Reset state when user changes or component initializes
      setQuestionnaireAnswers(null);
      setUserProfile(undefined);
      
      if (user) {
        setUserProfile(user);

        // Load existing hair questionnaire answers from Supabase
        try {
          // First, try to load from profiles table - use maybeSingle to handle no results
          const { data: dbProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error loading profile:', profileError);
          }

          if (dbProfile) {
            // Build HairQuestionnaireAnswers from profile if hair fields exist
            const existingAnswers: Partial<HairQuestionnaireAnswers> = {};
            
            if (dbProfile.hair_type) existingAnswers.hairType = dbProfile.hair_type as HairQuestionnaireAnswers['hairType'];
            if (dbProfile.hair_texture) existingAnswers.hairTexture = dbProfile.hair_texture as HairQuestionnaireAnswers['hairTexture'];
            if (dbProfile.hair_thickness) existingAnswers.hairThickness = dbProfile.hair_thickness as HairQuestionnaireAnswers['hairThickness'];
            if (dbProfile.scalp_condition) existingAnswers.scalpCondition = dbProfile.scalp_condition as HairQuestionnaireAnswers['scalpCondition'];
            if (dbProfile.washing_frequency) existingAnswers.washingFrequency = dbProfile.washing_frequency as HairQuestionnaireAnswers['washingFrequency'];
            if (dbProfile.hair_care_products) existingAnswers.hairCareProducts = dbProfile.hair_care_products as HairQuestionnaireAnswers['hairCareProducts'];
            if (dbProfile.chemical_treatments) existingAnswers.chemicalTreatments = dbProfile.chemical_treatments as HairQuestionnaireAnswers['chemicalTreatments'];
            if (dbProfile.heat_styling_frequency) existingAnswers.heatStylingFrequency = dbProfile.heat_styling_frequency as HairQuestionnaireAnswers['heatStylingFrequency'];
            if (dbProfile.stress_level) existingAnswers.stressLevel = dbProfile.stress_level as HairQuestionnaireAnswers['stressLevel'];
            if (dbProfile.water_quality) existingAnswers.waterQuality = dbProfile.water_quality as HairQuestionnaireAnswers['waterQuality'];
            if (dbProfile.gender) existingAnswers.gender = dbProfile.gender as HairQuestionnaireAnswers['gender'];
            if (dbProfile.birthdate || dbProfile.date_of_birth) existingAnswers.birthdate = dbProfile.birthdate || dbProfile.date_of_birth;
            if (dbProfile.city) existingAnswers.city = dbProfile.city;
            if (dbProfile.state) existingAnswers.state = dbProfile.state;

            // Also try to load from questionnaire_history for most recent answers - use maybeSingle
            const { data: latestQuestionnaire, error: questionnaireError } = await supabase
              .from('questionnaire_history')
              .select('questionnaire_data')
              .eq('user_id', user.id)
              .eq('questionnaire_type', 'hair')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (questionnaireError && questionnaireError.code !== 'PGRST116') {
              console.error('Error loading questionnaire history:', questionnaireError);
            }

            if (latestQuestionnaire?.questionnaire_data) {
              // Merge with profile data, but questionnaire_history takes precedence if it has more complete data
              const qData = latestQuestionnaire.questionnaire_data as Partial<HairQuestionnaireAnswers>;
              Object.keys(qData).forEach(key => {
                const typedKey = key as keyof HairQuestionnaireAnswers;
                const value = qData[typedKey];
                if (value !== undefined && value !== null) {
                  (existingAnswers as any)[typedKey] = value;
                }
              });
            }

            // Only set if we have at least one answer for THIS user
            if (Object.keys(existingAnswers).length > 0) {
              console.log('📋 Loaded existing hair questionnaire answers from Supabase for user:', user.id, existingAnswers);
              setQuestionnaireAnswers(existingAnswers as HairQuestionnaireAnswers);
            } else {
              // Clear answers for new users without previous data
              setQuestionnaireAnswers(null);
            }
          } else {
            // No profile found for this user - clear answers
            setQuestionnaireAnswers(null);
          }
        } catch (error) {
          console.warn('⚠️ Failed to load existing questionnaire answers:', error);
          // Clear answers on error to prevent showing wrong data
          setQuestionnaireAnswers(null);
        }
      }
      setLoadingProfile(false);
    };

    initialize();
  }, [user]);

  const handleAnalysis = async (images: string[]) => {
    if (!userProfile || !questionnaireAnswers) {
      setError("User data or questionnaire answers are missing.");
      setLocalMode('error');
      return;
    }

    if (!images || images.length < 2) {
      setError('Please capture both front and top view images before analysis');
      setLocalMode('error');
      return;
    }

    // Validate images are valid base64 strings
    const validImages = images.filter(img => img && typeof img === 'string' && img.length > 100);
    if (validImages.length < 2) {
      setError('One or more images are invalid. Please capture the images again.');
      setLocalMode('error');
      return;
    }

    console.log('📸 Starting hair analysis with images:', {
      imageCount: images.length,
      firstImageLength: images[0]?.length || 0,
      secondImageLength: images[1]?.length || 0
    });

    setLocalMode('analyzing');

    try {
      // Persist demographic fields
      const profileUpdates: any = {};
      if (questionnaireAnswers.gender) profileUpdates.gender = questionnaireAnswers.gender;
      if (questionnaireAnswers.birthdate) profileUpdates.birthdate = questionnaireAnswers.birthdate;
      if (questionnaireAnswers.city) profileUpdates.city = questionnaireAnswers.city;
      if (questionnaireAnswers.state) profileUpdates.state = questionnaireAnswers.state;
      if (questionnaireAnswers.hairType) profileUpdates.hair_type = questionnaireAnswers.hairType;
      if (questionnaireAnswers.hairTexture) profileUpdates.hair_texture = questionnaireAnswers.hairTexture;
      if (questionnaireAnswers.hairThickness) profileUpdates.hair_thickness = questionnaireAnswers.hairThickness;
      if (questionnaireAnswers.scalpCondition) profileUpdates.scalp_condition = questionnaireAnswers.scalpCondition;
      if (questionnaireAnswers.washingFrequency) profileUpdates.washing_frequency = questionnaireAnswers.washingFrequency;
      if (questionnaireAnswers.hairCareProducts) profileUpdates.hair_care_products = questionnaireAnswers.hairCareProducts;
      if (questionnaireAnswers.chemicalTreatments) profileUpdates.chemical_treatments = questionnaireAnswers.chemicalTreatments;
      if (questionnaireAnswers.heatStylingFrequency) profileUpdates.heat_styling_frequency = questionnaireAnswers.heatStylingFrequency;
      if (questionnaireAnswers.stressLevel) profileUpdates.stress_level = questionnaireAnswers.stressLevel;
      if (questionnaireAnswers.waterQuality) profileUpdates.water_quality = questionnaireAnswers.waterQuality;

      if (userProfile.id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userProfile.id);

        if (updateError) {
          console.error('Failed to update profile:', updateError);
        }
      }

      const birthdate = questionnaireAnswers.birthdate || (userProfile as any).birthdate || (userProfile as any).date_of_birth;
      if (!birthdate) {
        throw new Error("Birthdate is missing from user profile.");
      }
      
      const parseBirthdate = (b: string) => {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(b)) {
          const [dd, mm, yyyy] = b.split('/').map(Number);
          return new Date(yyyy, mm - 1, dd);
        }
        return new Date(b);
      };
      const bd = parseBirthdate(birthdate);
      const age = Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      const userDataForApi: UserData = {
        name: userProfile.name || 'Anonymous',
        age: age,
        gender: questionnaireAnswers.gender || userProfile.gender,
        city: questionnaireAnswers.city || userProfile.city,
        state: questionnaireAnswers.state || userProfile.state,
        country: (userProfile as any).country,
        profession: '',
        workingTime: '',
        acUsage: '',
        smoking: '',
        waterQuality: questionnaireAnswers.waterQuality,
      };

      console.log('🧩 Sending user data to AI:', userDataForApi);
      const result = await analyzeHair(userDataForApi, images, questionnaireAnswers, userProfile.id);

      // Validate result structure
      if (!result || !result.hair_analysis) {
        console.error('❌ Invalid result structure:', result);
        throw new Error("Invalid hair analysis result: missing hair_analysis data");
      }

      const hairAnalysis = result.hair_analysis;
      
      // Try multiple key formats in case AI returns keys differently
      const getHairAnalysisSection = (key: string, altKeys?: string[]) => {
        if (hairAnalysis[key]) return hairAnalysis[key];
        if (altKeys) {
          for (const altKey of altKeys) {
            if (hairAnalysis[altKey]) return hairAnalysis[altKey];
          }
        }
        // Try finding by partial key match
        const matchingKey = Object.keys(hairAnalysis).find(k => 
          k.includes(key.split(' ')[1]) || k.toLowerCase().includes(key.toLowerCase())
        );
        if (matchingKey) return hairAnalysis[matchingKey];
        return null;
      };

      const densityThickness = getHairAnalysisSection("1. Hair Density and Thickness", ["Hair Density and Thickness"]);
      const scalpHealth = getHairAnalysisSection("2. Scalp Health and Condition", ["Scalp Health and Condition"]);
      const hairTexture = getHairAnalysisSection("3. Hair Texture and Quality", ["Hair Texture and Quality"]);
      const potentialIssues = getHairAnalysisSection("4. Potential Issues", ["Potential Issues"]);
      const growthPatterns = getHairAnalysisSection("5. Hair Growth Patterns", ["Hair Growth Patterns"]);
      const recommendations = getHairAnalysisSection("6. Recommendations for Improvement", ["Recommendations for Improvement"]);

      // Convert HairAnalysisResult to a format compatible with Report type
      // Use individual section ratings and severities from the AI response
      const analysisResult: AnalysisResult = {
        summary: result.summary || "Hair analysis completed",
        overallSeverity: result.overallSeverity || 'Medium',
        parameters: [
          {
            category: 'Hair Density and Thickness',
            rating: densityThickness?.rating ?? ((result.overall_score || 50) / 10), // Use section-specific rating
            severity: densityThickness?.severity ?? (result.overallSeverity || 'Medium'),
            description: densityThickness 
              ? `${densityThickness.density || 'N/A'} ${densityThickness.thickness || 'N/A'}. ${densityThickness.notes || ''}` 
              : 'Analysis pending'
          },
          {
            category: 'Scalp Health',
            rating: scalpHealth?.rating ?? ((result.overall_score || 50) / 10),
            severity: scalpHealth?.severity ?? (result.overallSeverity || 'Medium'),
            description: scalpHealth 
              ? `${scalpHealth.condition || 'N/A'}. ${scalpHealth.notes || ''}` 
              : 'Analysis pending'
          },
          {
            category: 'Hair Texture',
            rating: hairTexture?.rating ?? ((result.overall_score || 50) / 10),
            severity: hairTexture?.severity ?? (result.overallSeverity || 'Medium'),
            description: hairTexture 
              ? `${hairTexture.texture || 'N/A'} ${hairTexture.quality || 'N/A'}. ${hairTexture.notes || ''}` 
              : 'Analysis pending'
          },
          {
            category: 'Potential Issues',
            rating: potentialIssues?.rating ?? ((result.overall_score || 50) / 10),
            severity: potentialIssues?.severity ?? (result.overallSeverity || 'Medium'),
            description: potentialIssues?.notes || 'Analysis pending'
          },
          {
            category: 'Growth Patterns',
            rating: growthPatterns?.rating ?? ((result.overall_score || 50) / 10),
            severity: growthPatterns?.severity ?? (result.overallSeverity || 'Medium'),
            description: growthPatterns?.general_growth || 'Analysis pending'
          },
          {
            category: 'Recommendations',
            rating: recommendations?.rating ?? ((result.overall_score || 50) / 10),
            severity: recommendations?.severity ?? (result.overallSeverity || 'Medium'),
            description: recommendations?.notes || 'Analysis pending'
          }
        ],
        routine: {
          morning: [
            recommendations?.hydration || 'Morning hair care routine',
            recommendations?.scalp_care || 'Scalp care routine'
          ].filter(Boolean),
          evening: [
            recommendations?.styling || 'Evening hair care routine',
            recommendations?.trimming || 'Hair maintenance routine'
          ].filter(Boolean)
        }
      };

      const report: Report = {
        id: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        result: analysisResult,
        userData: userDataForApi,
        faceImages: images,
      };

      // Save the report to the analysis_history table
      const { data: savedRecord, error: saveError } = await supabase
        .from('analysis_history')
        .insert({
          user_id: userProfile.id,
          analysis_result: report,
          analysis_type: 'hair'
        })
        .select()
        .single();
      
      if (saveError) {
        throw new Error(`Failed to save analysis report: ${saveError.message}`);
      }

      // Use the saved report data for navigation
      const finalReport = savedRecord.analysis_result;
      finalReport.id = savedRecord.id;
      
      // Store full hair analysis result for results page
      const fullHairResult = {
        ...result,
        userData: userDataForApi,
        questionnaireAnswers: questionnaireAnswers
      };
      
      navigate('/hair-analysis-results', { state: { report: finalReport, fullHairResult: fullHairResult, hairImages: images } });

    } catch (err) {
      console.error("❌ Hair analysis failed:", err);
      
      let errorMessage = "An unknown error occurred during analysis.";
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Provide more helpful error messages
        if (err.message.includes('429') || 
            err.message.includes('Resource exhausted') || 
            err.message.includes('rate limit') ||
            err.message.includes('at capacity')) {
          errorMessage = "AI service is currently at capacity. Please wait a few minutes and try again. Our API has reached its rate limit for now.";
        } else if (err.message.includes("API")) {
          errorMessage = "AI service temporarily unavailable. Please try again in a few moments.";
        } else if (err.message.includes("image") || err.message.includes("Image")) {
          errorMessage = "Image processing error. Please capture the photos again.";
        } else if (err.message.includes("parse") || err.message.includes("JSON")) {
          errorMessage = "Analysis response error. Please try again.";
        } else if (err.message.includes("quota") || err.message.includes("limit")) {
          errorMessage = "Service limit reached. Please try again later.";
        }
      }
      
      setError(errorMessage);
      setLocalMode('error');
    }
  };


  const renderContent = () => {
    if (loadingProfile) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    switch (localMode) {
      case 'questionnaire':
        return (
          <div className="space-y-4">
            <HairQuestionnaire
              userProfile={userProfile}
              existingAnswers={questionnaireAnswers}
              onBack={() => navigate('/')}
              onComplete={async (answers) => {
                console.log('Hair Questionnaire complete:', answers);
                setQuestionnaireAnswers(answers);
                
                // Save to Supabase profiles table
                try {
                  if (user?.id) {
                    const profileUpdates: any = {
                      hair_type: answers.hairType,
                      hair_texture: answers.hairTexture,
                      hair_thickness: answers.hairThickness,
                      scalp_condition: answers.scalpCondition,
                      washing_frequency: answers.washingFrequency,
                      hair_care_products: answers.hairCareProducts,
                      chemical_treatments: answers.chemicalTreatments,
                      heat_styling_frequency: answers.heatStylingFrequency,
                      stress_level: answers.stressLevel,
                      water_quality: answers.waterQuality,
                    };

                    // Also update demographic fields if provided
                    if (answers.gender) profileUpdates.gender = answers.gender;
                    if (answers.birthdate) profileUpdates.birthdate = answers.birthdate;
                    if (answers.city) profileUpdates.city = answers.city;
                    if (answers.state) profileUpdates.state = answers.state;

                    // Update profiles table
                    const { error: profileError } = await supabase
                      .from('profiles')
                      .update(profileUpdates)
                      .eq('id', user.id);

                    if (profileError) {
                      console.error('❌ Failed to update profile with hair questionnaire:', profileError);
                    } else {
                      console.log('✅ Saved hair questionnaire answers to profiles table');
                    }

                    // Also save to questionnaire_history for tracking
                    const { error: historyError } = await supabase
                      .from('questionnaire_history')
                      .insert({
                        user_id: user.id,
                        questionnaire_data: answers,
                        questionnaire_type: 'hair'
                      });

                    if (historyError) {
                      console.warn('⚠️ Failed to save hair questionnaire history:', historyError);
    } else {
                      console.log('✅ Saved hair questionnaire to history');
                    }
                  }
                } catch (e) {
                  console.error('❌ Error saving hair questionnaire:', e);
                }
                
                // Always proceed to camera after completing questionnaire
                setLocalMode('camera');
              }}
            />
            {/* Collapsible AI Disclaimer */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl shadow-md overflow-hidden mt-4">
            <button
                type="button"
                onClick={() => setShowDisclaimer(!showDisclaimer)}
                className="w-full p-4 flex items-center justify-between hover:bg-purple-100 transition-colors min-h-[48px] text-left"
                aria-label={showDisclaimer ? "Hide disclaimer" : "Show disclaimer"}
                aria-expanded={showDisclaimer}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <h3 className="font-semibold text-purple-900">AI Analysis Disclaimer</h3>
                </div>
                {showDisclaimer ? (
                  <ChevronUp className="w-5 h-5 text-purple-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-purple-600 flex-shrink-0" />
                )}
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showDisclaimer ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-purple-900 leading-relaxed">
                    This AI-powered hair analysis is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. The analysis is based on images and questionnaire responses and may not be 100% accurate. Always consult with a qualified trichologist or healthcare provider for hair concerns or before making significant changes to your hair care routine.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'camera':
        return (
          <HairPhotoCapture onComplete={(images) => handleAnalysis([images.front, images.top])} />
        );
      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <LoaderCircle className="w-16 h-16 text-purple-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">Analyzing Your Hair...</h2>
            <p className="text-slate-600 mt-2">This may take a moment. Our AI is looking at your photos and information.</p>
          </div>
        );
      case 'error':
        return (
          <div className="text-center p-8 bg-amber-50 border-2 border-amber-200 rounded-xl max-w-md mx-auto">
            <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-amber-900 mb-3">Analysis Temporarily Unavailable</h2>
            <p className="text-amber-800 mt-2 leading-relaxed">{error || "An error occurred during analysis."}</p>
            {(error?.includes('rate limit') || error?.includes('capacity') || error?.includes('429')) && (
              <div className="mt-4 p-3 bg-amber-100 rounded-lg">
                <p className="text-sm text-amber-900">
                  💡 <strong>Tip:</strong> Wait 2-3 minutes before trying again. This helps avoid rate limits.
                </p>
              </div>
            )}
            <button 
              onClick={() => {
                setError(null);
                setLocalMode('questionnaire');
              }} 
              className="mt-6 bg-amber-500 text-white font-semibold py-3 px-8 rounded-full hover:bg-amber-600 transition-colors min-h-[48px] min-w-[48px]"
            >
              Try Again
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Android Material Design Header */}
      <AndroidPageHeader
        title="Hair Analysis"
        subtitle="AI-powered hair health assessment"
        backTo="/"
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {renderContent()}
        </div>
    </div>
  );
};

export default HairAnalysisPage;