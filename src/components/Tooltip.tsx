import { useId, useState, type ReactNode } from "react";

interface Props {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left";
}

/** Infobulle accessible : visible au survol et au focus clavier. */
export function Tooltip({ content, children, side = "top" }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="tt-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span role="tooltip" id={id} className={`tt tt-${side}`}>
          {content}
        </span>
      )}
    </span>
  );
}
