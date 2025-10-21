'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'booking' | 'session';
  status: string;
  time: string;
  color: string;
}

interface CalendarProps {
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: (date?: Date) => void;
}

export function Calendar({ events, onDateClick, onEventClick, onAddEvent }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs"
          >
            Today
          </Button>
          {onAddEvent && (
            <Button
              size="sm"
              onClick={() => onAddEvent()}
              className="text-xs bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Event
            </Button>
          )}
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="p-1"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="p-1"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const isToday = day && day.toDateString() === today.toDateString();
          const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
          const dayEvents = day ? getEventsForDate(day) : [];

          return (
            <div
              key={index}
              className={cn(
                "min-h-[140px] border-r border-b last:border-r-0 p-2",
                !isCurrentMonth && "bg-gray-50",
                isToday && "bg-[rgb(0_32_96)] bg-opacity-5"
              )}
            >
              {day && (
                <>
                  <div
                    className={cn(
                      "text-sm font-medium mb-2 cursor-pointer hover:bg-gray-100 rounded p-1",
                      isToday && "text-[rgb(0_32_96)] font-bold",
                      !isCurrentMonth && "text-gray-400",
                      isCurrentMonth && !isToday && "text-black"
                    )}
                    onClick={() => onDateClick?.(day)}
                  >
                    {day.getDate()}
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1.5">
                    {dayEvents.slice(0, 4).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs p-1.5 rounded cursor-pointer truncate",
                          event.color,
                          "hover:opacity-80"
                        )}
                        onClick={() => onEventClick?.(event)}
                        title={`${event.title} - ${event.time}`}
                      >
                        {event.time} {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 4 && (
                      <div className="text-xs text-gray-500 p-1">
                        +{dayEvents.length - 4} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Button component (simplified version for calendar)
function Button({ 
  children, 
  onClick, 
  variant = 'default', 
  size = 'default',
  className = '' 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm';
  className?: string;
}) {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(0_32_96)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variantClasses = {
    default: "bg-[rgb(0_32_96)] text-white hover:bg-[rgb(0_24_72)]",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
  };
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-sm"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
