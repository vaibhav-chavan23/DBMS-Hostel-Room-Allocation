import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useGroup from '../../hooks/useGroup';
import { getMyResult } from '../../api/allocations.api';
import Navbar from '../../components/common/Navbar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const DashboardPage = () => {
  const { student } = useAuth();
  const { group } = useGroup();
  const [allocationResult, setAllocationResult] = useState(null);
  const [resultLoading, setResultLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await getMyResult();
        if (res.success) {
          setAllocationResult(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch allocation result:', err);
      } finally {
        setResultLoading(false);
      }
    };
    fetchResult();
  }, []);

  if (!student) return null;

  const isLeader = group ? group.leaderId === student.id : false;
  const isGroupReady = group ? group.status === 'READY' : false;
  const showPreferencesButton = isGroupReady && isLeader;
  
  const hasResult = group ? ['ALLOCATED', 'WAITING'].includes(group.status) : false;

  let allocatedRoomName = '—';
  let waitingPosition = '—';

  if (allocationResult) {
    if (allocationResult.status === 'ALLOCATED' && allocationResult.allocation) {
      allocatedRoomName = `${allocationResult.allocation.room.hostel.name} - Room ${allocationResult.allocation.room.roomNumber}`;
    } else if (allocationResult.status === 'WAITING') {
      waitingPosition = allocationResult.position;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Hello, {student.name}</h1>
          <p className="text-gray-500 text-xs mt-1">Manage your group and request hostel rooms here.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your CGPA</div>
            <div className="text-xl font-bold text-gray-800 mt-1">{parseFloat(student.cgpa).toFixed(2)}</div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Branch</div>
            <div className="text-xl font-bold text-gray-800 mt-1 truncate">{student.branch}</div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Group Status</div>
            <div className="text-xl font-bold text-gray-800 mt-1">
              {group ? group.status : 'No Group'}
            </div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Allocated Room</div>
            <div className="text-xl font-bold text-gray-800 mt-1 truncate">{allocatedRoomName}</div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Waiting Position</div>
            <div className="text-xl font-bold text-gray-800 mt-1">{waitingPosition}</div>
          </Card>
        </div>

        <Card className="max-w-md">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={() => navigate('/group')}>
              Manage Group
            </Button>
            
            <Button
              variant="secondary"
              disabled={!showPreferencesButton}
              onClick={() => navigate('/preferences')}
            >
              Room Preferences
            </Button>

            <Button
              variant="secondary"
              disabled={!hasResult}
              onClick={() => navigate('/result')}
            >
              View Result
            </Button>
          </div>
          {!isLeader && isGroupReady && (
            <p className="text-[10px] text-gray-400 mt-2 italic">
              * Room preferences must be submitted by the group leader.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
