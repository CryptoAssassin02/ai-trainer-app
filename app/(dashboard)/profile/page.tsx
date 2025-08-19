import { UserProfileForm } from "@/components/profile/user-profile-form"

export default function ProfilePage() {
  return (
    <div className="container py-10">
      <UserProfileForm 
        mode="edit"
        enableAutoSave={true}
        showAdvancedOptions={true}
        enableRealTimeValidation={true}
        showCompletionIndicator={true}
        title="Your Fitness Profile"
        description="Update your profile to keep your workout recommendations personalized and effective."
      />
    </div>
  )
} 