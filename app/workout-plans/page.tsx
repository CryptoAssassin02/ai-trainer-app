import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const workoutPlans = [
  {
    id: 1,
    title: "Beginner Strength",
    description: "Perfect for those new to strength training",
    duration: "4 weeks",
    sessions: 3,
    level: "Beginner",
    tags: ["Strength", "Full Body"],
  },
  {
    id: 2,
    title: "HIIT Cardio Blast",
    description: "High intensity interval training for maximum calorie burn",
    duration: "6 weeks",
    sessions: 4,
    level: "Intermediate",
    tags: ["Cardio", "HIIT"],
  },
  {
    id: 3,
    title: "Advanced Hypertrophy",
    description: "Focused on muscle growth and definition",
    duration: "8 weeks",
    sessions: 5,
    level: "Advanced",
    tags: ["Hypertrophy", "Split"],
  },
  {
    id: 4,
    title: "Core & Flexibility",
    description: "Improve your core strength and overall flexibility",
    duration: "4 weeks",
    sessions: 3,
    level: "All Levels",
    tags: ["Core", "Flexibility"],
  },
  {
    id: 5,
    title: "5x5 Strength Program",
    description: "Classic strength building with compound movements",
    duration: "12 weeks",
    sessions: 3,
    level: "Intermediate",
    tags: ["Strength", "Compound"],
  },
  {
    id: 6,
    title: "Bodyweight Mastery",
    description: "No equipment needed, just your body weight",
    duration: "6 weeks",
    sessions: 4,
    level: "All Levels",
    tags: ["Bodyweight", "Calisthenics"],
  },
]

export default function WorkoutPlans() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workout Plans</h1>
        <p className="text-muted-foreground">Choose a plan that fits your goals and fitness level.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {workoutPlans.map((plan) => (
          <Card key={plan.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.title}</CardTitle>
                <Badge variant="outline">{plan.level}</Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{plan.duration}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sessions/week</p>
                  <p className="font-medium">{plan.sessions}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {plan.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">View Plan</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

