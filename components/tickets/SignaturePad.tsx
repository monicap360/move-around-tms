import React, { useRef } from "react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  width = 400,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  let drawing = false;
  let lastX = 0;
  let lastY = 0;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing = true;
    const rect = e.currentTarget.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.stroke();
    lastX = x;
    lastY = y;
  };

  const stopDrawing = () => {
    drawing = false;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL("image/png"));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          background: "#fff",
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "6px 16px",
            fontWeight: 600,
          }}
        >
          Save Signature
        </button>
        <button
          type="button"
          onClick={handleClear}
          style={{
            background: "#e0e7ef",
            color: "#1e293b",
            border: "none",
            borderRadius: 4,
            padding: "6px 16px",
            fontWeight: 600,
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
