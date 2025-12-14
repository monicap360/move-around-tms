"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const steps = ["weight", "photo", "ticket", "plant", "material", "review"];

export default function FastTicketPage({ params }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    weight_in: "",
    weight_out: "",
    ticket_number: "",
    plant_id: "",
    material_id: "",
    photo: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function next() { setStep((s) => Math.min(s + 1, steps.length - 1)); }
  function prev() { setStep((s) => Math.max(s - 1, 0)); }

  async function submitTicket() {
    setSubmitting(true);
    // TODO: handle photo upload if needed
    const payload = {
      driver_uuid: params.driver_uuid,
      ...form,
    };
    await fetch(`/api/fastscan/tickets/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    setSuccess(true);
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400">Create Fast Ticket</h1>
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="weight" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="p-6 bg-gray-900 rounded-2xl mb-4">
              <label className="block mb-2">Weight In (lbs)</label>
              <input type="number" className="w-full p-3 rounded bg-black border border-cyan-600" value={form.weight_in} onChange={e => setForm(f => ({ ...f, weight_in: e.target.value }))} />
              <label className="block mt-4 mb-2">Weight Out (lbs)</label>
              <input type="number" className="w-full p-3 rounded bg-black border border-cyan-600" value={form.weight_out} onChange={e => setForm(f => ({ ...f, weight_out: e.target.value }))} />
              <div className="flex justify-between mt-6">
                <button className="px-4 py-2 bg-cyan-600 rounded" onClick={next}>Next</button>
              </div>
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="photo" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="p-6 bg-gray-900 rounded-2xl mb-4">
              <label className="block mb-2">Upload Ticket Photo (optional)</label>
              <input type="file" className="w-full" onChange={e => setForm(f => ({ ...f, photo: e.target.files[0] }))} />
              <div className="flex justify-between mt-6">
                <button className="px-4 py-2 bg-gray-700 rounded" onClick={prev}>Back</button>
                <button className="px-4 py-2 bg-cyan-600 rounded" onClick={next}>Next</button>
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="ticket" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="p-6 bg-gray-900 rounded-2xl mb-4">
              <label className="block mb-2">Ticket Number</label>
              <input type="text" className="w-full p-3 rounded bg-black border border-cyan-600" value={form.ticket_number} onChange={e => setForm(f => ({ ...f, ticket_number: e.target.value }))} />
              <div className="flex justify-between mt-6">
                <button className="px-4 py-2 bg-gray-700 rounded" onClick={prev}>Back</button>
                <button className="px-4 py-2 bg-cyan-600 rounded" onClick={next}>Next</button>
              </div>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="plant" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="p-6 bg-gray-900 rounded-2xl mb-4">
              <label className="block mb-2">Plant ID</label>
              <input type="text" className="w-full p-3 rounded bg-black border border-cyan-600" value={form.plant_id} onChange={e => setForm(f => ({ ...f, plant_id: e.target.value }))} />
              <div className="flex justify-between mt-6">
                <button className="px-4 py-2 bg-gray-700 rounded" onClick={prev}>Back</button>
                <button className="px-4 py-2 bg-cyan-600 rounded" onClick={next}>Next</button>
              </div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="material" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="p-6 bg-gray-900 rounded-2xl mb-4">
              <label className="block mb-2">Material ID</label>
              <input type="text" className="w-full p-3 rounded bg-black border border-cyan-600" value={form.material_id} onChange={e => setForm(f => ({ ...f, material_id: e.target.value }))} />
              <div className="flex justify-between mt-6">
                <button className="px-4 py-2 bg-gray-700 rounded" onClick={prev}>Back</button>
                <button className="px-4 py-2 bg-cyan-600 rounded" onClick={next}>Next</button>
              </div>
            </motion.div>
          )}
          {step === 5 && (
            <motion.div key="review" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="p-6 bg-gray-900 rounded-2xl mb-4">
              <h2 className="text-xl font-bold mb-2">Review Ticket</h2>
              <pre className="bg-black p-3 rounded mb-4 text-sm">
                {JSON.stringify(form, null, 2)}
              </pre>
              <div className="flex justify-between mt-6">
                <button className="px-4 py-2 bg-gray-700 rounded" onClick={prev}>Back</button>
                <button className="px-4 py-2 bg-cyan-600 rounded" onClick={submitTicket} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
              {success && <div className="text-green-400 mt-4">Ticket submitted!</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
