
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Household {
  id: string;
  name: string;
  created_by: string;
}

export const useInvitation = (household: Household | null) => {
  const { user } = useAuth();
  const { toast } = useToast();

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

      console.log('Session verified, proceeding with invitation...');

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
        .insert([invitationData])
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

  return { inviteMember };
};
