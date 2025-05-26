
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useHousehold } from '@/hooks/useHousehold';
import { useHouseholdActions } from '@/hooks/useHouseholdActions';
import { useInvitation } from '@/hooks/useInvitation';
import { useAuth } from '@/contexts/AuthContext';
import { HouseholdHeader } from './HouseholdHeader';
import { CreateHouseholdForm } from './CreateHouseholdForm';
import { InviteMemberSheet } from './InviteMemberSheet';
import { MembersList } from './MembersList';

export const HouseholdManagement = () => {
  const { user } = useAuth();
  const { household, members, loading, setHousehold, setMembers, fetchMembers } = useHousehold();
  const { createHousehold, updateHouseholdName, deleteHousehold } = useHouseholdActions(
    household,
    setHousehold,
    setMembers,
    fetchMembers
  );
  const { inviteMember } = useInvitation(household);

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
