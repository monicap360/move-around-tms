import { useState } from 'react';

export default function DispatcherRating({ onSubmit }: { onSubmit: (score: number, feedback: string) => void }) {
  const [score, setScore] = useState(5);
  const [feedback, setFeedback] = useState('');
  return (
    <form className="p-4 bg-gray-100 rounded-xl" onSubmit={e => { e.preventDefault(); onSubmit(score, feedback); }}>
      <label className="block mb-2 font-bold">Rate Your Dispatcher</label>
      <input type="range" min={1} max={5} value={score} onChange={e => setScore(Number(e.target.value))} className="w-full mb-2" />
      <div className="mb-2">Score: {score} / 5</div>
      <textarea className="w-full p-2 rounded mb-2" placeholder="Feedback (optional)" value={feedback} onChange={e => setFeedback(e.target.value)} />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Submit</button>
    </form>
  );
}
