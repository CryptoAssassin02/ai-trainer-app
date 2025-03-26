import React from 'react';
import { Button } from '@/components/ui/button';

interface SignOutButtonProps {
  onSignOut?: () => void;
}

export const SignOutButton: React.FC<SignOutButtonProps> = ({ onSignOut }) => {
  return (
    <Button 
      variant="ghost" 
      onClick={onSignOut}
      data-testid="sign-out-button"
    >
      Sign Out
    </Button>
  );
}; 