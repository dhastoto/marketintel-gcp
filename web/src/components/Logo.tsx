import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo({ size = "default" }: { size?: "default" | "small" }) {
  const iconSize = size === "small" ? "h-5 w-5" : "h-6 w-6";
  const textSize = size === "small" ? "text-lg" : "text-xl";

  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="gradient-amber rounded-lg p-1.5">
        <BarChart3 className={`${iconSize} text-accent-foreground`} />
      </div>
      <span className={`${textSize} font-bold tracking-tight`}>MarketIntel</span>
    </Link>
  );
}
