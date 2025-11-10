interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    const message = title + (description ? `: ${description}` : '');
    
    if (variant === "destructive") {
      alert(`❌ ${message}`);
    } else {
      alert(`✅ ${message}`);
    }
  }

  return { toast }
}