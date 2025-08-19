/**
 * Custom layout for profile creation that bypasses ProfileQueryProvider
 * to avoid unnecessary API calls during profile creation
 */

export default function ProfileCreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Don't wrap with ProfileQueryProvider to avoid API calls
  return <>{children}</>;
}
