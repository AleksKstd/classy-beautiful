"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { bg } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  components,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      locale={bg}
      weekStartsOn={1}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "font-display text-lg font-medium capitalize",
        nav: "space-x-1 flex items-center",
        nav_button:
          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-taupe-300 text-taupe-600 transition-colors hover:border-cocoa hover:text-cocoa",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-taupe-500 w-9 font-normal text-[0.75rem] uppercase",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: "inline-flex h-9 w-9 items-center justify-center rounded-full p-0 text-sm font-normal transition-colors hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark aria-selected:opacity-100",
        day_selected:
          "bg-cocoa text-white hover:bg-cocoa hover:text-white focus:bg-cocoa focus:text-white",
        day_today: "font-semibold underline decoration-gold decoration-2 underline-offset-4",
        day_outside: "day-outside text-taupe-400 opacity-50",
        day_disabled: "text-taupe-300 line-through decoration-taupe-300 hover:bg-transparent cursor-default",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        ...components,
      }}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
