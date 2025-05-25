import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Users, Crown, MoreHorizontal, Trash2 } from 'lucide-react';

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
  const [editingName, setEditingName] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

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
        setNewHouseholdName(memberData.households.name);
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

      const { data } = await supabase
        .from('household_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles!inner(full_name, email, avatar_url)
        `)
        .eq('household_id', targetHouseholdId);

      if (data) {
        setMembers(data as any);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const createHousehold = async () => {
    if (!newHouseholdName.trim()) return;

    try {
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .insert({
          name: newHouseholdName.trim(),
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

      // Ensure user has a profile with full_name
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (!existingProfile?.full_name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous User'
          })
          .eq('id', user?.id);

        if (profileError) console.error('Error updating profile:', profileError);
      }

      setHousehold(householdData);
      
      // Fetch members to show the creator in the list
      await fetchMembers(householdData.id);
      
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

  const updateHouseholdName = async () => {
    if (!household || !newHouseholdName.trim()) return;

    try {
      const { error } = await supabase
        .from('households')
        .update({ name: newHouseholdName.trim() })
        .eq('id', household.id);

      if (error) throw error;

      setHousehold({ ...household, name: newHouseholdName.trim() });
      setEditingName(false);
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

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !household) return;

    setInviteLoading(true);
    try {
      // First check if user already exists and is already a member
      const { data: existingMember } = await supabase
        .from('household_members')
        .select('id, profiles!inner(email)')
        .eq('household_id', household.id)
        .eq('profiles.email', inviteEmail.trim())
        .single();

      if (existingMember) {
        toast({
          title: 'Already a member',
          description: 'This user is already a member of your household.',
          variant: 'destructive',
        });
        setInviteLoading(false);
        return;
      }

      // Check if there's already a pending invitation
      const { data: existingInvite } = await supabase
        .from('household_invitations')
        .select('id')
        .eq('household_id', household.id)
        .eq('email', inviteEmail.trim())
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        toast({
          title: 'Invitation already sent',
          description: 'There is already a pending invitation for this email.',
          variant: 'destructive',
        });
        setInviteLoading(false);
        return;
      }

      // Create invitation record
      const { data: inviteData, error: inviteError } = await supabase
        .from('household_invitations')
        .insert({
          household_id: household.id,
          email: inviteEmail.trim(),
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
          email: inviteEmail.trim(),
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
          description: `An invitation email has been sent to ${inviteEmail}.`,
        });
      }

      setInviteEmail('');
    } catch (error: any) {
      console.error('Invite error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
    return (
      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Create Your Household</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter household name"
            value={newHouseholdName}
            onChange={(e) => setNewHouseholdName(e.target.value)}
            className="bg-gray-700 border-gray-600 text-gray-100"
          />
          <Button 
            onClick={createHousehold}
            className="w-full bg-blue-700 hover:bg-blue-800"
            disabled={!newHouseholdName.trim()}
          >
            Create Household
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/80 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {editingName ? (
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <Input
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                className="bg-gray-700 border-gray-600 text-gray-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateHouseholdName();
                  if (e.key === 'Escape') {
                    setEditingName(false);
                    setNewHouseholdName(household.name);
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={updateHouseholdName}
                  className="bg-green-700 hover:bg-green-800"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingName(false);
                    setNewHouseholdName(household.name);
                  }}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl sm:text-2xl text-gray-100">
                {household.name}
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingName(true)}
                className="text-gray-400 hover:text-gray-200 p-1"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-gray-200 p-1"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem 
                    onClick={deleteHousehold}
                    className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Household
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" className="bg-blue-700 hover:bg-blue-800 whitespace-nowrap">
                <Plus className="h-4 w-4 mr-1" />
                Invite Member
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-gray-800 border-gray-700">
              <SheetHeader>
                <SheetTitle className="text-gray-100">Invite New Member</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="text-sm text-gray-400">
                  Enter an email address to invite someone to your household. They'll receive an invitation email to join.
                </div>
                <Input
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-gray-100"
                />
                <Button
                  onClick={inviteMember}
                  className="w-full bg-blue-700 hover:bg-blue-800"
                  disabled={!inviteEmail.trim() || inviteLoading}
                >
                  {inviteLoading ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="h-5 w-5" />
            <span className="font-medium">Household Members ({members.length})</span>
          </div>
          
          <div className="grid gap-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profiles.avatar_url} />
                    <AvatarFallback className="bg-gray-700 text-gray-300">
                      {getInitials(member.profiles.full_name || member.profiles.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-gray-200">
                      {member.profiles.full_name || member.profiles.email}
                    </div>
                    <div className="text-sm text-gray-400">{member.profiles.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {member.role === 'admin' && (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {member.user_id === user?.id && (
                    <Badge variant="outline" className="text-blue-400 border-blue-400">
                      You
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
