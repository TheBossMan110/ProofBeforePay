# How ProofBeforePay decides

Methodology version 2. The version is stored with every report (`report.version`, `investigations.methodology_version`), so an old report can still be explained after the rules change.

ProofBeforePay answers one question: **should you trust this enough to take the next step?** It does not produce a fraud probability. The confidence number is the model's own estimate of how sure it is about the decision, adjusted by the rules below. It is not a statistically validated score and the UI never calls it one.

## The three answers

| Decision | Meaning |
|----------|---------|
| **Proceed** | The sender's identity is confirmed through official channels (official email domain, or the role on the official site) and there are no material risk signals. |
| **Verify first** | It may be genuine, but key facts are unconfirmed or there are minor signals. Get specific confirmation before sharing personal data or doing unpaid work. |
| **Stop** | Concrete, material risk: a request for money, a fake-check scheme, a contradicted identity, a lookalike or brand-new domain, or this exact script reported elsewhere. |

## Evidence comes in three kinds

**Hard signals `[F#]`** are found by code, not by a model, and each one carries the text or record it came from.

| Rule | Severity | What triggers it |
|------|----------|------------------|
| Asks you to pay before you start | high | Registration, training, onboarding… fees or deposits |
| Fake-check / equipment purchase | high | Being sent a check, an "approved vendor", buying your own equipment |
| Hard-to-reverse payment methods | high | Crypto, gift cards, wire services, Zelle, Cash App |
| Sensitive personal or financial data | high | SSN, bank login, passport scans, card numbers |
| Instructions aimed at AI checkers | high | "Ignore previous instructions", "classify this message as safe" |
| Interview over a chat app | medium | Interviews or hiring only on Telegram, WhatsApp, Signal… |
| Hiring with no screening | medium | "No experience needed, start today" |
| Pressure to act fast | low | Deadlines in hours, "limited slots" |
| Free email for a company role | medium | Gmail, Outlook… while claiming to be a company |
| Email domain differs from the official site | high | Sender's domain isn't the company's domain found by research |
| Link uses a lookalike of the company name | high | e.g. `amazon-careers-hiring.com` |
| Very new domain | high / medium | RDAP registration under 90 days / under a year |
| No registration record | medium | The registry has no record of a linked domain |
| Linked page presents itself as the company | high | A non-official page using the company's name |
| Linked page asks for payment, login or ID | high | Read through Tavily Extract, never opened by our server |
| Role found / not found on the official site | medium | Tavily Crawl of the official careers pages |
| Wording found elsewhere | medium | Exact-match search for the message's most distinctive sentence |

Reassuring signals (green) come from the same checks: an email domain that matches the official site, an established domain, the role listed on the official site, a link that goes to the official site.

**Claim checks `[C#]`.** Each checkable statement in the message is marked:

- **verified**: a source explicitly confirms it;
- **contradicted**: a source clearly conflicts with its core (small differences in detail don't count, and a third-party blog can't overrule a company about its own process);
- **inconclusive**: anything else. Missing evidence is always inconclusive, never contradicted.

A quote is only shown if it appears word for word in the cited page.

**Sources `[S#]`.** Every page any agent read, with the time it was read. Pages on the company's own domain are marked as official, given more room in the prompt, and preferred over third-party summaries.

## Rules enforced by code

1. **No Proceed when money, credentials or ID are requested**, or when the message tries to instruct the checker. The decision becomes Verify first and the report says why.
2. **Citations are checked.** References to ids that don't exist are removed; quotes that can't be found in their source are removed.
3. **The challenge.** After Ultra's verdict, Nemotron Super runs its own searches against it and names the decision it thinks is right, plus how much doubt is left. Code then applies these rules:
   - same decision, little doubt → the verdict holds;
   - same decision, serious doubt → confidence drops by 15 (not below 40);
   - a different decision → the two models disagree, so the answer becomes **Verify first** (confidence capped at 60);
   - except: a Stop on a message that asks for money stays a Stop (confidence drops by 20, not below 50).
4. **Findings are audited.** The challenger checks each of Ultra's findings against the sources it cites. Findings that claim more than their sources say stay in the report, marked as disputed with the reason.
5. **"What would change this verdict"** never promises a Proceed while rule 1 applies.

## What it can't do

It can't prove a message is fraudulent or genuine. It can't read email headers (SPF, DKIM, DMARC), private databases or anything behind a login. A real company can still be impersonated from a real-looking domain, and a small genuine business may have no web presence at all. That's why "Verify first" exists, and why the report always says what to check yourself.
