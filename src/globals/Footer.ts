import { GlobalConfig } from 'payload';


export const Footer: GlobalConfig = {
    slug: 'footer',
    label: 'Footer',
    fields: [
        {
            name: 'donation_iban',
            label: 'Spenden IBAN',
            type: 'text',
            required: true
        }
    ]
};