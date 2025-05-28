
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Invitation {
  id: string;
  household_id: string;
  email: string;
  status: string;
  expires_at: string;
  households: {
    id: string;
    name: string;
  } | null;
}

export const InviteAccept = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [processing, setProcessing] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      console.log('Token from URL:', token);
      fetchInvitation();
    } else {
      console.log('No token found in URL');
      toast({
        title: 'Invalid invitation',
        description: 'No invitation token found.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      console.log('Fetching invitation for token:', token);
      
      // Use the service role or a public function to fetch invitation data
      // Since RLS might be blocking, let's try a different approach
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { invitation_token: token });

      console.log('RPC query result:', data);
      console.log('RPC query error:', error);

      if (error) {
        console.error('Error fetching invitation via RPC:', error);
        
        // Fallback to direct query without RLS restrictions
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('household_invitations')
          .select(`
            id,
            household_id,
            email,
            status,
            expires_at,
            households!inner (
              id,
              name
            )
          `)
          .eq('token', token)
          .maybeSingle();

        console.log('Fallback query result:', fallbackData);
        console.log('Fallback query error:', fallbackError);

        if (fallbackError || !fallbackData) {
          toast({
            title: 'Invalid invitation',
            description: 'This invitation is invalid or has expired.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        // Check invitation status
        if (fallbackData.status !== 'pending') {
          let title = 'Invalid invitation';
          let description = 'This invitation is no longer valid.';
          
          if (fallbackData.status === 'accepted') {
            title = 'Invitation already used';
            description = 'This invitation has already been accepted.';
          } else if (fallbackData.status === 'declined') {
            title = 'Invitation declined';
            description = 'This invitation has been declined.';
          }
          
          toast({
            title,
            description,
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        // Check if invitation has expired
        const expiresAt = new Date(fallbackData.expires_at);
        const now = new Date();
        console.log('Invitation expires at:', expiresAt);
        console.log('Current time:', now);
        
        if (expiresAt < now) {
          console.log('Invitation has expired');
          toast({
            title: 'Invitation expired',
            description: 'This invitation has expired.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        console.log('Valid invitation found:', fallbackData);
        setInvitation(fallbackData);
      } else {
        // Handle RPC success case here if we implement the RPC function
        setInvitation(data);
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitation.',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user || !invitation) {
      console.error('No user or invitation found');
      return;
    }

    setProcessing(true);
    try {
      console.log('Accepting invitation for user:', user.id);
      console.log('Household:', invitation.households);
      console.log('User email:', user.email);

      // Check if user is already a member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', invitation.household_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberCheckError) {
        console.error('Error checking existing membership:', memberCheckError);
        throw new Error('Failed to check existing membership');
      }

      if (existingMember) {
        console.log('User is already a member');
        toast({
          title: 'Already a member',
          description: 'You are already a member of this household.',
        });
        navigate('/');
        return;
      }

      console.log('Adding user to household members...');

      // Step 1: Add user to household_members table
      const { data: memberData, error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: invitation.household_id,
          user_id: user.id,
          role: 'member'
        })
        .select()
        .single();

      if (memberError) {
        console.error('Error adding member:', memberError);
        throw new Error(`Failed to add member: ${memberError.message}`);
      }

      console.log('Successfully added user to household:', memberData);

      // Step 2: Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('household_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
        // Don't throw here as the member was already added successfully
        console.warn('Member was added but invitation status update failed');
      } else {
        console.log('Successfully updated invitation status');
      }

      // Show success toast with the actual household name
      toast({
        title: 'Welcome!',
        description: `You have successfully joined ${invitation.households?.name}!`,
      });

      // Wait a moment for the toast to show, then redirect with full refresh
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);

    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-100">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading invitation...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <Card className="bg-gray-800/80 border-gray-700 max-w-md">
          <CardHeader>
            <CardTitle className="text-gray-100 text-center">Sign In Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300 text-center">
              You need to sign in to accept this invitation to join {invitation?.households?.name || 'the household'}.
            </p>
            <Button 
              onClick={() => navigate(`/auth/login?redirect=/invite?token=${token}`)}
              className="w-full bg-blue-700 hover:bg-blue-800"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate(`/auth/signup?redirect=/invite?token=${token}`)}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="bg-gray-800/80 border-gray-700 max-w-md">
        <CardHeader>
          <CardTitle className="text-gray-100 text-center">Household Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-gray-300 mb-2">
              You've been invited to join:
            </p>
            <h3 className="text-xl font-semibold text-gray-100">
              {invitation?.households?.name || 'Unknown Household'}
            </h3>
          </div>
          <Button
            onClick={acceptInvitation}
            disabled={processing}
            className="w-full bg-blue-700 hover:bg-blue-800"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
