
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus } from 'lucide-react';

interface InviteMemberSheetProps {
  onInviteMember: (email: string) => Promise<void>;
}

export const InviteMemberSheet = ({ onInviteMember }: InviteMemberSheetProps) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    
    setInviteLoading(true);
    try {
      await onInviteMember(inviteEmail.trim());
      setInviteEmail('');
      setOpen(false); // Close the sheet after successful invitation
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !inviteLoading && inviteEmail.trim()) {
                handleInvite();
              }
            }}
          />
          <Button
            onClick={handleInvite}
            className="w-full bg-blue-700 hover:bg-blue-800"
            disabled={!inviteEmail.trim() || inviteLoading}
          >
            {inviteLoading ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
