import React, { useEffect, useState } from 'react';
import { getStudents, getGroups, getRooms, getWaitingList } from '../../api/admin.api';
import { getAllAllocations } from '../../api/allocations.api';
import Navbar from '../../components/common/Navbar';
import Card from '../../components/common/Card';
import DataTable from '../../components/admin/DataTable';

const DataViewerPage = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'students', label: 'Students' },
    { id: 'groups', label: 'Groups' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'allocations', label: 'Allocations' },
    { id: 'waiting', label: 'Waiting List' }
  ];

  const loadTabData = async (tabId) => {
    setLoading(true);
    setData([]);
    try {
      let res;
      switch (tabId) {
        case 'students':
          res = await getStudents();
          if (res.success) {
            const mapped = (res.data || []).map(student => ({
              ...student,
              cgpa: parseFloat(student.cgpa).toFixed(2)
            }));
            setData(mapped);
          }
          break;
        case 'groups':
          res = await getGroups();
          if (res.success) {
            const mapped = (res.data || []).map(g => ({
              ...g,
              leaderCgpa: parseFloat(g.leaderCgpa).toFixed(2)
            }));
            setData(mapped);
          }
          break;
        case 'rooms':
          res = await getRooms();
          if (res.success) {
            setData(res.data || []);
          }
          break;
        case 'allocations':
          res = await getAllAllocations();
          if (res.success) {
            const mapped = (res.data || []).map((alloc) => ({
              groupCode: alloc.group?.groupCode,
              leader: alloc.group?.leader?.name,
              roomNumber: alloc.room?.roomNumber,
              hostel: alloc.room?.hostel?.name,
              allocatedAt: new Date(alloc.allocatedAt).toLocaleString()
            }));
            setData(mapped);
          }
          break;
        case 'waiting':
          res = await getWaitingList();
          if (res.success) {
            const mapped = (res.data || []).map((w) => ({
              position: w.position,
              groupCode: w.groupCode,
              leaderName: w.leaderName,
              leaderCgpa: parseFloat(w.leaderCgpa).toFixed(2),
              addedAt: new Date(w.addedAt).toLocaleString()
            }));
            setData(mapped);
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(`Error loading data for tab ${tabId}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  let columns = [];
  if (activeTab === 'students') {
    columns = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'cgpa', label: 'CGPA' },
      { key: 'branch', label: 'Branch' },
      { key: 'groupCode', label: 'Group Code' },
      { key: 'role', label: 'Role' }
    ];
  } else if (activeTab === 'groups') {
    columns = [
      { key: 'id', label: 'ID' },
      { key: 'groupCode', label: 'Code' },
      { key: 'leaderName', label: 'Leader Name' },
      { key: 'leaderCgpa', label: 'Leader CGPA' },
      { key: 'memberCount', label: 'Member Count' },
      { key: 'status', label: 'Status' }
    ];
  } else if (activeTab === 'rooms') {
    columns = [
      { key: 'id', label: 'ID' },
      { key: 'hostelName', label: 'Hostel' },
      { key: 'roomNumber', label: 'Room No.' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'status', label: 'Status' }
    ];
  } else if (activeTab === 'allocations') {
    columns = [
      { key: 'groupCode', label: 'Group Code' },
      { key: 'leader', label: 'Leader' },
      { key: 'roomNumber', label: 'Room' },
      { key: 'hostel', label: 'Hostel' },
      { key: 'allocatedAt', label: 'Allocated At' }
    ];
  } else if (activeTab === 'waiting') {
    columns = [
      { key: 'position', label: 'Position' },
      { key: 'groupCode', label: 'Group Code' },
      { key: 'leaderName', label: 'Leader' },
      { key: 'leaderCgpa', label: 'Leader CGPA' },
      { key: 'addedAt', label: 'Added At' }
    ];
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">System Data Viewer</h1>
          <p className="text-xs text-gray-500 mt-1">Read-only logs of all registered system entities.</p>
        </div>

        <div className="flex border-b border-gray-200 mb-6 space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold focus:outline-none transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card>
          <DataTable columns={columns} data={data} loading={loading} />
        </Card>
      </div>
    </div>
  );
};

export default DataViewerPage;
