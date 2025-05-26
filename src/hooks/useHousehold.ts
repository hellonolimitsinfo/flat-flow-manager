
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
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

export const useHousehold = () => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

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
        (payload) => {
          console.log('Household member change detected:', payload);
          // Refresh both household and members data
          fetchHousehold();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'households'
        },
        (payload) => {
          console.log('Household change detected:', payload);
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
      setLoading(true);
      console.log('Fetching household for user:', user?.id);
      
      const { data: memberData, error } = await supabase
        .from('household_members')
        .select('household_id, households(*)')
        .eq('user_id', user?.id)
        .limit(1)
        .single();

      console.log('Household member data:', memberData);

      if (error) {
        console.log('No household found for user:', error);
        setHousehold(null);
        setMembers([]);
        return;
      }

      if (memberData?.households) {
        console.log('Setting household:', memberData.households);
        setHousehold(memberData.households as any);
        fetchMembers(memberData.household_id);
      }
    } catch (error) {
      console.error('Error fetching household:', error);
      setHousehold(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (householdId?: string) => {
    try {
      const targetHouseholdId = householdId || household?.id;
      if (!targetHouseholdId) return;

      console.log('Fetching members for household:', targetHouseholdId);

      const { data, error } = await supabase
        .from('household_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles!inner(full_name, email, avatar_url)
        `)
        .eq('household_id', targetHouseholdId);

      if (error) {
        console.error('Error fetching members:', error);
        return;
      }

      if (data) {
        console.log('Fetched members:', data);
        setMembers(data as any);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  return {
    household,
    members,
    loading,
    setHousehold,
    setMembers,
    fetchMembers
  };
};
