'use client';

import React, { useEffect, useState } from 'react';
export interface CountdownType {
  endDate: string;
  title: string;
  descriptionBelow?: string;
  descriptionAbove?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeLeft = (endDate: string): TimeLeft => {
  const now = new Date();
  const end = new Date(endDate);
  const difference = end.getTime() - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
};

export const Countdown: React.FC<CountdownType> = ({ ...block }) => {
  const { endDate, title, descriptionBelow, descriptionAbove } = block;
  const currentTimeLeft = calculateTimeLeft(endDate);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: currentTimeLeft.days,
    hours: currentTimeLeft.hours,
    minutes: currentTimeLeft.minutes,
    seconds: currentTimeLeft.seconds,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(endDate);
      setTimeLeft(newTimeLeft);
      if (
        newTimeLeft.days === 0 &&
        newTimeLeft.hours === 0 &&
        newTimeLeft.minutes === 0 &&
        newTimeLeft.seconds === 0
      ) {
        clearInterval(timer);
      }
    }, 1000);
    return (): void => clearInterval(timer);
  }, [endDate, timeLeft]);

  return (
    <div className="bg-conveniat-green/10 border-conveniat-green/20 my-6 rounded-lg border p-6">
      <div className="mb-4 text-center">
        {title && <h3 className="text-conveniat-green mb-2 text-xl font-bold">{title}</h3>}
        {descriptionAbove && <p className="text-gray-600">{descriptionAbove}</p>}
      </div>

      <div className="my-4 grid grid-cols-4 gap-2">
        <div className="flex flex-col items-center rounded-md bg-white p-3 shadow-sm transition-transform hover:scale-105">
          <span className="text-conveniat-green text-3xl font-bold">{timeLeft.days}</span>
          <span className="text-xs text-gray-500">Tage</span>
        </div>
        <div className="flex flex-col items-center rounded-md bg-white p-3 shadow-sm transition-transform hover:scale-105">
          <span className="text-conveniat-green text-3xl font-bold">{timeLeft.hours}</span>
          <span className="text-xs text-gray-500">Stunden</span>
        </div>
        <div className="flex flex-col items-center rounded-md bg-white p-3 shadow-sm transition-transform hover:scale-105">
          <span className="text-conveniat-green text-3xl font-bold">{timeLeft.minutes}</span>
          <span className="text-xs text-gray-500">Minuten</span>
        </div>
        <div className="flex flex-col items-center rounded-md bg-white p-3 shadow-sm transition-transform hover:scale-105">
          <span className="text-conveniat-green text-3xl font-bold">{timeLeft.seconds}</span>
          <span className="text-xs text-gray-500">Sekunden</span>
        </div>
      </div>
      {descriptionBelow && (
        <p className="mt-2 text-center text-sm text-gray-600">{descriptionBelow}</p>
      )}
    </div>
  );
};
