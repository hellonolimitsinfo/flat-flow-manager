
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });
    } catch (error) {
      toast({
        title: 'Error signing out',
        description: 'There was a problem signing you out.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mb-8">
      {/* Profile and Sign Out Row */}
      <div className="flex justify-end items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-300">
            <User className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">{user?.email}</span>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
      
      {/* Centered Logo Row */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-2">
          🏠 Flatmate Flow
        </h1>
        <p className="text-base sm:text-lg text-gray-300">
          Keep track of chores, shopping, and responsibilities
        </p>
      </div>
    </div>
  );
};
