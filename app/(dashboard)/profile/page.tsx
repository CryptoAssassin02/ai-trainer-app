import { UserProfileForm } from "@/components/profile/user-profile-form"

export default function ProfilePage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Your Fitness Profile</h1>
      <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
        Complete your profile to get personalized workout recommendations and track your progress more effectively.
      </p>
      <UserProfileForm />
    </div>
  )
} 