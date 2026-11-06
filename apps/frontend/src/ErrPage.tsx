import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "./components/ui/Button";

export default function ErrPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas bg-aurora p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <Compass className="size-6 text-violet-500" />
        </span>
        <p className="mt-6 font-display text-6xl font-semibold tracking-tighter text-ink">404</p>
        <h1 className="mt-2 text-xl font-semibold">This page took a day off</h1>
        <p className="mt-2 text-sm text-slate-500">The page you are looking for doesn't exist or has been moved.</p>
        <Link to="/dashboard" className="mt-6 inline-block">
          <Button icon={<ArrowLeft className="size-4" />}>Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
