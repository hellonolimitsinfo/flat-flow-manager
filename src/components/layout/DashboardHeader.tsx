
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
    <div className="flex items-center justify-between mb-8">
      <div className="text-center flex-1">
        <h1 className="text-4xl font-bold text-gray-100 mb-2">
          🏠 Flatmate Flow
        </h1>
        <p className="text-lg text-gray-300">
          Keep track of chores, shopping, and responsibilities
        </p>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-300">
          <User className="h-4 w-4" />
          <span className="text-sm">{user?.email}</span>
        </div>
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
