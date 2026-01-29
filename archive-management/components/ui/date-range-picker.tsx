"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  className?: string
  value?: { from?: string; to?: string }
  onChange: (value: { from?: string; to?: string }) => void
}

export function DateRangePicker({
  className,
  value,
  onChange,
}: DateRangePickerProps) {
  // 转换外部 value (字符串) 到内部 DateRange
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    if (!value?.from && !value?.to) return undefined
    return {
      from: value.from ? new Date(value.from) : undefined,
      to: value.to ? new Date(value.to) : undefined,
    }
  })

  // 同步外部 value 变化
  React.useEffect(() => {
    if (!value?.from && !value?.to) {
      setDate(undefined)
      return
    }
    setDate({
      from: value.from ? new Date(value.from) : undefined,
      to: value.to ? new Date(value.to) : undefined,
    })
  }, [value])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "yyyy-MM-dd")} -{" "}
                  {format(date.to, "yyyy-MM-dd")}
                </>
              ) : (
                format(date.from, "yyyy-MM-dd")
              )
            ) : (
              <span>选择日期范围</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate)
              if (newDate?.from) {
                onChange({
                  from: format(newDate.from, "yyyy-MM-dd"),
                  to: newDate.to ? format(newDate.to, "yyyy-MM-dd") : undefined,
                })
              } else {
                onChange({ from: undefined, to: undefined })
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
