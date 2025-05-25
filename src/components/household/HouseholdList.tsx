
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CreateHouseholdDialog } from './CreateHouseholdDialog';
import { Users } from 'lucide-react';

interface Household {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export const HouseholdList = () => {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchHouseholds = async () => {
    if (!user) return;

    try {
      // Get households where the user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('household_members')
        .select(`
          household_id,
          households (
            id,
            name,
            created_at,
            created_by
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const householdList = memberData
        ?.map(member => member.households)
        .filter(household => household !== null) as Household[];

      setHouseholds(householdList || []);
    } catch (error: any) {
      console.error('Error fetching households:', error);
      toast({
        title: 'Error',
        description: 'Failed to load households.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, [user]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-300">Loading households...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-100">Your Households</h2>
        <CreateHouseholdDialog onHouseholdCreated={fetchHouseholds} />
      </div>

      {households.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <CardTitle className="text-gray-300 mb-2">No Households Yet</CardTitle>
            <CardDescription className="text-gray-500 mb-4">
              Create your first household to start managing chores, shopping, and expenses together.
            </CardDescription>
            <CreateHouseholdDialog onHouseholdCreated={fetchHouseholds} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {households.map((household) => (
            <Card key={household.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
              <CardHeader>
                <CardTitle className="text-gray-100">{household.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  Created {new Date(household.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-2" />
                  Household
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
