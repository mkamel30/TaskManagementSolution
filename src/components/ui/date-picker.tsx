import * as React from "react";
import { format, parse, isValid } from "date-fns"; // Import parse and isValid
import { ar } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input"; // Import Input component

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  date,
  setDate,
  placeholder = "اختر تاريخ",
  className,
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState<string>(
    date ? format(date, "dd/MM/yyyy", { locale: ar }) : ""
  );

  React.useEffect(() => {
    setInputValue(date ? format(date, "dd/MM/yyyy", { locale: ar }) : "");
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Attempt to parse the date from the input value
    // We'll try a few common formats
    const formats = ["dd/MM/yyyy", "dd-MM-yyyy", "yyyy-MM-dd"];
    let parsedDate: Date | null = null;

    for (const fmt of formats) {
      const candidateDate = parse(value, fmt, new Date(), { locale: ar });
      if (isValid(candidateDate)) {
        parsedDate = candidateDate;
        break;
      }
    }

    if (parsedDate) {
      setDate(parsedDate);
    } else if (value === "") {
      setDate(undefined);
    }
    // If not a valid date and not empty, keep the current date state
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      setInputValue(format(selectedDate, "dd/MM/yyyy", { locale: ar }));
    } else {
      setInputValue("");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-end text-right font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: ar }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-2">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="dd/mm/yyyy"
            className="mb-2 text-right"
            dir="ltr" // Date input is typically LTR
          />
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          locale={ar}
        />
      </PopoverContent>
    </Popover>
  );
}