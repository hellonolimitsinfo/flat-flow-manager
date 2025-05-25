
import { useState } from 'react';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react';

interface Household {
  id: string;
  name: string;
  created_by: string;
}

interface HouseholdHeaderProps {
  household: Household;
  onUpdateName: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export const HouseholdHeader = ({ household, onUpdateName, onDelete }: HouseholdHeaderProps) => {
  const [editingName, setEditingName] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState(household.name);

  const handleUpdateName = async () => {
    if (!newHouseholdName.trim()) return;
    await onUpdateName(newHouseholdName.trim());
    setEditingName(false);
  };

  const handleCancel = () => {
    setEditingName(false);
    setNewHouseholdName(household.name);
  };

  if (editingName) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 flex-1">
        <Input
          value={newHouseholdName}
          onChange={(e) => setNewHouseholdName(e.target.value)}
          className="bg-gray-700 border-gray-600 text-gray-100"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleUpdateName();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleUpdateName}
            className="bg-green-700 hover:bg-green-800"
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="border-gray-600 text-gray-300"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
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
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 hover:bg-gray-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Household
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
