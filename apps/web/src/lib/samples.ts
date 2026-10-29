import type { OfferInput } from "@/types";

export interface Sample extends OfferInput {
  label: string;
}

/** Sample messages modeled on job- and payment-scam patterns described in public consumer-protection warnings. */
export const SAMPLES: Sample[] = [
  {
    label: "Remote job via Telegram",
    channel: "Telegram",
    sender: "amazon.talent.onboarding.desk@gmail.com",
    message: `Hello,

My name is Sarah Mitchell, Talent Acquisition Coordinator at Amazon. We came across your profile and are pleased to offer you the position of Remote Data Entry Specialist at $42 per hour, 20 hours a week. No prior experience is required and you can start immediately.

Your interview will be conducted by our hiring manager over Telegram chat (@amz_talent_desk). After onboarding we will send you a check to purchase your home-office equipment from our approved vendor. A refundable onboarding fee of $85 is required to reserve your slot.

Kindly confirm within 24 hours as positions are limited. Complete your registration at amazon-careers-hiring.com.

Best regards,
Sarah Mitchell
Talent Acquisition, Amazon`,
  },
  {
    label: "Freelance client overpayment",
    channel: "Email",
    sender: "quillmere.studio.projects@outlook.com",
    message: `Hi there,

I came across your portfolio on Behance and love your style. I'm David Laurent, project manager at Quillmere Design Studio. We need a full brand identity (logo, colour palette, social templates) for a new client, budget $1,800.

To get started quickly, I'll mail you a cheque for $3,200 that covers your fee plus our print vendor's fee. Once it clears, please send the remaining $1,400 to our vendor through Zelle so they can begin printing.

I travel a lot so WhatsApp is easiest. Send me your number and I'll message you there. Please reply today so we can lock in the schedule.

Regards,
David Laurent
Quillmere Design Studio`,
  },
];
