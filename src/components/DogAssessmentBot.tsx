'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  XMarkIcon, 
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  UserGroupIcon,
  HomeIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

interface Question {
  id: string;
  question: string;
  type: 'text' | 'select' | 'radio' | 'checkbox';
  options?: string[];
  required: boolean;
  category: 'basic' | 'behavior' | 'health' | 'environment';
}

interface AssessmentResult {
  dogProfile: {
    name: string;
    age: string;
    breed: string;
    size: string;
    energyLevel: string;
    behaviorIssues: string[];
    healthIssues: string[];
    environment: string;
    experience: string;
  };
  recommendations: {
    primaryProgram: string;
    secondaryPrograms: string[];
    reasoning: string;
    urgency: 'low' | 'medium' | 'high';
  };
  code?: string;
}

const questions: Question[] = [
  // Basic Information (name removed - will be asked after login)
  {
    id: 'age',
    question: "How old is your dog?",
    type: 'select',
    options: ['Puppy (0-1 year)', 'Young (1-3 years)', 'Adult (3-7 years)', 'Senior (7+ years)'],
    required: true,
    category: 'basic'
  },
  {
    id: 'breed',
    question: "What breed is your dog?",
    type: 'text',
    required: true,
    category: 'basic'
  },
  {
    id: 'size',
    question: "What size is your dog?",
    type: 'select',
    options: ['Small (under 11 kg)', 'Medium (11-27 kg)', 'Large (27-45 kg)', 'Extra Large (45+ kg)'],
    required: true,
    category: 'basic'
  },
  
  // Behavior Assessment
  {
    id: 'energyLevel',
    question: "How would you describe your dog's energy level?",
    type: 'select',
    options: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
    required: true,
    category: 'behavior'
  },
  {
    id: 'behaviorIssues',
    question: "What behavioral issues does your dog have? (Select all that apply)",
    type: 'checkbox',
    options: [
      'Separation anxiety',
      'Aggression towards people',
      'Aggression towards other dogs',
      'Excessive barking',
      'Destructive behavior',
      'House training issues',
      'Pulling on leash',
      'Jumping on people',
      'Fear/anxiety',
      'Resource guarding',
      'None of the above'
    ],
    required: false,
    category: 'behavior'
  },
  {
    id: 'socialization',
    question: "How does your dog interact with other dogs?",
    type: 'select',
    options: ['Very friendly', 'Generally friendly', 'Neutral/cautious', 'Sometimes aggressive', 'Often aggressive', 'Unknown/untested'],
    required: true,
    category: 'behavior'
  },
  {
    id: 'trainingExperience',
    question: "What's your dog's training experience?",
    type: 'select',
    options: ['No formal training', 'Basic commands only', 'Some training classes', 'Well trained', 'Professional training'],
    required: true,
    category: 'behavior'
  },
  
  // Health & Environment
  {
    id: 'healthIssues',
    question: "Does your dog have any health issues or special needs?",
    type: 'checkbox',
    options: [
      'Mobility issues',
      'Hearing problems',
      'Vision problems',
      'Chronic illness',
      'Medication needs',
      'Dietary restrictions',
      'None'
    ],
    required: false,
    category: 'health'
  },
  {
    id: 'environment',
    question: "What's your living situation?",
    type: 'select',
    options: ['Apartment', 'House with yard', 'House without yard', 'Farm/rural', 'Other'],
    required: true,
    category: 'environment'
  },
  {
    id: 'familySituation',
    question: "Who lives with the dog?",
    type: 'checkbox',
    options: ['Just me', 'Partner/spouse', 'Children', 'Other pets', 'Elderly family members'],
    required: true,
    category: 'environment'
  },
  {
    id: 'goals',
    question: "What are your main goals for your dog?",
    type: 'checkbox',
    options: [
      'Basic obedience',
      'Behavioral improvement',
      'Socialization',
      'Exercise and stimulation',
      'Bonding and relationship',
      'Preparing for specific activities',
      'General well-being'
    ],
    required: true,
    category: 'behavior'
  }
];

const getRecommendations = (answers: Record<string, string | string[]>): AssessmentResult => {
  const behaviorIssues = Array.isArray(answers.behaviorIssues) ? answers.behaviorIssues : [];
  const healthIssues = Array.isArray(answers.healthIssues) ? answers.healthIssues : [];
  const energyLevel = answers.energyLevel;
  const trainingExperience = answers.trainingExperience;
  const socialization = answers.socialization;
  const goals = Array.isArray(answers.goals) ? answers.goals : [];

  let primaryProgram = '';
  const secondaryPrograms: string[] = [];
  let reasoning = '';
  let urgency: 'low' | 'medium' | 'high' = 'low';

  // Determine urgency based on behavior issues
  if (behaviorIssues.includes('Aggression towards people') || behaviorIssues.includes('Aggression towards other dogs')) {
    urgency = 'high';
  } else if (behaviorIssues.length > 2 || behaviorIssues.includes('Separation anxiety')) {
    urgency = 'medium';
  }

  // Primary program recommendation logic
  if (behaviorIssues.includes('Aggression towards people') || behaviorIssues.includes('Aggression towards other dogs')) {
    primaryProgram = 'Behavioral Consultation (Complex)';
    reasoning = 'Aggression issues require immediate professional intervention with a qualified behaviorist.';
  } else if (behaviorIssues.includes('Separation anxiety') || behaviorIssues.includes('Excessive barking') || behaviorIssues.includes('Destructive behavior')) {
    primaryProgram = 'Behavioral Consultation (Complex)';
    reasoning = 'Complex behavioral issues require comprehensive assessment and behavior modification.';
  } else if (behaviorIssues.includes('Socialization') || socialization === 'Sometimes aggressive' || socialization === 'Often aggressive') {
    primaryProgram = 'Social Assessment';
    reasoning = 'Social issues require professional assessment to determine the best approach.';
  } else if (trainingExperience === 'No formal training' || trainingExperience === 'Basic commands only') {
    primaryProgram = 'Behavioral Consultation (Mini)';
    reasoning = 'Starting with a mini consultation to assess needs and create a training plan.';
  } else if (energyLevel === 'Very High' || energyLevel === 'High') {
    primaryProgram = 'Private Activity & Enrichment Service';
    reasoning = 'High energy dogs benefit from structured activities and mental stimulation.';
  } else if (goals.includes('Exercise and stimulation') || goals.includes('General well-being')) {
    primaryProgram = 'The Dog Jog Walking and Socialisation Service';
    reasoning = 'Regular exercise and socialization will improve overall well-being.';
  } else {
    primaryProgram = 'Private Training';
    reasoning = 'Structured training sessions will help achieve your goals.';
  }

  // Secondary program recommendations
  if (primaryProgram !== 'Private Training') {
    secondaryPrograms.push('Private Training');
  }
  if (primaryProgram !== 'Tutoring (Private training add on)' && trainingExperience === 'No formal training') {
    secondaryPrograms.push('Tutoring (Private training add on)');
  }
  if (primaryProgram !== 'The Dog Jog Walking and Socialisation Service' && energyLevel === 'High') {
    secondaryPrograms.push('The Dog Jog Walking and Socialisation Service');
  }

  return {
    dogProfile: {
      name: '', // Will be filled in after login
      age: Array.isArray(answers.age) ? answers.age[0] || '' : answers.age || '',
      breed: Array.isArray(answers.breed) ? answers.breed[0] || '' : answers.breed || '',
      size: Array.isArray(answers.size) ? answers.size[0] || '' : answers.size || '',
      energyLevel: Array.isArray(answers.energyLevel) ? answers.energyLevel[0] || '' : answers.energyLevel || '',
      behaviorIssues: behaviorIssues,
      healthIssues: healthIssues,
      environment: Array.isArray(answers.environment) ? answers.environment[0] || '' : answers.environment || '',
      experience: Array.isArray(answers.trainingExperience) ? answers.trainingExperience[0] || '' : answers.trainingExperience || ''
    },
    recommendations: {
      primaryProgram,
      secondaryPrograms,
      reasoning,
      urgency
    }
  };
};

interface DogAssessmentBotProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: AssessmentResult) => void;
}

export default function DogAssessmentBot({ isOpen, onClose, onComplete }: DogAssessmentBotProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswer = (value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Assessment complete
      const assessmentResult = getRecommendations(answers);
      setResult(assessmentResult);
      setIsComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const generateAssessmentCode = () => {
    // Generate a 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = () => {
    if (result) {
      const code = generateAssessmentCode();
      
      // Store assessment with code in localStorage
      const assessmentData = {
        ...result,
        code: code,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };
      
      localStorage.setItem(`assessment_${code}`, JSON.stringify(assessmentData));
      
      // Pass the code along with the result
      onComplete({ ...result, code });
      onClose();
    }
  };

  const canProceed = () => {
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id];
    if (currentQuestion.type === 'checkbox') {
      return Array.isArray(answer) && answer.length > 0;
    }
    return answer !== undefined && answer !== '';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'basic':
        return <UserGroupIcon className="h-5 w-5" />;
      case 'behavior':
        return <HeartIcon className="h-5 w-5" />;
      case 'health':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'environment':
        return <HomeIcon className="h-5 w-5" />;
      default:
        return <ChatBubbleLeftRightIcon className="h-5 w-5" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[rgb(0_32_96)] rounded-full flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Dog Assessment Bot</h2>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Let&apos;s create a profile for your dog</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {!isComplete ? (
          <div className="p-4 sm:p-6">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[rgb(0_32_96)] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Question */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                {getCategoryIcon(currentQuestion.category)}
                <span className="text-xs sm:text-sm font-medium text-gray-600 capitalize">
                  {currentQuestion.category} Information
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 leading-relaxed">
                {currentQuestion.question}
              </h3>

              {/* Answer Input */}
              {currentQuestion.type === 'text' && (
                <Input
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  className="w-full"
                />
              )}

              {currentQuestion.type === 'select' && (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => (
                    <label key={option} className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={option}
                        checked={answers[currentQuestion.id] === option}
                        onChange={(e) => handleAnswer(e.target.value)}
                        className="text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] mt-0.5"
                      />
                      <span className="text-sm sm:text-base text-gray-700 leading-relaxed">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'checkbox' && (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => (
                    <label key={option} className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={Array.isArray(answers[currentQuestion.id]) ? (answers[currentQuestion.id] as string[]).includes(option) : false}
                        onChange={(e) => {
                          const currentValues = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] as string[] : [];
                          if (e.target.checked) {
                            handleAnswer([...currentValues, option]);
                          } else {
                            handleAnswer(currentValues.filter((v: string) => v !== option));
                          }
                        }}
                        className="text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] mt-0.5"
                      />
                      <span className="text-sm sm:text-base text-gray-700 leading-relaxed">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] w-full sm:w-auto"
              >
                {currentQuestionIndex === questions.length - 1 ? 'Complete Assessment' : 'Next'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="text-center mb-6">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Assessment Complete!</h3>
              <p className="text-gray-600">Here are our personalized recommendations for your dog</p>
              {result?.code && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">Save this code to complete your dog profile after logging in:</p>
                  <div className="text-2xl font-bold text-[rgb(0_32_96)] bg-white px-4 py-2 rounded border-2 border-[rgb(0_32_96)] inline-block">
                    {result.code}
                  </div>
                </div>
              )}
            </div>

            {result && (
              <div className="space-y-6">
                {/* Dog Profile Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <UserGroupIcon className="h-5 w-5" />
                      <span>Dog Profile</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div>
                        <span className="font-medium">Age:</span> {result.dogProfile.age}
                      </div>
                      <div>
                        <span className="font-medium">Breed:</span> {result.dogProfile.breed}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {result.dogProfile.size}
                      </div>
                      <div>
                        <span className="font-medium">Energy Level:</span> {result.dogProfile.energyLevel}
                      </div>
                      <div>
                        <span className="font-medium">Training Experience:</span> {result.dogProfile.experience}
                      </div>
                      <div>
                        <span className="font-medium">Environment:</span> {result.dogProfile.environment}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AcademicCapIcon className="h-5 w-5" />
                      <span>Program Recommendations</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-[rgb(0_32_96)]">Primary Recommendation</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(result.recommendations.urgency)}`}>
                          {result.recommendations.urgency.toUpperCase()} PRIORITY
                        </span>
                      </div>
                      <p className="font-semibold text-lg">{result.recommendations.primaryProgram}</p>
                      <p className="text-gray-600 text-sm mt-1">{result.recommendations.reasoning}</p>
                    </div>

                    {result.recommendations.secondaryPrograms.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Additional Programs</h4>
                        <ul className="space-y-1">
                          {result.recommendations.secondaryPrograms.map((program, index) => (
                            <li key={index} className="text-sm text-gray-600">• {program}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 sm:space-x-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full sm:w-auto order-3 sm:order-1"
                  >
                    Close
                  </Button>
                  <div className="flex flex-col sm:flex-row gap-3 sm:space-x-3 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Redirect to login page
                        window.location.href = '/login';
                      }}
                      className="border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white w-full sm:w-auto"
                    >
                      Login to Save Profile
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] w-full sm:w-auto"
                    >
                      Save Assessment
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
