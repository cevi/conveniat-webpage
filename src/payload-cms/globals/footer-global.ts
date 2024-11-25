import { GlobalConfig } from 'payload';

export const FooterGlobal: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  fields: [
    {
      name: 'donationIban',
      label: 'Spenden IBAN',
      type: 'text',
      defaultValue: 'CH23 8080 8002 2706 7598 8',
      required: true,
    },

    {
      name: 'footerClaim',
      label: 'Footer Claim',
      type: 'text',
      defaultValue: 'MIR SIND CEVI',
      required: true,
    },
  ],
};
