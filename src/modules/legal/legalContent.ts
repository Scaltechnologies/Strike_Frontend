// src/modules/legal/legalContent.ts
// Single source of truth for the public legal documents. Rendered in-app by
// LegalDocumentScreen and exported to HTML/DOCX/PDF by scripts/export-legal-html.mts, so the
// in-app text and the published versions can never drift apart.
//
// Source documents: the company's revised Terms & Conditions and STRIKE_Privacy_Policy.pdf
// (Effective 22 October 2026). Editorial corrections and the facts verified against this
// codebase are recorded in legal-docs/internal/verification-checklist.md — internal notes
// never belong in this file, because everything here is shown to users.
//
// Inline syntax understood by every renderer: **bold**. Email addresses, the support phone
// number and https:// / www. links are turned into actionable links automatically.
//
// Keep this file free of imports and non-erasable TS syntax (enums, namespaces): the export
// script and tests load it directly with Node's built-in type stripping.

export type ListItem = string;

export type LegalBlock =
  | string
  | { subheading: string }
  | { bullets: ListItem[] }
  | { numbered: ListItem[] };

export interface LegalSection {
  heading: string;
  body: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  effectiveDate?: string;
  lastUpdated: string;
  isDraft: boolean;
  sections: LegalSection[];
}

// Guard for unresolved placeholders. Final documents must contain none — enforced by
// scripts/legal.test.mts and by the --final export.
export const TBC_PREFIX = '[To be confirmed: ';

// ── Verified company facts (confirmed by Strike management, 22 October 2026) ──────────────
export const COMPANY = {
  legalName: 'Strike Technologies Private Limited',
  registeredOffice:
    'Flat No. 305, Tirumala Enclave Apartment, Chirala, Prakasam, Bapatla District, Andhra Pradesh, India – 523155',
  supportEmail: 'support.striketechnologies@gmail.com',
  supportPhone: '8143604709',
  supportPhoneE164: '+918143604709',
  website: 'www.strikeapp.in',
  websiteUrl: 'https://www.strikeapp.in',
} as const;

// Public page where a vendor can request deletion without the app. Must be a real, verified
// HTTPS URL — strikeapp.in has no legal pages yet, so this stays null until one is deployed.
export const ACCOUNT_DELETION_URL: string | null = null;

const DELETION_EMAIL_SUBJECT = 'Account deletion request – Strike Vendor';
const DELETION_EMAIL_BODY = [
  'Please delete my Strike Vendor account and associated personal information.',
  '',
  'Registered mobile number:',
  'Business (shop) name:',
].join('\n');

export const ACCOUNT_DELETION_MAILTO =
  `mailto:${COMPANY.supportEmail}` +
  `?subject=${encodeURIComponent(DELETION_EMAIL_SUBJECT)}` +
  `&body=${encodeURIComponent(DELETION_EMAIL_BODY)}`;

const CONTACT_LINES = [
  `**Legal entity:** ${COMPANY.legalName}`,
  `**Registered office:** ${COMPANY.registeredOffice}`,
  `**Email:** ${COMPANY.supportEmail}`,
  `**Phone:** ${COMPANY.supportPhone}`,
  `**Website:** ${COMPANY.website}`,
];

// ─────────────────────────────────────────────────────────────────────────────
// Terms & Conditions
// ─────────────────────────────────────────────────────────────────────────────

export const TERMS: LegalDocument = {
  title: 'Terms & Conditions',
  lastUpdated: '22 October 2026',
  isDraft: false,
  sections: [
    {
      heading: 'Welcome to STRIKE',
      body: [
        'These Terms & Conditions (the “Terms”) govern access to and use of the STRIKE website, mobile application, digital membership services, subscription services and related technology platform (collectively, the “Platform”).',
        `STRIKE is operated by ${COMPANY.legalName} (“STRIKE”, “we”, “us” or “our”).`,
        'By accessing the Platform, creating an account, purchasing a membership or using a STRIKE service, you agree to these Terms and to the policies expressly incorporated into them. If you do not agree, do not use the Platform.',
      ],
    },
    {
      heading: '1. About STRIKE',
      body: [
        'STRIKE is a digital subscription and membership infrastructure platform that connects customers with participating local businesses (“Vendors”). Customers may discover, purchase and use digital membership cards, prepaid subscriptions, consumption-based benefits, offers and other services made available by participating Vendors.',
        'The Platform may support the following journey: discovery, purchase, digital membership, verification, redemption and usage tracking.',
        'Unless expressly stated otherwise, STRIKE provides the technology platform and is not the manufacturer, owner or direct provider of the food, beverages, salon, gym, study-hall or other goods and services supplied by a Vendor. This description does not exclude any responsibility that applicable law places on STRIKE.',
      ],
    },
    {
      heading: '2. Participating Vendors',
      body: [
        'Participating businesses are independent businesses. Subject to applicable law and the specific membership terms, Vendors are responsible for:',
        {
          bullets: [
            'The goods and services they provide, including quality and quantity.',
            'Availability, operating hours and service delivery.',
            'Vendor-specific membership conditions and fulfilment of eligible benefits.',
            'Applicable warranties and compliance with laws relevant to their business.',
            'The accuracy of information they provide to STRIKE.',
            'Confirming redemptions where the Platform or membership rules require Vendor confirmation.',
          ],
        },
        'STRIKE provides technology infrastructure for memberships and transactions but does not control every aspect of a Vendor’s independent operations. STRIKE will handle matters for which it is responsible under these Terms and applicable law. Nothing in these Terms limits customer rights or remedies that cannot lawfully be excluded.',
      ],
    },
    {
      heading: '3. Eligibility',
      body: [
        'You may use STRIKE only in accordance with applicable laws of India. Users aged 18 years or older may create an account and enter into transactions for which they are legally eligible.',
        'A person under 18 may access only those features that are permitted by applicable law and STRIKE’s actual age policy, with the consent and supervision of a parent or legal guardian where required. A minor must not independently enter into a purchase or membership contract where the law requires contractual capacity; any such transaction must be completed by an eligible adult or otherwise handled as permitted by law. If a parent or legal guardian does not provide consent where consent is required, the minor must discontinue the relevant use.',
        'STRIKE may restrict or terminate access where it reasonably believes a user is ineligible or has misrepresented their age, subject to applicable law. You must provide accurate and complete information when using the Platform.',
      ],
    },
    {
      heading: '4. STRIKE Account',
      body: [
        'Some features require an account. You agree to:',
        {
          bullets: [
            'Provide accurate and complete information and keep it updated.',
            'Protect your login credentials, including your password, and do not share them with anyone.',
            'Not share your account with unauthorised persons.',
            'Notify STRIKE through the published support channel if you suspect unauthorised access.',
            'Take reasonable care with activity carried out through your account, subject to applicable law and STRIKE’s own security obligations.',
          ],
        },
        'You must not use another person’s account without authorisation. You are responsible for keeping your login credentials, verification codes, passwords and other account-security information confidential and must not disclose them to unauthorised persons.',
        'You are responsible for activity carried out through your account to the extent permitted by applicable law, including activity resulting from your failure to take reasonable care of your credentials; this does not make you responsible for activity not reasonably attributable to you or remove STRIKE’s own legal obligations.',
        'STRIKE may disable, restrict, suspend or terminate an account or credentials where reasonably necessary because of suspected unauthorised use, fraud, security risk or a material breach of these Terms, subject to applicable law and any notice or review process that is required or offered by STRIKE.',
      ],
    },
    {
      heading: '5. Digital Memberships',
      body: [
        'STRIKE may offer digital memberships, subscriptions, passes and prepaid benefits. Each membership may have specific terms, which will be displayed before purchase where applicable and form part of the agreement for that membership. Membership-specific terms may include:',
        {
          bullets: [
            'Price and applicable charges.',
            'Activation date and validity period.',
            'Benefits, units and usage limits.',
            'Participating Vendor(s), eligible locations and time restrictions.',
            'Redemption and Vendor-confirmation requirements.',
            'Renewal, cancellation and refund conditions.',
          ],
        },
        'Please review the membership-specific information before purchase. If a material restriction is not clearly disclosed before purchase, the matter will be handled in accordance with applicable law and the relevant approved policy.',
      ],
    },
    {
      heading: '6. Prepaid Memberships and Consumption Units',
      body: [
        'Some memberships may provide a specified number of meals, visits, services or other eligible consumption units during a defined validity period. The applicable membership information should state the unit type, number of units, activation and expiry rules, eligible Vendor, redemption conditions and restrictions.',
        'Unused units do not constitute cash or a deposit balance and cannot be exchanged for cash unless the membership terms expressly provide otherwise or applicable law requires a different outcome.',
      ],
    },
    {
      heading: '7. Membership Benefits',
      body: [
        'Depending on the membership, benefits may include prepaid products or services, discounts, special offers, member-only pricing, loyalty benefits, priority or early access, Vendor-specific benefits or other benefits described on the Platform.',
        'Benefits may vary by Vendor and plan. A Vendor or STRIKE may change or discontinue an offer only to the extent permitted by the disclosed membership terms and applicable law. Any change affecting an existing purchase will be handled under the applicable membership terms and law.',
      ],
    },
    {
      heading: '8. Purchase and Payment',
      body: [
        'Membership prices and applicable charges will be displayed before checkout is completed. The amount payable may include the membership price, applicable taxes, platform or service charges and other charges disclosed at checkout. You agree to pay the amount displayed at checkout.',
        'Payments may be processed through third-party payment service providers. A purchase is treated as successful after STRIKE receives confirmation of successful payment and the membership is issued or otherwise made available as described at checkout.',
        'If an amount is debited but the membership is not successfully issued, STRIKE will investigate the transaction and, where appropriate, facilitate a reversal or refund in accordance with applicable law and the payment provider’s processes. Pending, failed, duplicate or disputed transactions may be reported through the support channel in Section 25.',
      ],
    },
    {
      heading: '9. Pricing and Promotions',
      body: [
        'The price applicable to a membership is generally the price displayed when you complete the purchase. STRIKE or Vendors may change prices for future purchases.',
        'Promotions, discounts and offers may be subject to eligibility rules, validity periods, maximum usage, minimum purchase requirements, Vendor or payment restrictions, geographic restrictions, blackout periods and limited availability. Unless expressly stated otherwise, promotions cannot be combined with other offers. STRIKE may correct pricing or promotional errors and modify or withdraw promotions where permitted by applicable law. Changes will not override mandatory customer rights.',
      ],
    },
    {
      heading: '10. Redemption',
      body: [
        'A membership may be redeemed only in accordance with its applicable conditions. The Vendor may need to verify the membership before providing the relevant goods or services. STRIKE may record each redemption to maintain an accurate membership record. A successful redemption may reduce the available units or entitlement in accordance with the applicable membership rules.',
        'Where Vendor confirmation is required by the applicable redemption flow, a redemption is completed only after the Vendor confirms the transaction through STRIKE or another authorised STRIKE mechanism. STRIKE may investigate disputed, duplicate, suspicious or unauthorised redemptions and may correct records where appropriate, subject to applicable law and the evidence available.',
      ],
    },
    {
      heading: '11. Unauthorised Use and Fraud',
      body: [
        'You must not:',
        {
          bullets: [
            'Share screenshots, QR codes or credentials to enable unauthorised use.',
            'Duplicate or manipulate memberships, QR codes or digital credentials.',
            'Circumvent redemption controls or use another person’s membership without authorisation.',
            'Make fraudulent redemption claims or manipulate promotional benefits.',
            'Create fraudulent accounts or obtain benefits through technical or operational abuse.',
          ],
        },
        'STRIKE may restrict, suspend or terminate a membership or account involved in suspected fraud or abuse, subject to applicable law and any review process that applies.',
      ],
    },
    {
      heading: '12. Cancellation and Refunds',
      body: [
        'Cancellation and refund eligibility depends on the membership-specific terms, any applicable Vendor terms, activation status, benefits or units already used, the reason for the request, the refund policy shown at purchase and applicable law.',
        'A membership clearly identified as non-refundable may be non-refundable except where STRIKE expressly permits a refund or applicable law requires one. No term in this section removes any non-waivable statutory right. Where a refund is approved, it will generally be processed through the original payment method or another lawful method. Actual processing time may depend on the payment provider.',
      ],
    },
    {
      heading: '13. Vendor Closure or Service Failure',
      body: [
        'If a Vendor permanently closes, materially stops providing a subscribed service or is unable to honour a purchased membership, STRIKE may, where reasonably possible and consistent with the membership terms and applicable law:',
        {
          bullets: [
            'Assist with resolution and communicate with the Vendor.',
            'Offer an alternative solution or transfer to another participating Vendor, where available and appropriate.',
            'Facilitate an applicable refund or another reasonable remedy.',
          ],
        },
        'The available remedy will depend on the circumstances, the membership terms and applicable law. This section does not guarantee that a replacement Vendor or particular remedy will always be available.',
      ],
    },
    {
      heading: '14. Service Availability',
      body: [
        'Vendor services may be temporarily unavailable due to business hours, holidays, capacity limits, temporary closure, maintenance, public events, operational circumstances, force majeure events or other circumstances outside reasonable control. Purchasing a membership does not guarantee immediate availability at every moment unless the membership expressly provides such a guarantee. Any remedy for material unavailability remains subject to the applicable terms and law.',
      ],
    },
    {
      heading: '15. Customer Responsibilities',
      body: [
        'You agree to use STRIKE lawfully, honestly and responsibly. You must not:',
        {
          bullets: [
            'Use STRIKE for unlawful purposes or provide false information.',
            'Commit fraud, abuse promotional offers or attempt unauthorised access.',
            'Reverse engineer the Platform or interfere with its security.',
            'Introduce malicious software or scrape or systematically copy Platform content without authorisation.',
            'Misrepresent your identity or harass or abuse Vendors or STRIKE personnel.',
            'Circumvent usage or redemption restrictions.',
            'Resell memberships or benefits where prohibited by the applicable terms or law.',
          ],
        },
      ],
    },
    {
      heading: '16. Intellectual Property',
      body: [
        `The STRIKE name, logo, trademarks, software, Platform design, interface, graphics, text, databases, technology and other intellectual property are owned by or licensed to ${COMPANY.legalName}. Except as expressly permitted by law or with prior written permission, you may not copy, modify, reproduce, distribute, sell, license, reverse engineer, create derivative works from or commercially exploit STRIKE intellectual property. Third-party trademarks remain the property of their respective owners.`,
      ],
    },
    {
      heading: '17. User Content, Reviews and Feedback',
      body: [
        'Where STRIKE allows reviews, ratings, comments, photographs, feedback or other user content, you are responsible for what you submit and represent that you have the necessary rights to submit it. You must not submit fake reviews, misleading or defamatory information, unlawful content, impersonation, content intended to manipulate ratings or content that infringes another person’s rights.',
        'Subject to applicable law, you grant STRIKE a non-exclusive, worldwide, royalty-free licence to use submitted content for operating, improving and promoting the Platform. STRIKE may remove content that violates these Terms or applicable law.',
      ],
    },
    {
      heading: '18. Platform Availability',
      body: [
        'STRIKE aims to provide reliable services but does not guarantee that the Platform will always be available, uninterrupted, error-free, completely secure, free from technical defects or compatible with every device. Temporary interruptions may occur due to maintenance, technical problems, network failures, third-party services or circumstances outside STRIKE’s reasonable control. Nothing in this section excludes a responsibility that cannot lawfully be excluded.',
      ],
    },
    {
      heading: '19. Third-Party Services',
      body: [
        'STRIKE may integrate with third-party services such as payment providers, authentication services, mapping services, cloud infrastructure, communication services, analytics services or other technology providers. Those services may be governed by their own terms and privacy policies. The STRIKE Privacy Policy describes the relevant providers and how data is shared with them.',
      ],
    },
    {
      heading: '20. STRIKE’s Role and Vendor Responsibility',
      body: [
        'STRIKE provides technology infrastructure connecting customers and participating Vendors. Vendors remain responsible for the underlying goods and services they provide, including quality, availability, staff conduct, business operations and fulfilment obligations. STRIKE remains responsible for its own obligations under these Terms and applicable law. Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited.',
      ],
    },
    {
      heading: '21. Limitation of Liability',
      body: [
        'To the maximum extent permitted by applicable law, STRIKE will not be liable for indirect, incidental, special or consequential losses arising from matters outside STRIKE’s reasonable control or from independent acts or omissions of Vendors. This limitation applies only to the extent legally permitted and does not apply to liability that cannot lawfully be excluded or limited. Nothing in this section is intended to remove or restrict statutory rights available to consumers.',
      ],
    },
    {
      heading: '22. Fraud, Security and Misuse',
      body: [
        'STRIKE may investigate activity that appears fraudulent, abusive, suspicious or inconsistent with legitimate use. Where appropriate and legally permitted, STRIKE may suspend an account, restrict a membership, disable redemption, cancel fraudulent transactions, require additional verification, seek recovery of amounts obtained through fraud or take appropriate legal action.',
      ],
    },
    {
      heading: '23. Suspension and Termination',
      body: [
        'STRIKE may suspend or terminate access to the Platform or particular services where reasonably necessary because of a violation of these Terms, fraud, abuse, security risks, illegal activity, membership misuse, repeated violations, payment-related issues or legal or regulatory requirements.',
        'Termination does not automatically eliminate rights or obligations that arose before termination. Treatment of active memberships, unused units and any applicable refund or statutory remedy will be determined under the relevant membership terms and applicable law.',
      ],
    },
    {
      heading: '24. Privacy',
      body: [
        'Your use of STRIKE is also governed by the STRIKE Privacy Policy, which explains how STRIKE collects, uses, stores, shares and otherwise processes personal data. The Privacy Policy is available on the Platform, including in the STRIKE mobile application, and forms part of the overall framework governing use of the Platform to the extent permitted by law.',
      ],
    },
    {
      heading: '25. Complaints and Grievance Redressal',
      body: [
        'For complaints about a membership, payment, redemption, Vendor service, refund, account, Platform functionality or another STRIKE-related matter, contact STRIKE using the support channel published on the Platform or the contact details in Section 30. STRIKE will endeavour to acknowledge and address complaints in the manner and within the timelines required by applicable law.',
      ],
    },
    {
      heading: '26. Changes to These Terms',
      body: [
        'STRIKE may update these Terms from time to time. The updated version will be published on the Platform with a revised “Last Updated” date. Where required by applicable law, STRIKE will provide additional notice of material changes. Continued use after the effective date of revised Terms constitutes acceptance only to the extent permitted by applicable law. Changes will not remove rights that have already accrued where law protects those rights.',
      ],
    },
    {
      heading: '27. Governing Law and Jurisdiction',
      body: [
        'These Terms are governed by the laws of India. Subject to applicable consumer-protection laws and other mandatory legal requirements, disputes will be subject to the jurisdiction of courts having appropriate jurisdiction over the matter. Nothing in these Terms prevents a consumer from exercising a statutory right or remedy available under applicable law.',
      ],
    },
    {
      heading: '28. Severability',
      body: [
        'If any provision of these Terms is found invalid, unlawful or unenforceable, it will be interpreted or modified to the minimum extent necessary to make it enforceable where legally possible. The remaining provisions will continue in effect.',
      ],
    },
    {
      heading: '29. Entire Agreement',
      body: [
        'These Terms, together with the STRIKE Privacy Policy, applicable Cancellation and Refund Policy, membership-specific terms and any Vendor-specific terms disclosed at purchase, constitute the principal terms governing use of the Platform.',
        'If a specific membership term displayed at the time of purchase conflicts with these general Terms, the specific term will govern that membership to the extent of the conflict, subject to applicable law. No policy or term may override mandatory legal rights.',
      ],
    },
    {
      heading: '30. Contact and Legal Information',
      body: [
        ...CONTACT_LINES,
        `© 2026 ${COMPANY.legalName}. All rights reserved.`,
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Privacy Policy
// ─────────────────────────────────────────────────────────────────────────────

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: '22 October 2026',
  lastUpdated: '22 October 2026',
  isDraft: false,
  sections: [
    {
      heading: '1. Introduction',
      body: [
        `${COMPANY.legalName} (“STRIKE”, “Company”, “we”, “us” or “our”) is committed to protecting the privacy and personal information of individuals who access or use our mobile applications, website and associated services (collectively, the “Platform”).`,
        'This Privacy Policy explains how we collect, receive, use, store, process, disclose, retain and protect personal information when you access or use STRIKE, create an account, explore participating businesses, purchase or redeem offers, subscribe to meal plans or memberships, make payments, or otherwise interact with our Platform.',
        'STRIKE is designed to connect users with participating businesses and service providers through digital offers, food cards, meal plans and membership benefits across Food, Wellness and Beauty.',
        'This Policy is intended to be read together with our Terms & Conditions and any additional privacy notices displayed when you use particular features of the Platform.',
        'Please read this Policy carefully before using STRIKE. Where applicable law requires consent for the collection or processing of personal information, we will seek such consent before undertaking the relevant processing.',
      ],
    },
    {
      heading: '2. Scope and Applicability',
      body: [
        'This Policy applies to:',
        {
          bullets: [
            'Users who register for or access the STRIKE application or website.',
            'Individuals who purchase, subscribe to, redeem or use STRIKE offers, food cards, meal plans or memberships.',
            'Individuals who communicate with our customer support team.',
            'Visitors who interact with our Platform without creating an account.',
            'Representatives of participating businesses and vendors who interact with STRIKE, including users of the STRIKE Vendor app.',
          ],
        },
        'Certain information may be processed by third-party payment providers, authentication providers, vendors or other service providers under their own privacy policies and applicable legal obligations.',
        'This Policy does not automatically govern third-party websites, applications or services that STRIKE does not operate or control.',
      ],
    },
    {
      heading: '3. Information We Collect',
      body: [
        'We collect only the information reasonably necessary to provide, maintain, secure and improve our services, subject to applicable law and the permissions you provide.',
        { subheading: '3.1 Account and Registration Information' },
        'When you create or access a STRIKE account, we may collect:',
        {
          bullets: [
            'Full name.',
            'Mobile phone number.',
            'Email address.',
            'Account identifiers and authentication-related information.',
            'Information made available through Google sign-in, if you choose that authentication method.',
            'Account preferences and other details you voluntarily provide.',
          ],
        },
        'We use this information to establish and manage your account, verify access, communicate with you and provide the services you request.',
        { subheading: '3.2 Address and Location Information' },
        'STRIKE may collect or process address and location information to provide location-dependent features. Depending on the feature you use, this may include:',
        {
          bullets: [
            'Your saved or provided address.',
            'Your approximate or precise device location, where you grant the relevant permission.',
            'Location information associated with vendor discovery or an eligible delivery or fulfilment service.',
            'Selected service areas and location preferences.',
          ],
        },
        'Location information may be used to:',
        {
          bullets: [
            'Display participating vendors and businesses near you.',
            'Show relevant offers and available services in your area.',
            'Support delivery or fulfilment where such a service is offered.',
            'Determine the applicability of geographical restrictions on offers or memberships.',
            'Help prevent suspicious transactions or misuse of location-dependent benefits.',
          ],
        },
        'You may be able to disable device location access through your device settings. However, certain features may not function fully without the relevant permission.',
        'STRIKE will not treat permission to access device location as unrestricted permission to track you for unrelated purposes.',
        { subheading: '3.3 Transaction and Purchase Information' },
        'When you purchase or use a STRIKE product or service, we may collect information relating to:',
        {
          bullets: [
            'Strike Monthly food cards and associated offers.',
            'Strike Mealo weekly, bi-weekly or monthly meal plans.',
            'Strike Memberships across Food, Wellness and Beauty.',
            'Selected offers, participating vendors and membership plans.',
            'Purchase amounts, transaction references and payment status.',
            'Subscription or plan validity, where applicable.',
            'Redemption history, QR-code validation and usage status.',
            'Refund, cancellation, dispute and customer-support records.',
          ],
        },
        'This information enables STRIKE to process transactions, administer entitlements, verify eligible redemptions, maintain transaction records and assist with complaints or disputes.',
        { subheading: '3.4 Payment Information' },
        'Payments made through STRIKE may be processed by Razorpay or another payment service provider appointed by STRIKE.',
        'Payment-related information may include transaction identifiers, payment status, order references, refunds and other information necessary to reconcile transactions.',
        'Your payment provider may independently collect and process information such as payment instrument details, billing information and authentication data in accordance with its own terms, privacy policy and applicable regulations.',
        '**STRIKE does not intend to collect or store your complete card number, card security code, UPI PIN or banking authentication credentials on its own systems.** Such information should be entered only into the authorised payment provider’s secure payment interface.',
        { subheading: '3.5 Camera and QR-Code Information' },
        'STRIKE may request camera permission to enable the scanning of vendor or customer QR codes or other codes used by supported Platform features.',
        'Camera access is intended to support the relevant scanning function. STRIKE does not intend to use this permission to capture photographs or videos unrelated to that function.',
        'If a scanned QR code contains or refers to transaction, vendor or redemption information, the relevant data may be processed to verify an offer, membership or other eligible benefit.',
        'You may deny or revoke camera permission through your device settings, although QR-based features may then be unavailable.',
        { subheading: '3.6 Device, Technical and Usage Information' },
        'When you use STRIKE, we and our authorised technical service providers may process certain technical information, where collected by the application or its underlying infrastructure, including:',
        {
          bullets: [
            'Device type, operating system and application version.',
            'IP address and basic network information.',
            'Application logs, diagnostic information and crash reports.',
            'Session information and timestamps.',
            'Feature interactions and usage events.',
            'Security-related events and authentication logs.',
          ],
        },
        'This information may be used to troubleshoot technical issues, improve application stability, protect accounts, detect fraud and understand how the Platform is used.',
        'STRIKE does not intend to collect an Advertising ID as part of its current stated data-collection design. If our implementation or use of third-party software changes, we will update the relevant disclosures and permissions as required.',
        { subheading: '3.7 Communications and Customer Support' },
        'When you contact STRIKE, we may collect the information you choose to provide, including your name, contact details, transaction references, complaint details and communications with our support team.',
        'We use this information to answer enquiries, resolve complaints, investigate disputed transactions and improve our services.',
        { subheading: '3.8 Vendor and Business Information' },
        'Participating vendors may provide business-related information such as their business name, location, contact information, operating details, products, services, offers, membership benefits and redemption rules.',
        'Where a vendor’s representative uses a STRIKE business account, we may also process the representative’s name, contact details, account credentials and activity records as necessary to administer the business relationship.',
        'Vendor information may be displayed to users to facilitate discovery and use of available offers and services.',
        { subheading: '3.9 STRIKE Vendor App' },
        'When a participating business uses the STRIKE Vendor app, we process the following information in addition to the categories above:',
        {
          bullets: [
            '**Registration and store details:** business name, owner name, business address, mobile number, email address, store category and description, store timings, holidays and open or closed status.',
            '**Store location:** the latitude and longitude of the store. The app requests precise device location only when you choose to detect your store location automatically during registration, and only while the app is in use; you may enter the coordinates manually instead.',
            '**Store images:** a store banner image you choose from your photo library. The image is compressed on your device before it is uploaded.',
            '**Menu, cards and offers:** menu items and prices, membership card details and coupon requests you create.',
            '**Payout details:** when you request a withdrawal of your earnings, your bank account number, account holder name and IFSC code, or your UPI ID, together with the withdrawal amount. Your most recently used payout details are saved so that the withdrawal form can be pre-filled.',
            '**Earnings records:** card purchases at your store, commission records, redemptions, Pay-at-Store payment confirmations and withdrawal requests.',
            '**Notification token:** if you allow notifications, a Firebase Cloud Messaging device token, together with your device platform, device name and app version, so that we can send you alerts about activity at your store.',
          ],
        },
        'You sign in with your email address and a password. Your password is stored on our servers only as a secure one-way hash and is never visible to our staff; we email you a temporary password when your account is approved or when you request a reset, and ask you to replace it with your own. After you sign in, your session tokens are stored in encrypted storage on your device and are removed when you sign out. The STRIKE Vendor app does not use your microphone.',
      ],
    },
    {
      heading: '4. How We Use Your Information',
      body: [
        'Subject to applicable law and the purposes disclosed to you, STRIKE may use personal information for the following purposes:',
        {
          numbered: [
            '**Account management:** To create, authenticate, maintain and secure your account.',
            '**Service delivery:** To provide access to food cards, meal plans, memberships, offers and other available Platform features.',
            '**Vendor discovery:** To display relevant participating businesses and location-dependent offers.',
            '**Transaction processing:** To process purchases, verify payments, record redemptions and administer refunds or cancellations.',
            '**Membership administration:** To verify membership eligibility, plan validity, usage limits and available benefits.',
            '**QR verification:** To validate eligible vendor visits, offer redemptions or other supported transactions.',
            '**Customer support:** To respond to questions, complaints, refund requests and disputes.',
            '**Communication:** To send account verification messages, transaction confirmations, service notices, security alerts and important policy updates.',
            '**Personalisation:** To present relevant vendors, categories, offers and features based on your stated preferences and permitted usage information.',
            '**Security and fraud prevention:** To detect suspicious activities, unauthorised access, fraudulent redemptions and misuse of the Platform.',
            '**Platform improvement:** To diagnose errors, improve performance, test features and understand aggregated usage patterns.',
            '**Legal compliance:** To comply with applicable laws, lawful requests, tax obligations, accounting requirements and regulatory requirements.',
            '**Business operations:** To maintain records, administer vendor relationships, process vendor payouts and support legitimate business operations.',
            '**Marketing communications:** To send promotional communications where permitted by applicable law and, where required, with your consent.',
          ],
        },
        'Where processing is based on consent, you may withdraw that consent through the applicable mechanism, subject to legal requirements and the consequences explained in this Policy.',
      ],
    },
    {
      heading: '5. Cookies and Similar Technologies',
      body: [
        'Where STRIKE operates a website or uses web-based features, cookies or similar technologies may be used where applicable to:',
        {
          bullets: [
            'Maintain sessions and authenticate users.',
            'Remember preferences.',
            'Improve website functionality.',
            'Measure performance and diagnose technical issues.',
            'Understand aggregated traffic and usage patterns.',
          ],
        },
        'The use of these technologies depends on the services and technical integrations actually deployed.',
        'You may manage cookies through your browser settings where supported. Disabling certain cookies may affect the operation of some website features.',
      ],
    },
    {
      heading: '6. How We Share Your Information',
      body: [
        'STRIKE does not intend to sell users’ personal information as a standalone commercial product.',
        'We may share information with the following categories of recipients when necessary for the purposes described in this Policy and subject to applicable law.',
        { subheading: '6.1 Participating Vendors and Businesses' },
        'We may share relevant information with the vendor or business you choose to engage with so that it can verify your purchase, validate an eligible offer, confirm membership benefits, process a redemption or provide the relevant service.',
        'For example, a participating restaurant may need a transaction reference or redemption status to verify a STRIKE food card or meal-plan entitlement.',
        'We aim to limit vendor access to the information reasonably required for the relevant transaction or service.',
        'Vendors are responsible for handling information they receive in accordance with applicable law and their own legal obligations. They must not assume that STRIKE authorises them to use your information for unrelated purposes.',
        { subheading: '6.2 Payment Service Providers' },
        'We may share transaction and other necessary information with Razorpay or another authorised payment provider to facilitate payment processing, transaction verification, refunds, dispute resolution and fraud prevention.',
        'Payment providers may process information under their own privacy policies and applicable regulatory requirements.',
        { subheading: '6.3 Authentication, Hosting and Technical Service Providers' },
        'We may use third-party providers for services such as:',
        {
          bullets: [
            'Google sign-in or other authentication functions.',
            'Cloud hosting and database infrastructure.',
            'Application maintenance and technical support.',
            'Security monitoring and fraud prevention.',
            'Diagnostic tools and permitted analytics.',
            'Communication and notification delivery.',
          ],
        },
        'Such providers may process relevant information on our behalf to provide the services for which they have been engaged, subject to applicable contractual and legal safeguards.',
        'In the STRIKE Vendor app, these providers include Firebase Cloud Messaging, for push notifications, and our email delivery provider, for sending account approval and password emails.',
        { subheading: '6.4 Legal and Regulatory Authorities' },
        'We may disclose information where reasonably necessary to:',
        {
          bullets: [
            'Comply with applicable law or a lawful order.',
            'Respond to a valid request from an authorised public authority.',
            'Investigate suspected fraud, unlawful activity or security incidents.',
            'Establish, exercise or defend legal claims.',
            'Protect the rights, safety and property of STRIKE, its users, participating businesses or other persons.',
          ],
        },
        'We will handle such disclosures in accordance with applicable law.',
        { subheading: '6.5 Business Transfers' },
        'If STRIKE undergoes a merger, acquisition, restructuring, financing, sale of assets or similar corporate transaction, relevant information may be transferred to the parties involved where legally permitted and subject to appropriate safeguards.',
        { subheading: '6.6 With Your Direction or Consent' },
        'We may disclose information where you specifically request or authorise the disclosure, or where another lawful basis permits it.',
        'STRIKE does not authorise unrelated third parties to access personal information merely because they participate in the same business ecosystem.',
      ],
    },
    {
      heading: '7. Location Permissions and User Control',
      body: [
        'STRIKE may request access to your device’s location to show nearby participating businesses or support a location-dependent service.',
        'You can manage location permissions through your device settings. You may also be able to enter an address manually where the relevant feature supports it.',
        'If you disable location access, nearby vendor discovery or certain delivery-related features may become less accurate or unavailable.',
        'We will use location information only for disclosed purposes and other purposes permitted by applicable law.',
      ],
    },
    {
      heading: '8. Data Retention and Deletion',
      body: [
        'STRIKE retains personal information only for as long as reasonably necessary to fulfil the purposes for which it was collected, subject to applicable law.',
        'Retention periods may vary according to the category of information and the reason it is held. For example:',
        {
          bullets: [
            'Account information may be retained while your account remains active.',
            'Transaction and financial records may be retained for applicable accounting, tax, payment, audit or legal requirements.',
            'Customer-support and dispute records may be retained until the relevant matter is resolved and for any necessary subsequent period.',
            'Security and diagnostic records may be retained for an appropriate period to investigate incidents and protect the Platform.',
            'Information that no longer needs to identify you may be deleted, anonymised or aggregated where appropriate.',
          ],
        },
        'When information is no longer required, STRIKE will take reasonable steps to delete it or render it non-identifiable, subject to applicable legal obligations and legitimate retention requirements.',
        { subheading: 'Account Deletion' },
        `You may request deletion of your STRIKE account and associated personal information by emailing ${COMPANY.supportEmail} from your registered email address, stating your registered mobile number. In the STRIKE Vendor app, you can start this request from Profile → Delete Account, which prepares the request email for you.`,
        'We may contact you to verify that the request came from you before acting on it. Signing out of the app or uninstalling it does not delete your account.',
        'Account deletion requests will be processed in accordance with applicable law and the Platform’s operational requirements. Information that must lawfully be retained for financial records, fraud prevention, dispute resolution or other legal obligations may be retained for the necessary period, with access and use appropriately restricted where required.',
        'Deleting your account may result in the loss of access to unused offers, memberships, meal-plan benefits or other account-linked entitlements, subject to applicable consumer rights and the relevant terms.',
      ],
    },
    {
      heading: '9. Data Security',
      body: [
        'STRIKE takes reasonable technical and organisational measures designed to protect personal information against unauthorised access, disclosure, alteration, loss, misuse or destruction.',
        'Depending on the systems deployed, these measures may include:',
        {
          bullets: [
            'Access controls and permission management.',
            'Authentication and account-security safeguards.',
            'Secure communication and data transmission practices.',
            'Monitoring for suspicious activity.',
            'Restricted access to business and administrative systems.',
            'Appropriate safeguards for third-party service providers.',
            'Procedures for responding to security incidents.',
          ],
        },
        'No electronic transmission or storage system can be guaranteed to be completely secure. Although we work to protect your information, we cannot promise absolute security.',
        'You are responsible for maintaining the confidentiality of your account credentials and promptly reporting suspected unauthorised access.',
        'Where a personal data breach triggers a notification obligation under applicable law, STRIKE will take the required steps to notify affected individuals and relevant authorities.',
      ],
    },
    {
      heading: '10. Third-Party Services and External Links',
      body: [
        'The STRIKE Platform may integrate with or direct users to third-party services, including payment gateways, authentication providers and participating businesses.',
        'Your interaction with such services may be governed by their own terms and privacy policies.',
        'STRIKE does not control the independent privacy practices of third parties and cannot guarantee how they process information outside STRIKE’s control. However, where a third party processes information on our behalf, we will take appropriate steps to address applicable privacy and security obligations.',
        'We encourage users to review the privacy policies of relevant third-party services before providing information directly to them.',
      ],
    },
    {
      heading: '11. Children and Minors',
      body: [
        'STRIKE recognises the importance of protecting children’s personal information.',
        'Where minors are permitted to use the Platform under STRIKE’s Terms & Conditions, applicable law and the relevant service requirements, the collection and processing of their personal information will be subject to the safeguards and consent requirements prescribed by applicable law.',
        'Where verifiable parental or guardian consent is legally required, STRIKE will obtain such consent before undertaking the relevant processing and will apply any additional safeguards required by law.',
        'STRIKE will not knowingly process children’s personal information in a manner prohibited by applicable law.',
        'Parents or lawful guardians who believe that a child’s information has been provided or processed inappropriately may contact STRIKE using the contact details below. STRIKE will assess such requests and take appropriate action in accordance with applicable law.',
      ],
    },
    {
      heading: '12. Your Privacy Rights and Choices',
      body: [
        'Subject to applicable law, you may have rights to:',
        {
          bullets: [
            'Obtain information about the personal data STRIKE processes about you.',
            'Request correction or updating of inaccurate or incomplete information.',
            'Request deletion of personal information where legally available.',
            'Withdraw consent for processing where processing is based on consent.',
            'Raise a grievance concerning the handling of your personal information.',
            'Nominate another person to exercise applicable rights in the event of death or incapacity, where provided under applicable law.',
          ],
        },
        'To exercise an applicable right, contact us using the details in Section 16. We may request reasonable information to verify your identity and protect your account before acting on your request.',
        'We will respond within the period prescribed by applicable law.',
        'Withdrawal of consent does not affect processing lawfully completed before withdrawal. It may also affect our ability to provide features that depend on the relevant information.',
        'You may opt out of promotional communications using an available unsubscribe mechanism or by contacting us. Essential account, security, transactional and legally required notices may continue where necessary.',
      ],
    },
    {
      heading: '13. Data Protection and Applicable Law',
      body: [
        'STRIKE intends to handle personal information in accordance with applicable Indian laws and regulations, including, as applicable to the relevant processing and effective legal provisions:',
        {
          bullets: [
            'The Digital Personal Data Protection Act, 2023 and the applicable rules made under it.',
            'The Information Technology Act, 2000 and applicable rules.',
            'Applicable consumer-protection and electronic-commerce requirements.',
            'Applicable tax, accounting and payment-related obligations.',
          ],
        },
        'The applicability and commencement of particular statutory obligations may depend on the relevant legal provisions and implementation timelines.',
        'Where required, STRIKE will provide appropriate privacy notices, obtain valid consent, facilitate applicable rights, maintain reasonable security safeguards and comply with legal obligations relating to retention, deletion and personal data breaches.',
      ],
    },
    {
      heading: '14. Cross-Border Processing',
      body: [
        'STRIKE may use third-party technology or infrastructure providers whose operations or systems are located in India or other jurisdictions.',
        'Where personal information is transferred, accessed or processed outside India, STRIKE will comply with applicable Indian legal requirements and any relevant restrictions or safeguards governing such transfers.',
        'The locations of STRIKE’s hosting, backup and third-party processing systems depend on the infrastructure deployed.',
      ],
    },
    {
      heading: '15. Changes to This Privacy Policy',
      body: [
        'STRIKE may update this Privacy Policy from time to time to reflect changes in its services, technical systems, business practices or legal obligations.',
        'The revised version will be published on the STRIKE Platform or another appropriate public location, together with an updated effective date.',
        'Where a change materially affects the purposes of processing, the information collected or the rights of users, STRIKE will provide appropriate notice and obtain fresh consent where required by applicable law.',
        'We encourage users to review this Policy periodically.',
      ],
    },
    {
      heading: '16. Grievance Redressal and Contact Information',
      body: [
        'If you have any questions, concerns, requests or complaints regarding the collection, use, disclosure, retention or deletion of your personal information, you may contact STRIKE using the details below.',
        '**Platform:** STRIKE',
        ...CONTACT_LINES,
        'Please include sufficient details to help us identify your account and understand your request. Do not include passwords, UPI PINs, complete card details or other authentication secrets in your communication.',
        'STRIKE will review privacy-related requests and grievances and respond in accordance with applicable law.',
        'If STRIKE is required to appoint a designated grievance officer or data protection officer under applicable law, the relevant name, designation and contact details will be published on the Platform.',
      ],
    },
    {
      heading: '17. Your Acknowledgement',
      body: [
        'By accessing or using STRIKE, you acknowledge that you have been provided access to this Privacy Policy.',
        'Where processing requires consent, your personal information will be processed on the basis of consent or another lawful basis available under applicable law, as appropriate to the circumstances.',
        'This Privacy Policy is intended to explain STRIKE’s data-handling practices transparently. It does not override any rights available to you under applicable law.',
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Account deletion (Google Play User Data policy)
// ─────────────────────────────────────────────────────────────────────────────

export const ACCOUNT_DELETION: LegalDocument = {
  title: 'Delete Your Account',
  lastUpdated: '22 October 2026',
  isDraft: false,
  sections: [
    {
      heading: 'Strike Vendor account deletion',
      body: [
        `The Strike Vendor app is provided by ${COMPANY.legalName}. You can ask us to delete your Strike Vendor account and the personal information associated with it.`,
        'Signing out of the app or uninstalling it does not delete your account.',
      ],
    },
    {
      heading: 'How to request deletion',
      body: [
        {
          numbered: [
            `Email ${COMPANY.supportEmail} from the email address registered on your vendor account, with the subject “Account deletion request – Strike Vendor”. In the app, the button below prepares this email for you.`,
            'Include your registered mobile number and business (shop) name so that we can identify your account.',
            'We may contact you on your registered mobile number or email address to confirm that the request came from you before acting on it.',
          ],
        },
        'You do not need the app installed to make a request.',
      ],
    },
    {
      heading: 'What is deleted and what is kept',
      body: [
        'When your request is processed, we delete your account and associated personal information, in accordance with applicable law and the Platform’s operational requirements.',
        'Information that must lawfully be retained — such as financial records of card purchases, redemptions, commissions and withdrawals, and records needed for fraud prevention, dispute resolution or other legal obligations — may be retained for the necessary period, with access and use appropriately restricted.',
        'Active memberships held by customers at your store, and any amounts due to or from you, are handled under the STRIKE Terms & Conditions and applicable law.',
      ],
    },
    {
      heading: 'Questions',
      body: [
        `We will respond within the period prescribed by applicable law. For questions, contact ${COMPANY.supportEmail} or call ${COMPANY.supportPhone}. Our Privacy Policy explains how we handle your information.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = {
  terms: TERMS,
  privacy: PRIVACY_POLICY,
  accountDeletion: ACCOUNT_DELETION,
} as const;

// Every unresolved placeholder in a document, de-duplicated. Final documents must return [].
export function outstandingItems(doc: LegalDocument): string[] {
  const text = JSON.stringify(doc);
  const found = new Set<string>();
  let i = text.indexOf(TBC_PREFIX);
  while (i !== -1) {
    const end = text.indexOf(']', i);
    found.add(text.slice(i + TBC_PREFIX.length, end));
    i = text.indexOf(TBC_PREFIX, end);
  }
  return [...found];
}

// ── Inline formatting shared by every renderer ───────────────────────────────

export type InlineSegment =
  | { kind: 'text'; text: string; bold: boolean }
  | { kind: 'link'; text: string; href: string; bold: boolean };

const LINK_PATTERN = new RegExp(
  [
    '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+',          // email
    'https:\\/\\/[^\\s)]+[^\\s).,;]',             // https URL
    'www\\.[\\w-]+(?:\\.[\\w-]+)+',               // www. domain
    `\\b${COMPANY.supportPhone}\\b`,              // verified support phone only
  ].join('|'),
  'g',
);

function hrefFor(match: string): string {
  if (match.includes('@')) return `mailto:${match}`;
  if (match === COMPANY.supportPhone) return `tel:${COMPANY.supportPhoneE164}`;
  if (match.startsWith('www.')) return `https://${match}`;
  return match;
}

// Splits "**bold** text with support@x.com" into renderable segments.
export function parseInline(input: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  input.split(/(\*\*[^*]+\*\*)/).forEach(chunk => {
    if (!chunk) return;
    const bold = chunk.startsWith('**') && chunk.endsWith('**');
    const text = bold ? chunk.slice(2, -2) : chunk;
    let last = 0;
    for (const m of text.matchAll(LINK_PATTERN)) {
      const at = m.index ?? 0;
      if (at > last) out.push({ kind: 'text', text: text.slice(last, at), bold });
      out.push({ kind: 'link', text: m[0], href: hrefFor(m[0]), bold });
      last = at + m[0].length;
    }
    if (last < text.length) out.push({ kind: 'text', text: text.slice(last), bold });
  });
  return out;
}
