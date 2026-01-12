import { AIReasoningVisualization } from "@/components/ai/ai-reasoning-visualization"

export default function AIReasoningPage() {
  const reasoningSections = [
    {
      id: "research",
      title: "Research",
      description: "Gathering and analyzing relevant information about the user's profile, goals, and constraints.",
      icon: "search",
      steps: [
        {
          id: "research-1",
          title: "User Profile Analysis",
          description: "Analyzing the user's fitness level, experience, and physical attributes.",
          details:
            "User is a 32-year-old male, 5'10\", 180 lbs, with an intermediate fitness level. Has been training consistently for 2 years with a focus on strength training. No significant injuries or limitations reported.",
          icon: "clipboard",
        },
        {
          id: "research-2",
          title: "Goal Identification",
          description: "Identifying the primary and secondary fitness goals.",
          details:
            "Primary goal: Muscle hypertrophy with a focus on upper body development. Secondary goals: Maintain overall strength and improve cardiovascular endurance.",
          isKeyDecision: true,
          icon: "target",
        },
        {
          id: "research-3",
          title: "Constraint Evaluation",
          description: "Evaluating time, equipment, and other constraints.",
          details:
            "Available training time: 4-5 days per week, 60-75 minutes per session. Equipment access: Full gym with free weights, machines, and cardio equipment. Preference for barbell and dumbbell exercises over machines.",
          icon: "scale",
        },
        {
          id: "research-4",
          title: "Training History Review",
          description: "Reviewing past training programs and response patterns.",
          details:
            "Previously followed a 5x5 strength program with good results in strength gains but limited hypertrophy. Responds well to moderate volume (10-15 sets per muscle group per week) and moderate intensity (8-12 rep range).",
          icon: "book",
        },
      ],
    },
    {
      id: "analysis",
      title: "Analysis",
      description: "Processing the gathered information to determine the optimal training approach.",
      icon: "brain",
      steps: [
        {
          id: "analysis-1",
          title: "Volume Optimization",
          description: "Determining the optimal training volume based on goals and recovery capacity.",
          details:
            "For hypertrophy-focused training, research indicates 10-20 sets per muscle group per week is optimal. Given the user's intermediate level and recovery capacity, 12-16 sets per major muscle group per week is recommended, split across 2 sessions per muscle group.",
          icon: "scale",
        },
        {
          id: "analysis-2",
          title: "Frequency Determination",
          description: "Determining the optimal training frequency for each muscle group.",
          details:
            "Research suggests training each muscle group 2-3 times per week is optimal for hypertrophy. Given the user's available training days (4-5), a upper/lower split or push/pull/legs routine would allow each muscle group to be trained 2x per week.",
          isKeyDecision: true,
          icon: "brain",
        },
        {
          id: "analysis-3",
          title: "Exercise Selection",
          description: "Selecting exercises that align with the user's goals and preferences.",
          details:
            "For upper body hypertrophy, compound movements (bench press, overhead press, rows, pull-ups) should form the foundation, supplemented with isolation exercises (lateral raises, bicep curls, tricep extensions). Exercise selection prioritizes free weights based on user preference and their superior muscle activation compared to machines.",
          icon: "file",
        },
        {
          id: "analysis-4",
          title: "Progression Model",
          description: "Designing a progression model to ensure continued adaptation.",
          details:
            "Progressive overload will be implemented through a double progression model: when the user can complete the upper end of the prescribed rep range for all sets, weight will be increased by 5-10%. For isolation exercises, a rep goal system will be used where total reps across all sets are tracked and increased over time.",
          icon: "lightbulb",
        },
      ],
    },
    {
      id: "recommendation",
      title: "Recommendation",
      description: "Synthesizing the analysis into a concrete workout recommendation.",
      icon: "sparkles",
      steps: [
        {
          id: "recommendation-1",
          title: "Program Structure",
          description: "Defining the overall program structure and split.",
          details:
            "Recommended program: Upper/Lower split performed 4 days per week (Upper A, Lower A, Upper B, Lower B). This allows each muscle group to be trained twice per week with adequate recovery time. The fifth optional day can be used for additional cardio or lagging muscle groups.",
          isKeyDecision: true,
          icon: "clipboard",
        },
        {
          id: "recommendation-2",
          title: "Workout Design",
          description: "Designing specific workouts with exercise selection, sets, and reps.",
          details:
            "Upper A focuses on horizontal pushing/pulling (bench press, rows), Upper B focuses on vertical pushing/pulling (overhead press, pull-ups). Each upper body workout contains 4-5 compound exercises and 2-3 isolation exercises. Rep ranges are primarily 8-12 for compounds and 12-15 for isolations to maximize hypertrophy stimulus.",
          icon: "file",
        },
        {
          id: "recommendation-3",
          title: "Cardio Integration",
          description: "Integrating cardiovascular training to support secondary goals.",
          details:
            "20 minutes of moderate-intensity cardio (70-80% max heart rate) recommended after lower body workouts. One additional 30-minute HIIT session on a fifth training day (optional) to improve cardiovascular endurance while minimizing interference with muscle growth.",
          icon: "target",
        },
        {
          id: "recommendation-4",
          title: "Nutrition Guidelines",
          description: "Providing basic nutrition guidelines to support the training program.",
          details:
            "For optimal muscle hypertrophy, a slight caloric surplus of 200-300 calories above maintenance is recommended. Protein intake should be 1.6-2.0g per kg of bodyweight. Carbohydrates should be prioritized around training sessions to support performance and recovery.",
          icon: "lightbulb",
        },
        {
          id: "recommendation-5",
          title: "Progress Tracking",
          description: "Establishing metrics and methods for tracking progress.",
          details:
            "Primary progress metrics: weight used for key exercises, measurements of target muscle groups (chest, arms, shoulders), and progress photos every 4 weeks. Workout log should track weights, reps, and RPE (Rate of Perceived Exertion) for all exercises to ensure progressive overload.",
          icon: "thumbsUp",
        },
      ],
    },
  ]

  return (
    <div className="container py-8">
      <h1 className="mb-2 text-3xl font-bold">AI Workout Generation Process</h1>
      <p className="mb-8 text-muted-foreground">
        Explore how our AI analyzes your profile and creates a personalized workout plan
      </p>

      <AIReasoningVisualization
        title="Hypertrophy Program Design"
        description="Reasoning process for creating a hypertrophy-focused workout program for an intermediate trainee"
        // @ts-expect-error - Type mismatch with icon properties in reasoningSections
        sections={reasoningSections}
      />
    </div>
  )
}

