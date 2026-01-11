import { useState } from 'react';

export default function ContractModal({ open, onClose, contract, onSign }: {
  open: boolean;
  onClose: () => void;
  contract: { id: string; title: string; body: string; signed?: boolean } | null;
  onSign: (id: string) => void;
}) {
  if (!open || !contract) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>×</button>
        <h2 className="text-xl font-bold mb-4">{contract.title}</h2>
        <div className="mb-6 whitespace-pre-line text-gray-700" style={{ minHeight: 120 }}>{contract.body}</div>
        {contract.signed ? (
          <div className="text-green-600 font-semibold">Signed</div>
        ) : (
          <button className="bg-blue-600 text-white px-6 py-2 rounded" onClick={() => onSign(contract.id)}>
            Sign Contract
          </button>
        )}
      </div>
    </div>
  );
}
