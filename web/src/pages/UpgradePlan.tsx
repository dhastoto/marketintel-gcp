import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function UpgradePlan() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/harga", { replace: true });
  }, [navigate]);

  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );
}
