
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { HouseholdHeader } from './HouseholdHeader';
import { CreateHouseholdForm } from './CreateHouseholdForm';
import { InviteMemberSheet } from './InviteMemberSheet';
import { MembersList } from './MembersList';

interface Household {
  id: string;
  name: string;
  created_by: string;
}

interface HouseholdMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export const HouseholdManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHousehold();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('household-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members'
        },
        () => {
          fetchMembers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'households'
        },
        () => {
          fetchHousehold();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchHousehold = async () => {
    try {
      // Get the first household the user is a member of (for now, we'll show one household)
      const { data: memberData } = await supabase
        .from('household_members')
        .select('household_id, households(*)')
        .eq('user_id', user?.id)
        .limit(1)
        .single();

      if (memberData?.households) {
        setHousehold(memberData.households as any);
        fetchMembers(memberData.household_id);
      }
    } catch (error) {
      console.error('Error fetching household:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (householdId?: string) => {
    try {
      const targetHouseholdId = householdId || household?.id;
      if (!targetHouseholdId) return;

      const { data, error } = await supabase
        .from('household_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles!inner(full_name, email, avatar_url)
        `)
        .eq('household_id', targetHouseholdId);

      if (error) {
        console.error('Error fetching members:', error);
        return;
      }

      if (data) {
        console.log('Fetched members:', data);
        setMembers(data as any);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

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

  const inviteMember = async (email: string) => {
    if (!household || !user) {
      console.error('No household or user found');
      toast({
        title: 'Error',
        description: 'No household or user session found.',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Starting invitation process for:', email);
      console.log('Current household:', household);
      console.log('Current user ID:', user.id);
      
      // Get the current session to ensure we have a valid JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        toast({
          title: 'Authentication required',
          description: 'Please log in again to send invitations.',
          variant: 'destructive',
        });
        return;
      }

      // Verify the user is an admin of this household
      const { data: adminCheck, error: adminError } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', household.id)
        .eq('user_id', user.id)
        .single();

      if (adminError || !adminCheck || adminCheck.role !== 'admin') {
        console.error('User is not an admin of this household:', adminError);
        toast({
          title: 'Permission denied',
          description: 'You must be an admin to invite members.',
          variant: 'destructive',
        });
        return;
      }

      console.log('Admin check passed');

      // Check if user already exists and is already a member
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        // Check if they're already a member
        const { data: existingMember } = await supabase
          .from('household_members')
          .select('id')
          .eq('household_id', household.id)
          .eq('user_id', existingUser.id)
          .single();

        if (existingMember) {
          toast({
            title: 'Already a member',
            description: 'This user is already a member of your household.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Check if there's already a pending invitation
      const { data: existingInvite } = await supabase
        .from('household_invitations')
        .select('id')
        .eq('household_id', household.id)
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        toast({
          title: 'Invitation already sent',
          description: 'There is already a pending invitation for this email.',
          variant: 'destructive',
        });
        return;
      }

      console.log('Creating invitation record...');
      
      // Create invitation record with all required fields matching RLS policy
      const invitationData = {
        household_id: household.id,
        email: email,
        invited_by: user.id, // This is crucial for RLS policy
        invited_user_id: existingUser?.id || null,
        status: 'pending' as const
      };

      console.log('Invitation data to insert:', invitationData);
      
      const { data: inviteData, error: inviteError } = await supabase
        .from('household_invitations')
        .insert([invitationData]) // Use array format as suggested
        .select()
        .single();

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        throw inviteError;
      }

      console.log('Invitation record created:', inviteData);

      // Get current user's profile for the invitation email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const inviterName = profileData?.full_name || user?.email || 'Someone';

      console.log('Calling edge function with data:', {
        email,
        householdId: household.id,
        householdName: household.name,
        inviterName,
        token: inviteData.token
      });

      // Send invitation email via edge function
      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-household-invite', {
        body: {
          email: email,
          householdId: household.id,
          householdName: household.name,
          inviterName: inviterName,
          token: inviteData.token
        }
      });

      console.log('Edge function response:', emailResponse);
      console.log('Edge function error:', emailError);

      if (emailError) {
        console.error('Edge function error:', emailError);
        
        // Check if it's a configuration error
        if (emailError.message?.includes('RESEND_API_KEY')) {
          toast({
            title: 'Email service not configured',
            description: 'The email service is not properly configured. Please check your Resend API key.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Failed to send email',
            description: emailError.message || 'Could not send invitation email. The invitation has been created but no email was sent.',
          });
        }
        return;
      }

      // Check if the response indicates success
      if (emailResponse?.success) {
        toast({
          title: 'Invitation sent!',
          description: `An invitation email has been sent to ${email}.`,
        });
      } else {
        console.error('Unexpected response from edge function:', emailResponse);
        toast({
          title: 'Invitation created',
          description: 'Invitation was created but email sending status is unclear.',
        });
      }

    } catch (error: any) {
      console.error('Invite error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/80 border-gray-700">
        <CardContent className="p-6">
          <div className="text-gray-400">Loading household...</div>
        </CardContent>
      </Card>
    );
  }

  if (!household) {
    return <CreateHouseholdForm onCreateHousehold={createHousehold} />;
  }

  return (
    <Card className="bg-gray-800/80 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <HouseholdHeader 
            household={household}
            onUpdateName={updateHouseholdName}
            onDelete={deleteHousehold}
          />
          <InviteMemberSheet onInviteMember={inviteMember} />
        </div>
      </CardHeader>
      
      <CardContent>
        <MembersList members={members} currentUserId={user?.id} />
      </CardContent>
    </Card>
  );
};
