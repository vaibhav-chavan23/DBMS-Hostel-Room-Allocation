import React from 'react';
import RoomCard from './RoomCard';

const RoomGrid = ({ hostel, selectedRoomIds = [], onToggle }) => {
  const { name, rooms = [] } = hostel;
  const availableCount = rooms.filter((r) => r.status === 'available').length;

  return (
    <div className="mb-6 font-sans">
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        <h3 className="text-md font-bold text-gray-800">{name}</h3>
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-semibold">
          {availableCount} Available
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            isSelected={selectedRoomIds.includes(room.id)}
            onClick={() => onToggle(room)}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomGrid;
