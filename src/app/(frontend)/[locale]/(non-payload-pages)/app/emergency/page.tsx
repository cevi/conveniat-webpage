'use client';

import React, { ChangeEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Search, X } from 'lucide-react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { Accordion } from '@radix-ui/react-accordion';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';

const alertTypes = [
  {
    title: 'Medical Emergency',
    description: 'Life-threatening situations requiring immediate medical attention.',
    procedure: 'Call for medical backup, prepare first aid kit, clear the area.',
  },
  {
    title: 'Fire',
    description: 'Any fire-related emergencies within the camp premises.',
    procedure: 'Evacuate the area, call fire department, use fire extinguishers if safe.',
  },
  {
    title: 'Lost Camper',
    description: 'When a camper is reported missing or cannot be located.',
    procedure: 'Organize search parties, notify local authorities, secure camp perimeter.',
  },
  {
    title: 'Severe Weather',
    description: 'Dangerous weather conditions such as storms, lightning, or flooding.',
    procedure:
      'Move campers to designated shelters, monitor weather updates, prepare emergency supplies.',
  },
  {
    title: 'Medical Emergency',
    description: 'Life-threatening situations requiring immediate medical attention.',
    procedure: 'Call for medical backup, prepare first aid kit, clear the area.',
  },
  {
    title: 'Fire',
    description: 'Any fire-related emergencies within the camp premises.',
    procedure: 'Evacuate the area, call fire department, use fire extinguishers if safe.',
  },
  {
    title: 'Lost Camper',
    description: 'When a camper is reported missing or cannot be located.',
    procedure: 'Organize search parties, notify local authorities, secure camp perimeter.',
  },
  {
    title: 'Severe Weather',
    description: 'Dangerous weather conditions such as storms, lightning, or flooding.',
    procedure:
      'Move campers to designated shelters, monitor weather updates, prepare emergency supplies.',
  },
  {
    title: 'Medical Emergency',
    description: 'Life-threatening situations requiring immediate medical attention.',
    procedure: 'Call for medical backup, prepare first aid kit, clear the area.',
  },
  {
    title: 'Fire',
    description: 'Any fire-related emergencies within the camp premises.',
    procedure: 'Evacuate the area, call fire department, use fire extinguishers if safe.',
  },
  {
    title: 'Lost Camper',
    description: 'When a camper is reported missing or cannot be located.',
    procedure: 'Organize search parties, notify local authorities, secure camp perimeter.',
  },
  {
    title: 'Severe Weather',
    description: 'Dangerous weather conditions such as storms, lightning, or flooding.',
    procedure:
      'Move campers to designated shelters, monitor weather updates, prepare emergency supplies.',
  },
];

const AlertPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlerts = alertTypes.filter((alert) =>
    alert.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const clearSearch = (): void => {
    setSearchTerm('');
  };

  return (
    <article className="mx-auto mt-16 max-w-3xl px-4">
      <HeadlineH1 className="text-center">Notfall und Alarmierung</HeadlineH1>

      <div className="sticky top-[80px] z-20 bg-[#f8fafc] pb-4">
        <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6 shadow-sm">
          <h2 className="mb-4 flex items-center justify-center text-2xl font-bold text-red-500">
            <AlertCircle className="mr-2" /> Notfall Melden
          </h2>
          <p className="mb-4 text-balance text-center text-red-500">
            In dringenden Notfällen, bitte sofort 1414 anrufen and anschliessend hier alarmieren.
          </p>
          <div className="flex justify-center">
            <Button
              className="text-red-50"
              variant="destructive"
              size="lg"
              onClick={() => alert(`Alert triggered!`)}
            >
              Lagersanität Alarmieren
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search alert types..."
              value={searchTerm}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
              size={20}
            />
            {searchTerm !== '' && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 transform"
                onClick={clearSearch}
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible className="mb-8">
        {filteredAlerts.map((alert, index) => (
          <AccordionItem value={`item-${index}`} key={index}>
            <AccordionTrigger>{alert.title}</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">
                <strong>Description:</strong> {alert.description}
              </p>
              <p>
                <strong>Procedure:</strong> {alert.procedure}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </article>
  );
};

export default AlertPage;
