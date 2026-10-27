import React, { useEffect, useState } from 'react';
import { getPendingRequests, approveRequest, rejectRequest } from '../../api/admin.api';
import Navbar from '../../components/common/Navbar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const RequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getPendingRequests();
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching pending vacate requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this vacate request?')) {
      return;
    }
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await approveRequest(id);
      if (res.success) {
        setSuccessMsg('Vacate request approved successfully.');
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        setActionError(res.error?.message || 'Failed to approve request.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error approving request.');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this vacate request?')) {
      return;
    }
    setActionError('');
    setSuccessMsg('');
    try {
      const res = await rejectRequest(id);
      if (res.success) {
        setSuccessMsg('Vacate request rejected.');
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        setActionError(res.error?.message || 'Failed to reject request.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Error rejecting request.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">
          Loading pending vacate requests...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Pending Vacate Requests</h1>
          <p className="text-xs text-gray-500 mt-1">Review and process vacate requests submitted by students.</p>
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

        <Card>
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-700">
              <thead className="bg-gray-50 font-medium text-gray-600">
                <tr>
                  <th className="px-6 py-3 border-b">Group Code</th>
                  <th className="px-6 py-3 border-b">Requested By</th>
                  <th className="px-6 py-3 border-b">Reason</th>
                  <th className="px-6 py-3 border-b">Allocated Room</th>
                  <th className="px-6 py-3 border-b">Requested At</th>
                  <th className="px-6 py-3 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No pending vacate requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => {
                    const alloc = req.group?.allocation;
                    const allocatedRoom = alloc
                      ? `${alloc.room?.hostel?.name} - Room ${alloc.room?.roomNumber}`
                      : '—';

                    return (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">
                          {req.group?.groupCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">
                          {req.student?.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-500 line-clamp-2 max-w-xs" title={req.reason}>
                            {req.reason || 'No reason provided'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">
                          {allocatedRoom}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                          {new Date(req.requestedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                          <Button variant="primary" onClick={() => handleApprove(req.id)}>
                            Approve
                          </Button>
                          <Button variant="danger" onClick={() => handleReject(req.id)}>
                            Reject
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RequestsPage;
