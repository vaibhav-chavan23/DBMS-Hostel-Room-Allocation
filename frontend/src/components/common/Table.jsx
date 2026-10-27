import React from 'react';

const Table = ({ columns, data = [] }) => {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded">
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-700">
        <thead className="bg-gray-50 font-medium text-gray-600">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3 border-b border-gray-200">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-150 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-400">
                No data found.
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                    {row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
