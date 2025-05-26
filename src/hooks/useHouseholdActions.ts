
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useHouseholdActions = (
  household: Household | null,
  setHousehold: (household: Household | null) => void,
  setMembers: (members: any[]) => void,
  fetchMembers: (householdId?: string) => Promise<void>
) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const createHousehold = async (name: string) => {
    try {
      console.log('Creating household with user:', user);
      
      // Ensure the user's profile exists and has a full_name
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      if (profileFetchError && profileFetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileFetchError);
        throw profileFetchError;
      }

      // If profile doesn't exist or doesn't have a full_name, create/update it
      if (!existingProfile || !existingProfile.full_name) {
        const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
        console.log('Updating profile with full_name:', fullName);
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: user?.id,
            email: user?.email || '',
            full_name: fullName
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw profileError;
        }
      }

      // Create the household
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .insert({
          name: name,
          created_by: user?.id
        })
        .select()
        .single();

      if (householdError) throw householdError;

      console.log('Created household:', householdData);

      // Add the creator as an admin member
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: householdData.id,
          user_id: user?.id,
          role: 'admin'
        });

      if (memberError) {
        console.error('Error adding member:', memberError);
        throw memberError;
      }

      setHousehold(householdData);
      
      // Wait a moment then fetch members to ensure everything is properly set up
      setTimeout(() => {
        fetchMembers(householdData.id);
      }, 500);
      
      toast({
        title: 'Household created!',
        description: 'Your household has been set up successfully.',
      });
    } catch (error: any) {
      console.error('Error creating household:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create household',
        variant: 'destructive',
      });
    }
  };

  const updateHouseholdName = async (name: string) => {
    if (!household) return;

    try {
      const { error } = await supabase
        .from('households')
        .update({ name: name })
        .eq('id', household.id);

      if (error) throw error;

      setHousehold({ ...household, name: name });
      toast({
        title: 'Household name updated!',
        description: 'The household name has been changed successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteHousehold = async () => {
    if (!household) return;

    try {
      const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', household.id);

      if (error) throw error;

      setHousehold(null);
      setMembers([]);
      toast({
        title: 'Household deleted',
        description: 'The household has been deleted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    createHousehold,
    updateHouseholdName,
    deleteHousehold
  };
};
