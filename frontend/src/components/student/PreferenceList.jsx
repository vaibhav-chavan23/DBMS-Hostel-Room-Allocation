import React from 'react';

const PreferenceList = ({ selectedRooms = [] }) => {
  if (selectedRooms.length === 0) {
    return <p className="text-gray-400 italic text-sm">No rooms selected yet.</p>;
  }

  return (
    <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700 font-sans">
      {selectedRooms.map((room) => (
        <li key={room.id} className="font-semibold">
          Room {room.roomNumber} ({room.hostel?.name || 'Hostel'})
        </li>
      ))}
    </ol>
  );
};

export default PreferenceList;
