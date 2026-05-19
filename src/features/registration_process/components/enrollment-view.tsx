'use client';

import type { TriggerFormData } from '@/features/registration_process/components/trigger-registration-form';
import { TriggerRegistrationForm } from '@/features/registration_process/components/trigger-registration-form';
import { toast } from '@/lib/toast';
import { TRPCProvider, trpc } from '@/trpc/client';
import React from 'react';

const EnrollmentContent: React.FC = () => {
  const triggerMutation = trpc.registration.trigger.useMutation();

  const handleTriggerSubmit = async (data: TriggerFormData): Promise<void> => {
    try {
      if (data.mode === 'id' && typeof data.peopleId === 'string' && data.peopleId !== '') {
        const response = await triggerMutation.mutateAsync({ peopleId: data.peopleId });
        toast.success(`Workflow initialized for ${data.peopleId}. Job ID: ${response.jobId}`);
      } else if (data.mode === 'details' && data.details) {
        const response = await triggerMutation.mutateAsync(data.details);
        toast.success(`Workflow initialized. Job ID: ${response.jobId}`);
      }
    } catch (error) {
      console.error('Trigger failed:', error);
      toast.error('Initialization failed. Check logs.');
    }
  };

  return (
    <section className="animate-in fade-in slide-in-from-left-2 max-w-2xl duration-500">
      <TriggerRegistrationForm
        onSubmit={handleTriggerSubmit}
        isPending={triggerMutation.isPending}
      />
    </section>
  );
};

export const EnrollmentView: React.FC = () => {
  return (
    <TRPCProvider>
      <div className="min-h-screen bg-zinc-50 px-8 py-12 transition-colors duration-300 lg:px-12 dark:bg-[#141414]">
        <div className="mb-12">
          <h2 className="text-sm font-black tracking-widest text-zinc-900 uppercase dark:text-white">
            Helfer Anmeldung
          </h2>
          <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Starte neue Anmeldungen manuell.
          </p>
        </div>
        <EnrollmentContent />
      </div>
    </TRPCProvider>
  );
};

export default EnrollmentView;
