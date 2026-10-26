import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useGroup from '../../hooks/useGroup';
import { getAllRooms } from '../../api/rooms.api';
import { submitPreferences, getMyPreferences } from '../../api/preferences.api';
import Navbar from '../../components/common/Navbar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import RoomGrid from '../../components/student/RoomGrid';
import PreferenceList from '../../components/student/PreferenceList';

const RoomPreferencePage = () => {
  const { student } = useAuth();
  const { group, loading: groupLoading, refetch: refetchGroup } = useGroup();

  const [hostels, setHostels] = useState([]);
  const [submittedPrefs, setSubmittedPrefs] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);

  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const roomsRes = await getAllRooms();
        if (roomsRes.success) {
          setHostels(roomsRes.data.hostels || []);
        }

        const prefsRes = await getMyPreferences();
        if (prefsRes.success) {
          setSubmittedPrefs(prefsRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching room/preference data:', err);
      } finally {
        setLoadingRooms(false);
      }
    };

    if (group) {
      fetchData();
    }
  }, [group]);

  const handleRoomToggle = (room) => {
    setSelectedRooms((prev) => {
      const exists = prev.find((r) => r.id === room.id);
      if (exists) {
        return prev.filter((r) => r.id !== room.id);
      } else {
        return [...prev, room];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedRooms.length === 0) {
      setError('Please select at least one room preference.');
      return;
    }

    if (!window.confirm('Once submitted, your group will be locked. Continue?')) {
      return;
    }

    setSubmitting(true);
    try {
      const roomIds = selectedRooms.map((r) => r.id);
      const res = await submitPreferences(roomIds);
      if (res.success) {
        setSuccess('Preferences submitted successfully!');
        refetchGroup();
        const updatedPrefs = await getMyPreferences();
        if (updatedPrefs.success) {
          setSubmittedPrefs(updatedPrefs.data || []);
        }
      } else {
        setError(res.error?.message || 'Failed to submit preferences.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Error submitting preferences.');
    } finally {
      setSubmitting(false);
    }
  };

  if (groupLoading || loadingRooms) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">
          Loading preferences page...
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <p className="text-gray-500 italic text-center text-sm">
              You must create or join a group before submitting room preferences.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const isLeader = group.leaderId === student.id;
  const isForming = group.status === 'FORMING';
  const isReady = group.status === 'READY';
  const isSubmitted = ['PREFERENCES_SUBMITTED', 'ALLOCATED', 'WAITING'].includes(group.status);

  if (isSubmitted || !isLeader || isForming) {
    let displayMessage = '';
    if (!isLeader) {
      displayMessage = 'Only the group leader can submit and configure room preferences.';
    } else if (isForming) {
      displayMessage = 'Your group is still FORMING. You need 4 members to lock the group and submit preferences.';
    } else if (isSubmitted) {
      displayMessage = 'Your group has already submitted preferences and is locked.';
    }

    const mappedPrefs = submittedPrefs.map(p => p.room);

    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-800">Room Preferences</h1>
            <p className="text-xs text-slate-500 mt-1">{displayMessage}</p>
          </div>

          <Card className="max-w-xl">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Submitted Preferences</h2>
            <PreferenceList selectedRooms={mappedPrefs} />
          </Card>
        </div>
      </div>
    );
  }

  const selectedRoomIds = selectedRooms.map((r) => r.id);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Room Preferences</h1>
          <p className="text-xs text-slate-500 mt-1">
            Click available rooms in your preferred order to select them.
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-6 text-xs font-semibold">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-6 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <h2 className="text-sm font-bold text-gray-800 mb-4">Room Selection Grid</h2>
              {hostels.map((hostel) => (
                <RoomGrid
                  key={hostel.id}
                  hostel={hostel}
                  selectedRoomIds={selectedRoomIds}
                  onToggle={handleRoomToggle}
                />
              ))}
            </Card>
          </div>

          <div>
            <Card className="sticky top-6">
              <h2 className="text-sm font-bold text-gray-800 mb-4">Selected Preference Order</h2>
              <div className="mb-6">
                <PreferenceList selectedRooms={selectedRooms} />
              </div>
              <Button
                variant="primary"
                disabled={selectedRooms.length === 0 || submitting}
                onClick={handleSubmit}
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Preferences'}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPreferencePage;
