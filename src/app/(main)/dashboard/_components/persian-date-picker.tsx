"use client";

import { useState } from "react";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const partsFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  calendar: "persian",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  calendar: "persian",
  dateStyle: "long",
  timeZone: "UTC",
});
const monthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  calendar: "persian",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

type PersianDateParts = { year: number; month: number; day: number };

function getPersianParts(date: Date): PersianDateParts {
  const parts = partsFormatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function getPersianMonthStart(date: Date) {
  const target = getPersianParts(date);
  const candidate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
  for (let offset = 0; offset <= 31; offset += 1) {
    const parts = getPersianParts(candidate);
    if (parts.year === target.year && parts.month === target.month && parts.day === 1) return candidate;
    candidate.setUTCDate(candidate.getUTCDate() - 1);
  }
  throw new Error("آغاز ماه شمسی قابل محاسبه نیست.");
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function getLocalCalendarDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12));
}

export function PersianDatePicker({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
}) {
  const initialDate = value ? parseDateKey(value) : getLocalCalendarDate();
  const [month, setMonth] = useState(() => getPersianMonthStart(initialDate));
  const [open, setOpen] = useState(false);

  const monthStart = getPersianMonthStart(month);
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(gridStart.getUTCDate() - ((monthStart.getUTCDay() + 1) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    const parts = getPersianParts(date);
    const key = toDateKey(date);
    return {
      key,
      day: parts.day,
      isCurrentMonth:
        parts.year === getPersianParts(monthStart).year && parts.month === getPersianParts(monthStart).month,
      isSelected: key === value,
      isDisabled: Boolean((minDate !== undefined && key < minDate) || (maxDate !== undefined && key > maxDate)),
    };
  });

  function moveMonth(direction: -1 | 1) {
    const next = new Date(monthStart);
    next.setUTCDate(next.getUTCDate() + (direction === 1 ? 40 : -1));
    setMonth(getPersianMonthStart(next));
  }

  return (
    <div className="grid gap-1.5">
      <span id={`${id}-label`} className="font-medium text-sm">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen && value) setMonth(getPersianMonthStart(parseDateKey(value)));
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-labelledby={`${id}-label`}
              aria-haspopup="dialog"
              aria-expanded={open}
              className="h-10 min-w-44 flex-1 justify-between gap-2 px-3 font-normal"
            >
              <span className={value ? "text-foreground" : "text-muted-foreground"}>
                {value ? dateFormatter.format(parseDateKey(value)) : "انتخاب تاریخ"}
              </span>
              <CalendarDays className="size-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent role="dialog" aria-label={`انتخاب ${label}`} align="start" className="w-80 p-3">
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="ماه قبل" onClick={() => moveMonth(-1)}>
                <ChevronRight />
              </Button>
              <p className="font-semibold">{monthFormatter.format(monthStart)}</p>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="ماه بعد" onClick={() => moveMonth(1)}>
                <ChevronLeft />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdays.map((weekday) => (
                <span key={weekday} className="py-1.5 text-muted-foreground text-xs">
                  {weekday}
                </span>
              ))}
              {days.map((day) => (
                <Button
                  key={day.key}
                  type="button"
                  variant={day.isSelected ? "default" : "ghost"}
                  size="icon-sm"
                  disabled={day.isDisabled}
                  aria-label={dateFormatter.format(parseDateKey(day.key))}
                  aria-pressed={day.isSelected}
                  className={!day.isCurrentMonth && !day.isSelected ? "text-muted-foreground/50" : ""}
                  onClick={() => {
                    onChange(day.key);
                    setOpen(false);
                  }}
                >
                  {day.day.toLocaleString("fa-IR")}
                </Button>
              ))}
            </div>
            <div className="flex justify-between border-t pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMonth(getPersianMonthStart(getLocalCalendarDate()))}
              >
                ماه جاری
              </Button>
              {value ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  پاک‌کردن تاریخ
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`پاک‌کردن ${label}`}
            onClick={() => onChange("")}
          >
            <X />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
