
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface CreateHouseholdDialogProps {
  onHouseholdCreated?: () => void;
}

export const CreateHouseholdDialog = ({ onHouseholdCreated }: CreateHouseholdDialogProps) => {
  const [householdName, setHouseholdName] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a household.',
        variant: 'destructive',
      });
      return;
    }

    if (!householdName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a household name.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create the household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          name: householdName.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (householdError) throw householdError;

      // Add the creator as an admin member of the household
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      toast({
        title: 'Success!',
        description: `Household "${householdName}" created successfully.`,
      });

      setHouseholdName('');
      setOpen(false);
      onHouseholdCreated?.();
    } catch (error: any) {
      console.error('Error creating household:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create household.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Household
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Create New Household</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new household to manage chores, shopping, and expenses together.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateHousehold} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="householdName" className="text-gray-200">
              Household Name
            </Label>
            <Input
              id="householdName"
              type="text"
              placeholder="Enter household name"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creating...' : 'Create Household'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
