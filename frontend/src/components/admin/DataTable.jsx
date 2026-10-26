import React from 'react';
import Table from '../common/Table';

const DataTable = ({ columns, data = [], loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 text-sm text-gray-500 font-medium font-sans">
        Loading requested data...
      </div>
    );
  }

  return <Table columns={columns} data={data} />;
};

export default DataTable;
