import React, { useEffect, useState, useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import useGroup from '../../hooks/useGroup';
import { getMyResult } from '../../api/allocations.api';
import { submitVacateRequest } from '../../api/admin.api';
import Navbar from '../../components/common/Navbar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const AllocationResultPage = () => {
  const { student } = useAuth();
  const { group } = useGroup();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showVacateForm, setShowVacateForm] = useState(false);
  const [reason, setReason] = useState('');
  const [vacateError, setVacateError] = useState('');
  const [vacateSuccess, setVacateSuccess] = useState('');
  const [submittingVacate, setSubmittingVacate] = useState(false);

  const fetchResult = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyResult();
      if (res.success) {
        setResult(res.data);
      }
    } catch (err) {
      console.error('Error fetching result:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  const handleVacateSubmit = async (e) => {
    e.preventDefault();
    setVacateError('');
    setVacateSuccess('');
    setSubmittingVacate(true);
    try {
      const res = await submitVacateRequest(reason);
      if (res.success) {
        setVacateSuccess('Vacate request submitted successfully!');
        setReason('');
        setShowVacateForm(false);
        fetchResult();
      } else {
        setVacateError(res.error?.message || 'Failed to submit vacate request.');
      }
    } catch (err) {
      setVacateError(err.response?.data?.error?.message || 'Error submitting vacate request.');
    } finally {
      setSubmittingVacate(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">
          Loading allocation results...
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center py-8">
            <h2 className="text-sm font-bold text-gray-800 mb-2">Room Allocation Status</h2>
            <p className="text-xs text-gray-500">
              Allocation has not been run yet. Please check back later.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const { status, allocation, vacateRequest } = result;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Allocation Result</h1>
        </div>

        {status === 'ALLOCATED' && allocation ? (
          <div className="space-y-6 max-w-md">
            <Card className="border-l-4 border-green-500">
              <div className="flex items-center space-x-2 text-green-700 mb-4">
                <span className="text-lg">✅</span>
                <span className="font-bold text-md">Room Allocated</span>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <span className="text-gray-400 font-semibold">Hostel Name:</span>{' '}
                  <span className="font-bold text-gray-800">{allocation.room.hostel.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold">Room Number:</span>{' '}
                  <span className="font-bold text-gray-800">{allocation.room.roomNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold">Allocated At:</span>{' '}
                  <span className="font-bold text-gray-850">
                    {new Date(allocation.allocatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {vacateRequest && (
                <div className="mt-6 p-4 border border-gray-150 rounded bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Vacate Request Status
                  </h3>
                  <div className="text-xs font-bold text-gray-800">
                    Status:{' '}
                    <span
                      className={`uppercase ${
                        vacateRequest.status === 'pending'
                          ? 'text-yellow-600'
                          : vacateRequest.status === 'approved'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {vacateRequest.status}
                    </span>
                  </div>
                  {vacateRequest.reason && (
                    <div className="text-xs text-gray-500 mt-2 italic">
                      Reason: "{vacateRequest.reason}"
                    </div>
                  )}
                  {vacateRequest.resolvedAt && (
                    <div className="text-[10px] text-gray-400 mt-2">
                      Resolved At: {new Date(vacateRequest.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {!vacateRequest && !showVacateForm && (
                <div className="mt-6 pt-4 border-t">
                  <Button variant="danger" onClick={() => setShowVacateForm(true)}>
                    Submit Vacate Request
                  </Button>
                </div>
              )}
            </Card>

            {showVacateForm && (
              <Card>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Vacate Room Request</h3>
                <form onSubmit={handleVacateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Reason for Vacating (Optional)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 h-24 resize-none"
                      placeholder="Please explain why you want to vacate this room..."
                    />
                  </div>
                  {vacateError && (
                    <div className="text-xs font-semibold text-red-600">{vacateError}</div>
                  )}
                  {vacateSuccess && (
                    <div className="text-xs font-semibold text-green-600">{vacateSuccess}</div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" onClick={() => setShowVacateForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="danger" disabled={submittingVacate}>
                      {submittingVacate ? 'Submitting...' : 'Confirm'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        ) : status === 'WAITING' ? (
          <Card className="max-w-md border-l-4 border-yellow-500">
            <div className="flex items-center space-x-2 text-yellow-700 mb-4">
              <span className="text-lg">⏳</span>
              <span className="font-bold text-md">On Waiting List</span>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                Your group has been placed on the waiting list because your preferred rooms were already taken.
              </p>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded text-center">
                <span className="text-gray-400 block text-xs font-semibold uppercase tracking-wider">
                  Waiting Position
                </span>
                <span className="text-2xl font-extrabold text-yellow-800 mt-1 block">{result.position}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                You will be automatically assigned to a room as soon as someone vacates.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="max-w-md text-center py-8">
            <h2 className="text-sm font-bold text-gray-800 mb-2">Room Allocation Status</h2>
            <p className="text-xs text-gray-500">
              Allocation has not been run yet. Please check back later.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AllocationResultPage;
