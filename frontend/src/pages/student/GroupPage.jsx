import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useGroup from '../../hooks/useGroup';
import { 
  createGroup, 
  joinGroup, 
  leaveGroup, 
  getDiscoverableGroups, 
  getUngroupedStudents, 
  sendJoinRequest, 
  cancelJoinRequest, 
  resolveJoinRequest, 
  sendInvitation, 
  cancelInvitation, 
  resolveInvitation, 
  getPendingReqsAndInvites 
} from '../../api/groups.api';
import Navbar from '../../components/common/Navbar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';

const GroupPage = () => {
  const { student } = useAuth();
  const { group, members, loading, error, refetch } = useGroup();
  const [joinCode, setJoinCode] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState('');

  // Data states
  const [discoverableGroups, setDiscoverableGroups] = useState([]);
  const [ungroupedStudents, setUngroupedStudents] = useState([]);
  const [pendingData, setPendingData] = useState({
    outgoingRequests: [],
    incomingInvitations: [],
    incomingRequests: [],
    outgoingInvitations: []
  });
  const [tabLoading, setTabLoading] = useState(false);

  // Initialize tabs depending on group membership
  useEffect(() => {
    if (!group) {
      setActiveTab('discover');
    } else {
      setActiveTab('details');
    }
  }, [group]);

  const fetchData = async () => {
    if (!activeTab) return;
    setTabLoading(true);
    setActionError('');
    try {
      if (activeTab === 'discover') {
        const res = await getDiscoverableGroups();
        if (res.success) {
          setDiscoverableGroups(res.data || []);
        }
      } else if (activeTab === 'invite') {
        const res = await getUngroupedStudents();
        if (res.success) {
          setUngroupedStudents(res.data || []);
        }
      } else if (activeTab === 'invitations' || activeTab === 'manage') {
        const res = await getPendingReqsAndInvites();
        if (res.success) {
          setPendingData(res.data || {
            outgoingRequests: [],
            incomingInvitations: [],
            incomingRequests: [],
            outgoingInvitations: []
          });
        }
      }
    } catch (err) {
      console.error('Error loading tab data:', err);
      setActionError('Failed to load data for this section.');
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, group]);

  const handleCreateGroup = async () => {
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await createGroup();
      if (res.success) {
        setSuccessMsg('Group created successfully.');
        refetch();
      } else {
        setActionError(res.error?.message || 'Failed to create group.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error creating group.');
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setActionError('');
    setSuccessMsg('');
    if (!joinCode.trim()) {
      setActionError('Please enter a group code.');
      return;
    }
    try {
      const res = await joinGroup(joinCode.trim().toUpperCase());
      if (res.success) {
        setSuccessMsg('Successfully joined the group.');
        refetch();
      } else {
        setActionError(res.error?.message || 'Failed to join group.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error joining group.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Once you leave this group, you cannot revert this action. Continue?')) {
      return;
    }
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await leaveGroup();
      if (res.success) {
        setSuccessMsg('Successfully left the group.');
        refetch();
      } else {
        setActionError(res.error?.message || 'Failed to leave group.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error leaving group.');
    }
  };

  const handleCopyCode = () => {
    if (group && group.groupCode) {
      navigator.clipboard.writeText(group.groupCode);
      alert('Group code copied to clipboard!');
    }
  };

  // Action Handlers
  const handleSendJoinRequest = async (gId) => {
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await sendJoinRequest(gId);
      if (res.success) {
        setSuccessMsg('Join request sent successfully.');
        fetchData();
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error sending join request.');
    }
  };

  const handleCancelJoinRequest = async (reqId) => {
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await cancelJoinRequest(reqId);
      if (res.success) {
        setSuccessMsg('Join request cancelled.');
        fetchData();
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error cancelling request.');
    }
  };

  const handleResolveJoinRequest = async (reqId, action) => {
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await resolveJoinRequest(reqId, action);
      if (res.success) {
        setSuccessMsg(`Join request successfully ${action}ed.`);
        refetch();
        fetchData();
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error resolving request.');
    }
  };

  const handleSendInvitation = async (sId) => {
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await sendInvitation(sId);
      if (res.success) {
        setSuccessMsg('Group invitation sent successfully.');
        fetchData();
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error sending invitation.');
    }
  };

  const handleCancelInvitation = async (inviteId) => {
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await cancelInvitation(inviteId);
      if (res.success) {
        setSuccessMsg('Invitation cancelled successfully.');
        fetchData();
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error cancelling invitation.');
    }
  };

  const handleResolveInvitation = async (inviteId, action) => {
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await resolveInvitation(inviteId, action);
      if (res.success) {
        setSuccessMsg(`Invitation successfully ${action}ed.`);
        refetch();
        fetchData();
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error resolving invitation.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">
          Loading group information...
        </div>
      </div>
    );
  }

  // Details Tab Config
  const leaderUser = group ? members.find(m => m.id === group.leaderId) : null;
  const leaderName = leaderUser ? leaderUser.name : 'Unknown';

  const memberTableData = group ? members.map((m, idx) => ({
    num: idx + 1,
    name: m.name,
    branch: m.branch,
    cgpa: parseFloat(m.cgpa).toFixed(2),
    isLeader: m.id === group.leaderId ? '✓' : ''
  })) : [];

  const columns = [
    { key: 'num', label: '#' },
    { key: 'name', label: 'Name' },
    { key: 'branch', label: 'Branch' },
    { key: 'cgpa', label: 'CGPA' },
    { key: 'isLeader', label: 'Is Leader' }
  ];

  const showLeaveButton = group && (group.status === 'FORMING' || group.status === 'READY');

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Group Management</h1>
        </div>

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-6 text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-6 text-xs font-semibold">
            {actionError}
          </div>
        )}

        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 mb-6 text-xs font-semibold">
          {!group ? (
            <>
              <button
                onClick={() => setActiveTab('discover')}
                className={`py-2.5 px-4 -mb-px border-b-2 transition-colors ${
                  activeTab === 'discover'
                    ? 'border-blue-500 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Find Groups
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-2.5 px-4 -mb-px border-b-2 transition-colors ${
                  activeTab === 'invitations'
                    ? 'border-blue-500 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Requests & Invitations
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`py-2.5 px-4 -mb-px border-b-2 transition-colors ${
                  activeTab === 'manual'
                    ? 'border-blue-500 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Manual Creation / Join
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('details')}
                className={`py-2.5 px-4 -mb-px border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Group Details
              </button>
              {group.status === 'FORMING' && (
                <>
                  <button
                    onClick={() => setActiveTab('invite')}
                    className={`py-2.5 px-4 -mb-px border-b-2 transition-colors ${
                      activeTab === 'invite'
                        ? 'border-blue-500 text-blue-600 font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Invite Peers
                  </button>
                  <button
                    onClick={() => setActiveTab('manage')}
                    className={`py-2.5 px-4 -mb-px border-b-2 transition-colors ${
                      activeTab === 'manage'
                        ? 'border-blue-500 text-blue-600 font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Manage Requests & Invites
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Tab Contents */}
        {tabLoading && (
          <div className="text-center py-10 text-xs text-gray-500 font-semibold">
            Loading section data...
          </div>
        )}

        {!tabLoading && (
          <div>
            {/* 1. DISCOVER GROUPS TAB */}
            {activeTab === 'discover' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {discoverableGroups.length === 0 ? (
                  <div className="col-span-2 text-center text-xs text-gray-400 py-10 italic">
                    No discoverable groups currently accepting members.
                  </div>
                ) : (
                  discoverableGroups.map((g) => (
                    <Card key={g.id}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-gray-800">Group [{g.groupCode}]</h3>
                          <p className="text-[10px] text-gray-400 mt-1">Members count: {g.memberCount}/4</p>
                        </div>
                        <Button
                          variant={g.isPending ? 'secondary' : 'primary'}
                          disabled={g.isPending}
                          onClick={() => handleSendJoinRequest(g.id)}
                        >
                          {g.isPending ? 'Pending Request' : 'Request to Join'}
                        </Button>
                      </div>
                      <div className="border-t pt-3">
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Members:</div>
                        <ul className="space-y-1">
                          {g.members.map((m, idx) => (
                            <li key={idx} className="text-xs text-gray-600">
                              • {m.name} (CGPA: {parseFloat(m.cgpa).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* 2. MY REQUESTS & INVITATIONS (UNGROUPED) */}
            {activeTab === 'invitations' && (
              <div className="space-y-6">
                {/* Outgoing Requests */}
                <Card>
                  <h2 className="text-sm font-bold text-gray-800 mb-4">Outgoing Join Requests</h2>
                  {pendingData.outgoingRequests.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">You have no outgoing join requests.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingData.outgoingRequests.map((req) => (
                        <div key={req.id} className="flex justify-between items-center bg-gray-50 p-4 border rounded">
                          <div>
                            <span className="text-xs font-bold text-gray-800">Request to join Group [{req.group.groupCode}]</span>
                            <div className="text-[10px] text-gray-400 mt-1">
                              Status: <span className="uppercase font-semibold text-orange-500">{req.status}</span>
                            </div>
                          </div>
                          <Button variant="danger" onClick={() => handleCancelJoinRequest(req.id)}>
                            Cancel Request
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Incoming Invitations */}
                <Card>
                  <h2 className="text-sm font-bold text-gray-800 mb-4">Incoming Group Invitations</h2>
                  {pendingData.incomingInvitations.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No group invitations received.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingData.incomingInvitations.map((inv) => (
                        <div key={inv.id} className="bg-gray-50 p-4 border rounded flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                          <div>
                            <span className="text-xs font-bold text-gray-800">Invitation to join Group [{inv.group.groupCode}]</span>
                            <ul className="text-[11px] text-gray-500 mt-2 space-y-0.5">
                              {inv.group.members.map((m, idx) => (
                                <li key={idx}>• {m.student.name} (CGPA: {parseFloat(m.student.cgpa).toFixed(2)})</li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex gap-2 self-start md:self-center">
                            <Button variant="primary" onClick={() => handleResolveInvitation(inv.id, 'accept')}>
                              Accept
                            </Button>
                            <Button variant="secondary" onClick={() => handleResolveInvitation(inv.id, 'reject')}>
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* 3. MANUAL CREATION / JOIN */}
            {activeTab === 'manual' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <h2 className="text-sm font-bold text-gray-800 mb-2">Create a New Group</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    Start a new group. You will become the group leader. Other students can join using your code.
                  </p>
                  <Button variant="primary" onClick={handleCreateGroup}>
                    Create Group
                  </Button>
                </Card>

                <Card>
                  <h2 className="text-sm font-bold text-gray-800 mb-2">Join an Existing Group</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    Enter the 8-character code shared by your friend to join their group.
                  </p>
                  <form onSubmit={handleJoinGroup} className="flex gap-2">
                    <input
                      type="text"
                      maxLength="8"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 uppercase flex-1"
                      placeholder="CODE1234"
                      required
                    />
                    <Button type="submit" variant="primary">
                      Join
                    </Button>
                  </form>
                </Card>
              </div>
            )}

            {/* 4. GROUP DETAILS TAB (GROUPED) */}
            {activeTab === 'details' && group && (
              <div className="space-y-6">
                <Card className="max-w-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Group Invite Code</div>
                      <div className="text-2xl font-mono font-bold text-blue-600 mt-1">{group.groupCode}</div>
                    </div>
                    <Button variant="secondary" onClick={handleCopyCode}>
                      Copy Code
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6 border-t pt-4 text-xs font-medium text-gray-600">
                    <div>
                      <span className="text-gray-400">Status:</span>{' '}
                      <span className="font-bold text-gray-800">{group.status}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Leader:</span>{' '}
                      <span className="font-bold text-gray-800">{leaderName}</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-gray-800">Group Members ({members.length}/4)</h2>
                    {showLeaveButton && (
                      <Button variant="danger" onClick={handleLeaveGroup}>
                        Leave Group
                      </Button>
                    )}
                  </div>
                  <Table columns={columns} data={memberTableData} />
                  {group.status !== 'FORMING' && group.status !== 'READY' && (
                    <p className="text-[10px] text-gray-400 mt-2 italic">
                      * Group membership is locked because the status is {group.status}. Leaving is not permitted.
                    </p>
                  )}
                </Card>
              </div>
            )}

            {/* 5. INVITE PEERS TAB (GROUPED) */}
            {activeTab === 'invite' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ungroupedStudents.length === 0 ? (
                  <div className="col-span-3 text-center text-xs text-gray-400 py-10 italic">
                    No ungrouped students currently available.
                  </div>
                ) : (
                  ungroupedStudents.map((s) => (
                    <Card key={s.id} className="flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-gray-800">{s.name}</h3>
                        <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                          <p>Branch: {s.branch || 'N/A'}</p>
                          <p>CGPA: {parseFloat(s.cgpa).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button
                          variant={s.isInvited ? 'secondary' : 'primary'}
                          disabled={s.isInvited}
                          onClick={() => handleSendInvitation(s.id)}
                          className="w-full text-center"
                        >
                          {s.isInvited ? 'Invited' : 'Invite to Group'}
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* 6. MANAGE REQUESTS & INVITES (GROUPED) */}
            {activeTab === 'manage' && (
              <div className="space-y-6">
                {/* Incoming Requests */}
                <Card>
                  <h2 className="text-sm font-bold text-gray-800 mb-4">Pending Join Requests</h2>
                  {pendingData.incomingRequests.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No incoming requests to join your group.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingData.incomingRequests.map((req) => (
                        <div key={req.id} className="flex justify-between items-center bg-gray-50 p-4 border rounded">
                          <div>
                            <span className="text-xs font-bold text-gray-800">{req.student.name}</span>
                            <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                              <p>Branch: {req.student.branch || 'N/A'}</p>
                              <p>CGPA: {parseFloat(req.student.cgpa).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="primary" onClick={() => handleResolveJoinRequest(req.id, 'accept')}>
                              Accept
                            </Button>
                            <Button variant="secondary" onClick={() => handleResolveJoinRequest(req.id, 'reject')}>
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Sent Invitations */}
                <Card>
                  <h2 className="text-sm font-bold text-gray-800 mb-4">Sent Group Invitations</h2>
                  {pendingData.outgoingInvitations.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No active group invitations sent.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingData.outgoingInvitations.map((inv) => (
                        <div key={inv.id} className="flex justify-between items-center bg-gray-50 p-4 border rounded">
                          <div>
                            <span className="text-xs font-bold text-gray-800">{inv.student.name}</span>
                            <div className="text-[10px] text-gray-400 mt-1">
                              Status: <span className="uppercase font-semibold text-orange-500">{inv.status}</span>
                            </div>
                          </div>
                          <Button variant="danger" onClick={() => handleCancelInvitation(inv.id)}>
                            Cancel Invitation
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupPage;
