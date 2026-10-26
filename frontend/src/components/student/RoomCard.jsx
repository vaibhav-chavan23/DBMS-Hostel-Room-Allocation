import React from 'react';

const RoomCard = ({ room, isSelected, onClick }) => {
  const { roomNumber, status } = room;

  let classes = "border rounded p-4 text-center transition-colors ";
  let statusLabel = "Available";

  if (status === 'allocated') {
    classes += "bg-gray-150 border-gray-250 text-gray-400 cursor-not-allowed";
    statusLabel = "Occupied";
  } else if (status === 'maintenance') {
    classes += "bg-orange-100 border-orange-200 text-orange-700 cursor-not-allowed";
    statusLabel = "Maintenance";
  } else {
    // Available
    if (isSelected) {
      classes += "bg-blue-600 border-blue-600 text-white cursor-pointer";
    } else {
      classes += "bg-white border-gray-200 text-gray-800 hover:bg-gray-50 cursor-pointer";
    }
  }

  const handleClick = () => {
    if (status === 'available') {
      onClick();
    }
  };

  return (
    <div onClick={handleClick} className={classes}>
      <div className="text-lg font-bold">Room {roomNumber}</div>
      <div className="text-xs font-semibold uppercase mt-1 opacity-90">{statusLabel}</div>
    </div>
  );
};

export default RoomCard;
