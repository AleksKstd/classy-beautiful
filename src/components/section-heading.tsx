import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}

/** Left-aligned editorial heading used by the home page sections. */
export function SectionHeading({ eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-12 max-w-2xl", className)}>
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h2 className="text-4xl sm:text-5xl leading-tight">{title}</h2>
      {description && <p className="mt-4 text-taupe-600 leading-relaxed">{description}</p>}
    </div>
  );
}
