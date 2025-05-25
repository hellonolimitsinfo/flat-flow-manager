
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateHouseholdFormProps {
  onCreateHousehold: (name: string) => Promise<void>;
}

export const CreateHouseholdForm = ({ onCreateHousehold }: CreateHouseholdFormProps) => {
  const [householdName, setHouseholdName] = useState('');

  const handleCreate = async () => {
    if (!householdName.trim()) return;
    await onCreateHousehold(householdName.trim());
    setHouseholdName('');
  };

  return (
    <Card className="bg-gray-800/80 border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-100">Create Your Household</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Enter household name"
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          className="bg-gray-700 border-gray-600 text-gray-100"
        />
        <Button 
          onClick={handleCreate}
          className="w-full bg-blue-700 hover:bg-blue-800"
          disabled={!householdName.trim()}
        >
          Create Household
        </Button>
      </CardContent>
    </Card>
  );
};
