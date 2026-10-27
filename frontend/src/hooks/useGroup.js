import { useState, useEffect, useCallback } from 'react';
import { getMyGroup } from '../api/groups.api';

const useGroup = () => {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGroup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyGroup();
      if (res.success && res.data) {
        setGroup(res.data);
        const mappedMembers = res.data.members ? res.data.members.map(m => m.student) : [];
        setMembers(mappedMembers);
      } else {
        setGroup(null);
        setMembers([]);
      }
    } catch (err) {
      // Avoid throwing unhandled reject or general crash. If 404 is returned (meaning no group), set group to null, no error.
      if (err.response && err.response.status === 404) {
        setGroup(null);
        setMembers([]);
      } else {
        setError(err.response?.data?.error?.message || 'Failed to fetch group details');
        setGroup(null);
        setMembers([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  return {
    group,
    members,
    loading,
    error,
    refetch: fetchGroup
  };
};

export default useGroup;
