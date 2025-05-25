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
      const { data: memberData } = await supabase
        .from('household_members')
        .select('household_id, households(*)')
        .eq('user_id', user?.id)
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
      // First ensure user has a profile with full_name
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (!existingProfile?.full_name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: user?.id,
            email: user?.email,
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous User'
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .insert({
          name: name,
          created_by: user?.id
        })
        .select()
        .single();

      if (householdError) throw householdError;

      // Add the creator as an admin member
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: householdData.id,
          user_id: user?.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      setHousehold(householdData);
      
      // Wait a moment then fetch members to ensure the profile is available
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
        description: error.message,
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
    if (!household) return;

    try {
      // First check if user already exists and is already a member
      const { data: existingMember } = await supabase
        .from('household_members')
        .select('id, profiles!inner(email)')
        .eq('household_id', household.id)
        .eq('profiles.email', email)
        .single();

      if (existingMember) {
        toast({
          title: 'Already a member',
          description: 'This user is already a member of your household.',
          variant: 'destructive',
        });
        return;
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

      // Create invitation record
      const { data: inviteData, error: inviteError } = await supabase
        .from('household_invitations')
        .insert({
          household_id: household.id,
          email: email,
          invited_by: user?.id
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Get current user's profile for the invitation email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      const inviterName = profileData?.full_name || user?.email || 'Someone';

      // Send invitation email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-household-invite', {
        body: {
          email: email,
          householdId: household.id,
          householdName: household.name,
          inviterName: inviterName,
          token: inviteData.token
        }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        // Don't throw here, as the invitation was created successfully
        toast({
          title: 'Invitation created',
          description: 'Invitation was created but email could not be sent. Please share the invitation link manually.',
        });
      } else {
        toast({
          title: 'Invitation sent!',
          description: `An invitation email has been sent to ${email}.`,
        });
      }
    } catch (error: any) {
      console.error('Invite error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
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
