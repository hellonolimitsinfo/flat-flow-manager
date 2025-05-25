
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Crown } from 'lucide-react';

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

interface MembersListProps {
  members: HouseholdMember[];
  currentUserId?: string;
}

export const MembersList = ({ members, currentUserId }: MembersListProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
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
              {member.user_id === currentUserId && (
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  You
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
