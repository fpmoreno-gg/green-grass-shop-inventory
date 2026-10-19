import { useNavigate } from "react-router-dom";

export function BackButton({ fallback }: { fallback?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (fallback ? navigate(fallback) : navigate(-1))}
      className="text-sm text-text-secondary hover:text-brand-dark"
    >
      ← Back
    </button>
  );
}
