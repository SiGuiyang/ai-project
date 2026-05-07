"use client";

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({
  current,
  total,
  label,
}: ProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full space-y-1">
      {label && <p className="text-sm text-gray-600">{label}</p>}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 text-right">
        {percent}% ({current}/{total})
      </p>
    </div>
  );
}
