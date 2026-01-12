import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LoaderCircle, History, Camera, AlertCircle, ChevronDown, ChevronUp, Flag } from "lucide-react";
import { AndroidPageHeader } from "../../components/AndroidBackButton";
import Questionnaire, { QuestionnaireAnswers } from "../../components/Questionnaire";
import PhotoCapture from "../../components/PhotoCapture";
import { analyzeSkin } from "../../services/geminiServiceEdge";
import { useAuth } from "../../App";
import { UserData, Report } from "../../types";
import { supabase } from "../../lib/supabase";
import ServiceReportModal from "../../components/ServiceReportModal";

const KnowYourSkinPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<any | undefined>(undefined);
  const [localMode, setLocalMode] = useState<'mcq' | 'camera' | 'analyzing' | 'error' | 'menu' | 'history'>('mcq');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentReport, setRecentReport] = useState<Report | null>(null);
  const [hasAnalysisHistory, setHasAnalysisHistory] = useState(false);
  const [allAnalyses, setAllAnalyses] = useState<any[]>([]);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      // Reset state when user changes or component initializes
      setQuestionnaireAnswers(null);
      setUserProfile(undefined);
      setHasAnalysisHistory(false);
      setAllAnalyses([]);
      setRecentReport(null);
      
      if (user) {
        // Load latest profile from Supabase to prefill MCQ and get current data
        const { data: dbProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Error loading profile:', profileError);
        }
        
        // Use dbProfile data merged with user data for accurate missing data check
        const profileForCheck = dbProfile ? { ...user, ...dbProfile } : user;
        setUserProfile(profileForCheck);

        // Also load latest questionnaire_history for skin type - use maybeSingle to handle no results
        const { data: latestQuestionnaire, error: questionnaireError } = await supabase
          .from('questionnaire_history')
          .select('questionnaire_data')
          .eq('user_id', user.id)
          .eq('questionnaire_type', 'skin')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (questionnaireError && questionnaireError.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is expected for new users
          console.error('Error loading questionnaire history:', questionnaireError);
        }

        // Prioritize questionnaire_history data over profile data, but fall back to profile
        const questionnaireData = latestQuestionnaire?.questionnaire_data || null;
        
        console.log('📋 KnowYourSkinPage: ========== DATA LOADING DEBUG ==========');
        console.log('📋 KnowYourSkinPage: Raw latestQuestionnaire:', latestQuestionnaire);
        console.log('📋 KnowYourSkinPage: Raw questionnaire_data from history:', questionnaireData);
        console.log('📋 KnowYourSkinPage: Type of questionnaire_data:', typeof questionnaireData);
        console.log('📋 KnowYourSkinPage: Loaded dbProfile:', dbProfile);
        console.log('📋 KnowYourSkinPage: primary_skin_concern from profile:', dbProfile?.primary_skin_concern);
        console.log('📋 KnowYourSkinPage: primary_skin_concern type:', typeof dbProfile?.primary_skin_concern);
        console.log('📋 KnowYourSkinPage: primary_skin_concern is array:', Array.isArray(dbProfile?.primary_skin_concern));
        if (questionnaireData) {
          console.log('📋 KnowYourSkinPage: primarySkinConcern from questionnaire_data:', questionnaireData.primarySkinConcern);
          console.log('📋 KnowYourSkinPage: primarySkinConcern type:', typeof questionnaireData.primarySkinConcern);
          console.log('📋 KnowYourSkinPage: primarySkinConcern is array:', Array.isArray(questionnaireData.primarySkinConcern));
          console.log('📋 KnowYourSkinPage: Full questionnaire_data keys:', Object.keys(questionnaireData));
          console.log('📋 KnowYourSkinPage: Full questionnaire_data:', JSON.stringify(questionnaireData, null, 2));
        } else {
          console.log('⚠️ KnowYourSkinPage: questionnaire_data is null or undefined');
        }
        console.log('📋 KnowYourSkinPage: Full dbProfile keys with skin fields:', dbProfile ? Object.keys(dbProfile).filter(k => k.includes('skin') || k.includes('Skin') || k.includes('concern')) : 'null');
        console.log('📋 KnowYourSkinPage: ===========================================');
        
        // Check if questionnaire_data is a string that needs parsing
        let parsedQuestionnaireData = questionnaireData;
        if (typeof questionnaireData === 'string') {
          try {
            parsedQuestionnaireData = JSON.parse(questionnaireData);
            console.log('📋 KnowYourSkinPage: Parsed questionnaire_data from string:', parsedQuestionnaireData);
          } catch (e) {
            console.error('📋 KnowYourSkinPage: Error parsing questionnaire_data:', e);
          }
        }
        
        // Use parsed data if available
        let dataToUse = parsedQuestionnaireData || questionnaireData;
        
        // If dataToUse is still a string, try parsing again
        if (typeof dataToUse === 'string') {
          try {
            dataToUse = JSON.parse(dataToUse);
            console.log('📋 KnowYourSkinPage: Second parse of questionnaire_data:', dataToUse);
          } catch (e) {
            console.error('📋 KnowYourSkinPage: Error in second parse:', e);
            dataToUse = null;
          }
        }
        
        // Only set questionnaire answers if we have ACTUAL questionnaire data for THIS specific user
        // Don't create defaults just because a profile exists - new users should start blank
        const hasActualQuestionnaireData = dataToUse || 
          (dbProfile && (
            dbProfile.primary_skin_concern || 
            dbProfile.skin_type || 
            dbProfile.skin_tone || 
            dbProfile.glow ||
            dbProfile.midday_skin_feel ||
            dbProfile.sunscreen_usage ||
            dbProfile.physical_activity ||
            dbProfile.sleeping_habits ||
            dbProfile.skin_treatment ||
            dbProfile.profession ||
            dbProfile.working_time ||
            dbProfile.smoking ||
            dbProfile.water_quality ||
            dbProfile.ac_usage
          ));
        
        if (hasActualQuestionnaireData) {
          // If we have questionnaire_data, use it directly (it should have all fields)
          // Otherwise, build from profile fields
          let previousAnswers: Partial<QuestionnaireAnswers> = {};
          
          if (dataToUse && typeof dataToUse === 'object' && Object.keys(dataToUse).length > 0) {
            // Use questionnaire_data directly - it should have all the fields
            console.log('📋 KnowYourSkinPage: Using questionnaire_data directly:', dataToUse);
            console.log('📋 KnowYourSkinPage: dataToUse keys:', Object.keys(dataToUse));
            console.log('📋 KnowYourSkinPage: dataToUse.primarySkinConcern:', dataToUse.primarySkinConcern);
            console.log('📋 KnowYourSkinPage: dataToUse.primarySkinConcern type:', typeof dataToUse.primarySkinConcern);
            console.log('📋 KnowYourSkinPage: dataToUse.primarySkinConcern is array:', Array.isArray(dataToUse.primarySkinConcern));
            
            // Deep clone the data to avoid reference issues - include ALL fields from dataToUse
            previousAnswers = JSON.parse(JSON.stringify(dataToUse)) as Partial<QuestionnaireAnswers>;
            
            // Helper function to normalize primarySkinConcern to array
            const normalizePrimarySkinConcern = (value: any): string[] | undefined => {
              if (value === undefined || value === null) return undefined;
              if (Array.isArray(value)) {
                // Filter out any null/undefined values
                return value.filter(v => v !== null && v !== undefined && v !== '');
              }
              if (typeof value === 'string') {
                // Try to parse if it's a JSON string
                try {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) {
                    return parsed.filter(v => v !== null && v !== undefined && v !== '');
                  }
                  return [parsed].filter(v => v !== null && v !== undefined && v !== '');
                } catch {
                  // If parsing fails, treat as single string value
                  return value.trim() ? [value] : undefined;
              }
              }
              // Convert single value to array
              return [String(value)].filter(v => v !== null && v !== undefined && v !== '');
            };
            
            // Ensure primarySkinConcern is an array - check multiple sources
            let primaryConcern = normalizePrimarySkinConcern(dataToUse.primarySkinConcern);
            
            // If not found in dataToUse, try profile as fallback
            if (!primaryConcern && dbProfile?.primary_skin_concern) {
              console.log('📋 KnowYourSkinPage: primarySkinConcern not in dataToUse, trying profile:', dbProfile.primary_skin_concern);
              primaryConcern = normalizePrimarySkinConcern(dbProfile.primary_skin_concern);
            }
            
            // Set primarySkinConcern if we found it
            if (primaryConcern && primaryConcern.length > 0) {
              previousAnswers.primarySkinConcern = primaryConcern;
              console.log('✅ KnowYourSkinPage: Set primarySkinConcern:', previousAnswers.primarySkinConcern);
            } else {
              console.log('⚠️ KnowYourSkinPage: primarySkinConcern not found in any source');
            }
          } else {
            // Fallback: Build from profile fields if questionnaire_data is not available
            console.log('📋 KnowYourSkinPage: Building answers from profile fields');
            
            // Only add fields that actually exist in the data
            // Check questionnaire_data first (most recent), then fall back to profile
            // Helper function to normalize primarySkinConcern to array
            const normalizePrimarySkinConcern = (value: any): string[] | undefined => {
              if (value === undefined || value === null) return undefined;
              if (Array.isArray(value)) {
                return value.filter(v => v !== null && v !== undefined && v !== '');
              }
              if (typeof value === 'string') {
                try {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) {
                    return parsed.filter(v => v !== null && v !== undefined && v !== '');
                  }
                  return [parsed].filter(v => v !== null && v !== undefined && v !== '');
                } catch {
                  return value.trim() ? [value] : undefined;
                }
              }
              return [String(value)].filter(v => v !== null && v !== undefined && v !== '');
            };
            
            const primaryConcern = normalizePrimarySkinConcern(dataToUse?.primarySkinConcern) || 
                                   normalizePrimarySkinConcern(dbProfile?.primary_skin_concern);
            if (primaryConcern && primaryConcern.length > 0) {
              previousAnswers.primarySkinConcern = primaryConcern;
              console.log('✅ KnowYourSkinPage: Set primarySkinConcern from fallback:', previousAnswers.primarySkinConcern);
            } else {
              console.log('⚠️ KnowYourSkinPage: No primarySkinConcern found in questionnaire_data or profile');
            }
            
            if (dataToUse?.skinType || dbProfile?.skin_type) {
              previousAnswers.skinType = dataToUse?.skinType || dbProfile?.skin_type;
            }
            if (dataToUse?.skinTone || dbProfile?.skin_tone) {
              previousAnswers.skinTone = dataToUse?.skinTone || dbProfile?.skin_tone;
            }
            if (dataToUse?.glow || dbProfile?.glow) {
              previousAnswers.glow = dataToUse?.glow || dbProfile?.glow;
            }
            if (dataToUse?.middaySkinFeel || dbProfile?.midday_skin_feel) {
              previousAnswers.middaySkinFeel = dataToUse?.middaySkinFeel || dbProfile?.midday_skin_feel;
            }
            if (dataToUse?.sunscreenUsage || dbProfile?.sunscreen_usage) {
              previousAnswers.sunscreenUsage = dataToUse?.sunscreenUsage || dbProfile?.sunscreen_usage;
            }
            if (dataToUse?.physicalActivity || dbProfile?.physical_activity) {
              previousAnswers.physicalActivity = dataToUse?.physicalActivity || dbProfile?.physical_activity;
            }
            if (dataToUse?.sleepingHabits || dbProfile?.sleeping_habits) {
              previousAnswers.sleepingHabits = dataToUse?.sleepingHabits || dbProfile?.sleeping_habits;
            }
            if (dataToUse?.skinTreatment || dbProfile?.skin_treatment) {
              previousAnswers.skinTreatment = dataToUse?.skinTreatment || dbProfile?.skin_treatment;
            }
            
            // Legacy fields (optional)
            if (dataToUse?.profession || dbProfile?.profession) {
              previousAnswers.profession = dataToUse?.profession || dbProfile?.profession;
            }
            if (dataToUse?.workingHours || dbProfile?.workingTime) {
              previousAnswers.workingHours = dataToUse?.workingHours || dbProfile?.workingTime;
            }
            if (dataToUse?.workStress || dbProfile?.workStress) {
              previousAnswers.workStress = dataToUse?.workStress || dbProfile?.workStress;
            }
            if (dataToUse?.smoking || dbProfile?.smoking) {
              previousAnswers.smoking = dataToUse?.smoking || dbProfile?.smoking;
            }
            if (dataToUse?.waterQuality || dbProfile?.water_quality) {
              previousAnswers.waterQuality = dataToUse?.waterQuality || dbProfile?.water_quality;
            }
            if (dataToUse?.acUsage || dbProfile?.ac_usage) {
              previousAnswers.acUsage = dataToUse?.acUsage || dbProfile?.ac_usage;
            }
            
            // Demographic fields
            if (dataToUse?.gender || dbProfile?.gender) {
              previousAnswers.gender = dataToUse?.gender || dbProfile?.gender;
            }
            if (dataToUse?.birthdate || dbProfile?.birthdate || dbProfile?.date_of_birth) {
              previousAnswers.birthdate = dataToUse?.birthdate || dbProfile?.birthdate || dbProfile?.date_of_birth;
            }
            if (dataToUse?.city || dbProfile?.city) {
              previousAnswers.city = dataToUse?.city || dbProfile?.city;
            }
            if (dataToUse?.state || dbProfile?.state) {
              previousAnswers.state = dataToUse?.state || dbProfile?.state;
            }
          }
          
          // Only set answers if we have at least some actual data
          if (Object.keys(previousAnswers).length > 0) {
            console.log('📋 Setting questionnaire answers:', previousAnswers);
            console.log('📋 primarySkinConcern value:', previousAnswers.primarySkinConcern);
            console.log('📋 primarySkinConcern type:', typeof previousAnswers.primarySkinConcern);
            console.log('📋 primarySkinConcern is array:', Array.isArray(previousAnswers.primarySkinConcern));
            console.log('📋 All keys in previousAnswers:', Object.keys(previousAnswers));
            
            // Ensure primarySkinConcern is properly set as an array
            if (!previousAnswers.primarySkinConcern && dataToUse?.primarySkinConcern) {
              previousAnswers.primarySkinConcern = Array.isArray(dataToUse.primarySkinConcern)
                ? dataToUse.primarySkinConcern
                : [dataToUse.primarySkinConcern];
              console.log('📋 Fixed primarySkinConcern from dataToUse:', previousAnswers.primarySkinConcern);
            }
            
            setQuestionnaireAnswers(previousAnswers as QuestionnaireAnswers);
            console.log('✅ Loaded existing questionnaire answers for user:', user.id, previousAnswers);
            console.log('✅ Final primarySkinConcern after setting:', previousAnswers.primarySkinConcern);
          } else {
            setQuestionnaireAnswers(null);
            console.log('⚠️ hasActualQuestionnaireData was true but no actual values found - starting fresh for user:', user.id);
          }
        } else {
          // Clear answers for new users without any previous questionnaire data
          setQuestionnaireAnswers(null);
          console.log('📋 No previous questionnaire data found - starting fresh for user:', user.id);
        }
        
        // Check if user has all required demographic data
        const hasAllDemographicData = 
          (user as any).gender && 
          ((user as any).birthdate || (user as any).date_of_birth) && 
          (user as any).city && 
          (user as any).state && 
          (user as any).country;
        
        // Check for all analysis history - ensure we only load THIS user's history
        const { data: analysisData, error: analysisError } = await supabase
          .from('analysis_history')
          .select('id, created_at, analysis_result')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (analysisError) {
          console.error('Error loading analysis history:', analysisError);
        }

        if (analysisData && analysisData.length > 0) {
          setHasAnalysisHistory(true);
          setAllAnalyses(analysisData);
          setRecentReport(analysisData[0].analysis_result);
          
          // Only extract previous questionnaire answers from THIS user's last analysis
          // Don't override if we already have questionnaire_history data
          // Only set if questionnaireAnswers is still null (no previous data loaded)
          if (!questionnaireData && !questionnaireAnswers) {
            const lastUserData = analysisData[0].analysis_result?.userData;
            if (lastUserData && analysisData[0].analysis_result) {
              // Build from actual analysis data - these are from a completed analysis so defaults are okay
              // But only include fields that exist in the analysis data
              const previousAnswers: Partial<QuestionnaireAnswers> = {};
              
              if ((lastUserData as any).primarySkinConcern) {
                previousAnswers.primarySkinConcern = Array.isArray((lastUserData as any).primarySkinConcern)
                  ? (lastUserData as any).primarySkinConcern
                  : [(lastUserData as any).primarySkinConcern];
              }
              if ((lastUserData as any).skinType) previousAnswers.skinType = (lastUserData as any).skinType;
              if ((lastUserData as any).skinTone) previousAnswers.skinTone = (lastUserData as any).skinTone;
              if ((lastUserData as any).glow) previousAnswers.glow = (lastUserData as any).glow;
              if ((lastUserData as any).middaySkinFeel) previousAnswers.middaySkinFeel = (lastUserData as any).middaySkinFeel;
              if ((lastUserData as any).sunscreenUsage) previousAnswers.sunscreenUsage = (lastUserData as any).sunscreenUsage;
              if ((lastUserData as any).physicalActivity) previousAnswers.physicalActivity = (lastUserData as any).physicalActivity;
              if ((lastUserData as any).sleepingHabits) previousAnswers.sleepingHabits = (lastUserData as any).sleepingHabits;
              if ((lastUserData as any).skinTreatment) previousAnswers.skinTreatment = (lastUserData as any).skinTreatment;
              if (lastUserData.profession) previousAnswers.profession = lastUserData.profession;
              if (lastUserData.workingTime) previousAnswers.workingHours = lastUserData.workingTime;
              if (lastUserData.workStress) previousAnswers.workStress = lastUserData.workStress;
              if (lastUserData.smoking) previousAnswers.smoking = lastUserData.smoking;
              if (lastUserData.waterQuality) previousAnswers.waterQuality = lastUserData.waterQuality;
              if (lastUserData.acUsage) previousAnswers.acUsage = lastUserData.acUsage;
              if (lastUserData.gender) previousAnswers.gender = lastUserData.gender;
              if (lastUserData.birthdate) previousAnswers.birthdate = lastUserData.birthdate;
              if (lastUserData.city) previousAnswers.city = lastUserData.city;
              if (lastUserData.state) previousAnswers.state = lastUserData.state;
              
              // Only set if we have actual data
              if (Object.keys(previousAnswers).length > 0) {
                setQuestionnaireAnswers(previousAnswers as QuestionnaireAnswers);
                console.log('📋 Loaded previous questionnaire answers from last analysis for user:', user.id);
              }
            }
          }
        } else {
          setHasAnalysisHistory(false);
        }
        
        // If no answers from analysis, try latest questionnaire_history snapshot
        // This is a final fallback - but we should have already loaded this above
        if (!questionnaireAnswers) {
          const { data: qh } = await supabase
            .from('questionnaire_history')
            .select('questionnaire_data')
            .eq('user_id', user.id)
            .eq('questionnaire_type', 'skin')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (qh?.questionnaire_data) {
            let finalData = qh.questionnaire_data;
            // Parse if string
            if (typeof finalData === 'string') {
              try {
                finalData = JSON.parse(finalData);
              } catch (e) {
                console.error('Error parsing questionnaire_data in fallback:', e);
              }
            }
            // Ensure primarySkinConcern is an array
            if (finalData && typeof finalData === 'object') {
              if (finalData.primarySkinConcern && !Array.isArray(finalData.primarySkinConcern)) {
                finalData.primarySkinConcern = typeof finalData.primarySkinConcern === 'string' 
                  ? [finalData.primarySkinConcern] 
                  : [String(finalData.primarySkinConcern)];
              }
            }
            setQuestionnaireAnswers(finalData as QuestionnaireAnswers);
            console.log('📋 Loaded previous questionnaire answers from questionnaire_history (fallback)');
            console.log('📋 Fallback primarySkinConcern:', finalData?.primarySkinConcern);
          }
        }

        // Always start with MCQ directly (menu cards are hidden)
        setLocalMode('mcq');
      }
      setLoadingProfile(false);
    };

    initialize();
  }, [user]);

  const useLocalMcq = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    return qs.get('local') === '1' || !import.meta.env.VITE_KNOW_YOUR_SKIN_URL;
  }, [location.search]);

  const src = useMemo(() => {
    const base = import.meta.env.VITE_KNOW_YOUR_SKIN_URL || "";
    let params = new URLSearchParams();
    try {
      if (user) {
        if (user.name) params.set('name', user.name);
        if ((user as any).gender) params.set('gender', (user as any).gender);
        const b = (user as any).birthdate || (user as any).date_of_birth;
        if (b) {
          const years = Math.floor((Date.now() - new Date(b).getTime()) / (365.25*24*60*60*1000));
          if (!isNaN(years)) params.set('age', String(years));
        }
        if ((user as any).country) params.set('country', (user as any).country);
        if ((user as any).state) params.set('state', (user as any).state);
        if ((user as any).city) params.set('city', (user as any).city);
      }
    } catch {}
    // Start step based on local mode when using local fallback, else default to MCQ
    if (!params.has('start')) params.set('start', useLocalMcq ? (localMode === 'camera' ? 'camera' : 'mcq') : 'mcq');
    const qs = params.toString();
    return base ? (qs ? `${base}?${qs}` : base) : "";
  }, [useLocalMcq, localMode]);

  const handleAnalysis = async (images: string[]) => {
    if (!userProfile || !questionnaireAnswers) {
      setError("User data or questionnaire answers are missing.");
      setLocalMode('error');
      return;
    }

    setLocalMode('analyzing');

    try {
      // Persist only demographic fields that we know exist in profiles
      const profileUpdates: any = {};
      if (questionnaireAnswers.gender) profileUpdates.gender = questionnaireAnswers.gender;
      if (questionnaireAnswers.birthdate) profileUpdates.birthdate = questionnaireAnswers.birthdate;
      if (questionnaireAnswers.city) profileUpdates.city = questionnaireAnswers.city;
      if (questionnaireAnswers.state) profileUpdates.state = questionnaireAnswers.state;

      if (userProfile.id) {
        console.log('💾 SAVING DEMOGRAPHIC DATA TO SUPABASE');
        console.log('  User ID:', userProfile.id);
        console.log('  Updates:', profileUpdates);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userProfile.id);

        if (updateError) {
          console.error('❌ Failed to update profile:', updateError);
        } else {
          console.log('✅ Profile updated successfully in Supabase');
          
          // Update local state with persisted values
          const updatedProfile = { ...userProfile, ...profileUpdates };
          setUserProfile(updatedProfile);
          console.log('📊 Updated profile (state):', updatedProfile);
        }
      }

      const birthdate = questionnaireAnswers.birthdate || (userProfile as any).birthdate || (userProfile as any).date_of_birth;
      if (!birthdate) {
        throw new Error("Birthdate is missing from user profile.");
      }
      
      const parseBirthdate = (b: string) => {
        // Support ISO (YYYY-MM-DD) or DD/MM/YYYY
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
        profession: questionnaireAnswers.profession,
        workingTime: questionnaireAnswers.workingHours,
        acUsage: questionnaireAnswers.acUsage,
        smoking: questionnaireAnswers.smoking,
        waterQuality: questionnaireAnswers.waterQuality,
      } as unknown as UserData & { 
        workStress?: string;
        primarySkinConcern?: string;
        skinType?: string;
        middaySkinFeel?: string;
        sunscreenUsage?: string;
        physicalActivity?: string;
        sleepingHabits?: string;
        skinTreatment?: string;
      };
      (userDataForApi as any).workStress = (questionnaireAnswers as any).workStress || 'Medium';
      // Add new skin-specific fields
      (userDataForApi as any).primarySkinConcern = questionnaireAnswers.primarySkinConcern;
      (userDataForApi as any).skinType = questionnaireAnswers.skinType;
      (userDataForApi as any).skinTone = questionnaireAnswers.skinTone;
      (userDataForApi as any).glow = questionnaireAnswers.glow;
      (userDataForApi as any).middaySkinFeel = questionnaireAnswers.middaySkinFeel;
      (userDataForApi as any).sunscreenUsage = questionnaireAnswers.sunscreenUsage;
      (userDataForApi as any).physicalActivity = questionnaireAnswers.physicalActivity;
      (userDataForApi as any).sleepingHabits = questionnaireAnswers.sleepingHabits;
      (userDataForApi as any).skinTreatment = questionnaireAnswers.skinTreatment;

      console.log('🧩 Sending user data to AI:', userDataForApi);
      const result = await analyzeSkin(userDataForApi, images, userProfile.id);

      const report: Report = {
        id: new Date().toISOString(), // This will be replaced by the DB ID
        date: new Date().toLocaleDateString(),
        result,
        userData: userDataForApi,
        faceImages: images,
      };

      // Save the report to the analysis_history table
      const { data: savedRecord, error: saveError } = await supabase
        .from('analysis_history')
        .insert({
          user_id: userProfile.id,
          analysis_result: report,
          analysis_type: 'skin'
        })
        .select()
        .single();
      
      if (saveError) {
        throw new Error(`Failed to save analysis report: ${saveError.message}`);
      }

      // Use the saved report data for navigation
      const finalReport = savedRecord.analysis_result;
      finalReport.id = savedRecord.id;
      
      navigate('/skin-analysis-results', { state: { report: finalReport } });

    } catch (err) {
      console.error("❌ Analysis failed:", err);
      
      let errorMessage = "An unknown error occurred during analysis.";
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Provide more helpful error messages for specific cases
        if (err.message.includes('429') || 
            err.message.includes('Resource exhausted') || 
            err.message.includes('rate limit') ||
            err.message.includes('at capacity') ||
            err.message.includes('quota') ||
            err.message.includes('Quota exceeded')) {
          // Extract retry time if mentioned in error
          const retryMatch = err.message.match(/try again in (\d+) seconds?/i)
          if (retryMatch) {
            errorMessage = `AI service quota exceeded. Please try again in ${retryMatch[1]} seconds.`;
          } else {
            errorMessage = "AI service quota exceeded. Please wait a few minutes and try again, or check your API plan and billing details.";
          }
        } else if (err.message.includes("API")) {
          errorMessage = "AI service temporarily unavailable. Please try again in a few moments.";
        } else if (err.message.includes("image") || err.message.includes("Image")) {
          errorMessage = "Image processing error. Please capture the photos again.";
        } else if (err.message.includes("parse") || err.message.includes("JSON")) {
          errorMessage = "Analysis response error. Please try again.";
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
      case 'history':
        return (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLocalMode('menu')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Analysis History</h2>
                  <p className="text-sm text-gray-600">{allAnalyses.length} report{allAnalyses.length > 1 ? 's' : ''} found</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {allAnalyses.map((analysis, index) => {
                const report = analysis.analysis_result;
                const analysisDate = new Date(analysis.created_at);
                const isRecent = index === 0;
                
                // Get severity color
                const getSeverityColor = (severity: string) => {
                  switch (severity) {
                    case 'Mild': return 'bg-green-100 text-green-700 border-green-300';
                    case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
                    case 'Severe': return 'bg-red-100 text-red-700 border-red-300';
                    default: return 'bg-gray-100 text-gray-700 border-gray-300';
                  }
                };

                return (
                  <button
                    key={analysis.id}
                    onClick={() => navigate('/skin-analysis-results', { state: { report } })}
                    className={`bg-white/90 backdrop-blur-sm border-2 rounded-2xl p-5 hover:shadow-xl transition-all text-left ${
                      isRecent ? 'border-green-500 shadow-lg' : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">
                            {analysisDate.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </h3>
                          {isRecent && (
                            <span className="text-xs bg-karma-gold text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                              Latest
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {analysisDate.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(report.result.overallSeverity)}`}>
                        {report.result.overallSeverity}
                      </div>
                    </div>

                    {/* Summary preview */}
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {report.result.summary}
                    </p>

                    {/* Quick stats */}
                    <div className="flex gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-700">{report.result.parameters.length}</span>
                        <span className="text-gray-500">parameters analyzed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-700">
                          {report.result.parameters.filter((p: any) => p.severity === 'Mild' || p.severity === 'N/A').length}
                        </span>
                        <span className="text-gray-500">doing well</span>
                      </div>
                    </div>

                    {/* View indicator */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-xs text-green-600 font-semibold">
                        Tap to view full report →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 'menu':
        // Menu case kept for backward compatibility but not used
        // Directly show MCQ instead
        return null;
      case 'mcq':
        return (
          <div className="space-y-4">
            <Questionnaire
              userProfile={userProfile}
              existingAnswers={questionnaireAnswers}
              onBack={() => navigate('/')}
              onComplete={async (answers) => {
                console.log('Skin Questionnaire complete:', answers);
                setQuestionnaireAnswers(answers);
                
                // Save to Supabase profiles table and questionnaire_history
                try {
                  if (user?.id) {
                    const profileUpdates: any = {
                      // Ensure primary_skin_concern is always an array for JSONB
                      primary_skin_concern: Array.isArray(answers.primarySkinConcern) 
                        ? answers.primarySkinConcern 
                        : (answers.primarySkinConcern ? [answers.primarySkinConcern] : ['Aging']),
                    };
                    
                    // Add skin-specific fields only if they have values
                    if (answers.skinType) profileUpdates.skin_type = answers.skinType;
                    if (answers.skinTone) profileUpdates.skin_tone = answers.skinTone;
                    if (answers.glow) profileUpdates.glow = answers.glow;
                    if (answers.middaySkinFeel) profileUpdates.midday_skin_feel = answers.middaySkinFeel;
                    if (answers.sunscreenUsage) profileUpdates.sunscreen_usage = answers.sunscreenUsage;
                    if (answers.physicalActivity) profileUpdates.physical_activity = answers.physicalActivity;
                    if (answers.sleepingHabits) profileUpdates.sleeping_habits = answers.sleepingHabits;
                    if (answers.skinTreatment) profileUpdates.skin_treatment = answers.skinTreatment;
                    
                    // Legacy fields (optional) - use correct column names
                    if (answers.profession && answers.profession.trim()) profileUpdates.profession = answers.profession.trim();
                    if (answers.workingHours && answers.workingHours.trim()) profileUpdates.working_time = answers.workingHours.trim();
                    if (answers.acUsage && answers.acUsage.trim()) profileUpdates.ac_usage = answers.acUsage.trim();
                    if (answers.smoking) profileUpdates.smoking = answers.smoking;
                    if (answers.waterQuality) profileUpdates.water_quality = answers.waterQuality;

                    // Also update demographic fields if provided
                    if (answers.gender) profileUpdates.gender = answers.gender;
                    if (answers.birthdate) profileUpdates.birthdate = answers.birthdate;
                    if (answers.city && answers.city.trim()) profileUpdates.city = answers.city.trim();
                    if (answers.state && answers.state.trim()) profileUpdates.state = answers.state.trim();
                    
                    // Filter out null, undefined, or empty string values before sending to Supabase
                    const filteredProfileUpdates: any = {};
                    Object.keys(profileUpdates).forEach(key => {
                      const value = profileUpdates[key];
                      if (value !== null && value !== undefined && value !== '') {
                        filteredProfileUpdates[key] = value;
                      }
                    });
                    
                    console.log('📝 Profile updates to save:', filteredProfileUpdates);

                    // Only update if there are actual values to update
                    if (Object.keys(filteredProfileUpdates).length > 0) {
                      // Update profiles table
                      const { error: profileError } = await supabase
                        .from('profiles')
                        .update(filteredProfileUpdates)
                        .eq('id', user.id);

                      if (profileError) {
                        console.error('❌ Failed to update profile with skin questionnaire:', profileError);
                      } else {
                        console.log('✅ Saved skin questionnaire answers to profiles table');
                      }
                    } else {
                      console.log('⏭️ Skipping profile update - no valid values to save');
                    }


                    // Also save to questionnaire_history for tracking
                    const { error: historyError } = await supabase
                      .from('questionnaire_history')
                      .insert({
                        user_id: user.id,
                        questionnaire_data: answers,
                        questionnaire_type: 'skin'
                      });

                    if (historyError) {
                      console.error('❌ Failed to save questionnaire history:', historyError);
                    } else {
                      console.log('✅ Saved skin questionnaire to questionnaire_history');
                    }
                  }
                } catch (e) {
                  console.warn('Failed to save questionnaire data:', e);
                }
                // Always proceed to camera after completing questionnaire
                setLocalMode('camera');
              }}
            />
            {/* Collapsible AI Disclaimer */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl shadow-md overflow-hidden mt-4">
              <button
                type="button"
                onClick={() => setShowDisclaimer(!showDisclaimer)}
                className="w-full p-4 flex items-center justify-between hover:bg-amber-100 transition-colors min-h-[48px] text-left"
                aria-label={showDisclaimer ? "Hide disclaimer" : "Show disclaimer"}
                aria-expanded={showDisclaimer}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <h3 className="font-semibold text-amber-900">AI Analysis Disclaimer</h3>
                </div>
                {showDisclaimer ? (
                  <ChevronUp className="w-5 h-5 text-amber-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
              </button>
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showDisclaimer ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-amber-900 leading-relaxed">
                    This AI-powered skin analysis is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. The analysis is based on images and questionnaire responses and may not be 100% accurate. Always consult with a qualified dermatologist or healthcare provider for skin concerns or before making significant changes to your skincare routine.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'camera':
        return (
          <PhotoCapture onComplete={handleAnalysis} />
        );
      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <LoaderCircle className="w-16 h-16 text-teal-500 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">Analyzing Your Skin...</h2>
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
                setLocalMode('mcq');
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
        title="Know Your Skin"
        subtitle={useLocalMcq ? 'AI-powered analysis' : 'Embedded analysis'}
        backTo="/"
        rightContent={
          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Report issue"
            title="Report issue"
          >
            <Flag className="w-5 h-5 text-gray-600" />
          </button>
        }
      />
      
      {/* Report Modal */}
      <ServiceReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        serviceName="know_your_skin"
      />

      {useLocalMcq ? (
        <div className="max-w-4xl mx-auto px-4 py-6">
          {renderContent()}
        </div>
      ) : (
        <div className="w-full h-[calc(100vh-60px)]">
          <iframe
            title="Know Your Skin"
            src={src}
            className="w-full h-full border-0"
            allow="camera; microphone; clipboard-read; clipboard-write"
          />
        </div>
      )}
    </div>
  );
};

export default KnowYourSkinPage;