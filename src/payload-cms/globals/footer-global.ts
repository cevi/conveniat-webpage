import { GlobalConfig } from 'payload';

export const FooterGlobal: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  fields: [
    {
      name: 'donationIban',
      label: 'Spenden IBAN',
      type: 'text',
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
