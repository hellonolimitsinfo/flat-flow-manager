
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const InviteHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (token && type === 'invite' && user && !processing) {
      handleInviteAcceptance(token);
    }
  }, [searchParams, user, processing]);

  const handleInviteAcceptance = async (token: string) => {
    setProcessing(true);
    
    try {
      // Find the invitation using the token
      const { data: invitation, error: inviteError } = await supabase
        .from('household_invitations')
        .select(`
          id,
          household_id,
          email,
          status,
          expires_at,
          households (
            id,
            name
          )
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (inviteError || !invitation) {
        toast({
          title: 'Invalid invitation',
          description: 'This invitation link is invalid or has expired.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        toast({
          title: 'Invitation expired',
          description: 'This invitation has expired.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', invitation.household_id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        toast({
          title: 'Already a member',
          description: 'You are already a member of this household.',
        });
        navigate('/');
        return;
      }

      // Add user to household
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: invitation.household_id,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('household_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast({
        title: 'Welcome!',
        description: `You have successfully joined ${invitation.households?.name}!`,
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation. Please try again.',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-gray-100 text-xl">Processing invitation...</div>
      </div>
    );
  }

  return null;
};
