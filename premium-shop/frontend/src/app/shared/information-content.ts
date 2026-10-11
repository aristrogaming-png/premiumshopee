import { CONTACT, ELIGIBILITY_NOTE, PAYMENT_NOTE } from './seo-content';

export const informationPages: Record<string, { title: string; description: string; sections: { heading: string; text: string; link?: string; linkText?: string }[] }> = {
  about: { title: 'About Premium Dukan', description: 'Learn how Premium Dukan lists digital subscriptions and handles product enquiries through WhatsApp.', sections: [
    { heading: 'Digital subscriptions, with details before you buy', text: 'Premium Dukan lists software, AI, design and learning offers. Each product page shows the current catalogue price and stock, with the available activation and plan information.' },
    { heading: 'How to buy', text: 'Use the product’s WhatsApp button to ask about the exact offer. Confirm eligibility, the final payment amount, delivery and after-sales terms before paying.' },
    { heading: 'Business information', text: 'Our published contact is +91 82472 76831 on WhatsApp. A legal business name, registered address and published support hours have not yet been supplied for this website. Request the seller and invoice details before payment.', link: CONTACT, linkText: 'Contact Premium Dukan' }
  ] },
  contact: { title: 'Contact Premium Dukan', description: 'Ask Premium Dukan about a product, activation eligibility, payment or an existing order on WhatsApp.', sections: [
    { heading: 'WhatsApp enquiries', text: 'Contact +91 82472 76831. Include the product name and your question about the plan or activation. Never send passwords, one-time passcodes or card details.', link: CONTACT, linkText: 'Open WhatsApp' },
    { heading: 'Support availability', text: 'Support hours and a guaranteed response time have not yet been published. Confirm a suitable support window for your time zone.' },
    { heading: 'Existing orders', text: 'Use your existing seller conversation to ask about delivery or activation problems. Confirm the applicable claim process and deadline for your order.' }
  ] },
  'activation-delivery': { title: 'Activation and digital delivery', description: 'Understand coupon, invitation and supplied-account delivery before ordering a digital subscription.', sections: [
    { heading: 'Check the delivery method', text: 'The current catalogue includes activation keys, coupons, email invitations and supplied accounts. These methods differ by product; read the activation and account-type sections on the product page.' },
    { heading: 'Confirm timing and redemption deadlines', text: 'There is no published store-wide delivery guarantee. Some listings require coupon redemption within 24 hours; the CapCut listing asks for an email change within two days. Confirm when your deadline starts before payment.' },
    { heading: 'Check your account requirements', text: ELIGIBILITY_NOTE },
    { heading: 'If activation fails', text: 'Contact the seller through your existing WhatsApp conversation. Describe the error without sharing passwords or one-time passcodes. Ask for the product-specific support and remedy process.' }
  ] },
  refunds: { title: 'Refund and warranty information', description: 'Check the product-specific refund, replacement and warranty terms before paying Premium Dukan.', sections: [
    { heading: 'Confirm the terms before paying', text: 'A store-wide refund policy has not yet been published. Request the refund eligibility, exclusions, claim deadline and process in writing before payment. This page does not promise a refund or replacement.' },
    { heading: 'Product-specific warranty claims', text: 'Some existing listings mention replacement cover, but do not fully state its conditions. Ask what is covered, how long the cover lasts and what evidence is needed. A warranty claim in a listing is not a substitute for agreed terms.' },
    { heading: 'Report a problem', text: 'Contact the seller through the original order conversation and request the remedy that applies to your confirmed order terms.', link: CONTACT, linkText: 'Contact support' }
  ] },
  terms: { title: 'Buying information and terms to confirm', description: 'Review the price, account eligibility, delivery and policy details to confirm before placing an order.', sections: [
    { heading: 'Catalogue and order confirmation', text: `${PAYMENT_NOTE} Stock shown on the website may change before the seller confirms your order.` },
    { heading: 'Eligibility and permitted use', text: 'Vendor account, licence and country restrictions may apply. Education, family-group and organisation-invite offers have specific eligibility conditions. Confirm these with the seller and the relevant provider before payment.' },
    { heading: 'Terms still to be published', text: 'Complete seller terms, legal business details, refund conditions and dispute arrangements have not yet been provided. Ask for these in writing. This page describes the current buying flow; it does not invent legal terms or replace provider terms.' }
  ] },
  'buying-guide': { title: 'Digital subscription buying guide', description: 'Compare digital plans, understand activation and confirm payment and delivery before ordering with Premium Dukan.', sections: [
    { heading: 'Find the right plan', text: 'Browse the global catalogue by product or category. Compare the features, subscription duration and account type on each product page.' },
    { heading: 'Check activation requirements', text: ELIGIBILITY_NOTE },
    { heading: 'Confirm your order on WhatsApp', text: 'Open the WhatsApp link on the product page to discuss that exact plan. Confirm availability, delivery time and any redemption deadline before paying.' },
    { heading: 'Payment and support', text: `${PAYMENT_NOTE} Agree a contact window and delivery time that works in your time zone.` },
    { heading: 'Keep your order details', text: 'Save the agreed plan, activation instructions, renewal and refund terms in your order conversation so you can refer to them later.' }
  ] },
  privacy: { title: 'Privacy and analytics choices', description: 'How the storefront handles browser preferences, optional analytics and links to WhatsApp.', sections: [
    { heading: 'Storefront preferences', text: 'Your theme and analytics choice are saved in this browser when storage is available. The catalogue does not require a country selection.' },
    { heading: 'Optional analytics', text: 'Analytics is off unless you choose Allow analytics. When configured, it records product views and WhatsApp purchase enquiries using product identifiers, without names, email addresses, phone numbers or message text. WhatsApp clicks are not recorded as purchases.' },
    { heading: 'External services', text: 'Product data comes from our Render backend and images are delivered by Cloudinary. Opening WhatsApp takes you to an external service with its own privacy terms. Ask the seller about order-data handling before sharing personal information.' }
  ] }
};
