import "./activity-indicator.css";

interface ActivityIndicatorProps {
  label: string;
  detail?: string;
  compact?: boolean;
  className?: string;
}

export default function ActivityIndicator({ label, detail, compact = false, className = "" }: ActivityIndicatorProps) {
  return (
    <div className={`activity-indicator${compact ? " activity-indicator--compact" : ""} ${className}`} role="status" aria-live="polite">
      <div className="activity-indicator-signal" aria-hidden="true">
        <span className="activity-indicator-track"><i /></span>
        <span className="activity-indicator-track"><i /></span>
        <span className="activity-indicator-track"><i /></span>
        <span className="activity-indicator-node" />
      </div>
      <div className="activity-indicator-copy"><span>{label}</span>{detail && <p>{detail}</p>}</div>
    </div>
  );
}
