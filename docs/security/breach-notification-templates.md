# Breach notification templates

**Date:** 9 May 2026
**Use:** during SEV-1 / SEV-2 incidents per the [incident response runbook](./incident-response.md). Adapt language to the specific incident; keep within legal clocks.

## EU supervisory authority — GDPR Art. 33 (within 72 hours)

```
Subject: Personal data breach notification — BioHubNet Training Platform

[Today's date]

To: [Lead supervisory authority for the affected EU data subjects]

Dear [Authority],

In accordance with Article 33 of the GDPR, we are notifying you of a personal
data breach affecting users of the BioHubNet Training Platform.

1. NATURE OF THE BREACH
   [Describe what happened, when it was discovered, how — chronological,
    factual, no speculation about cause unless confirmed.]

2. CATEGORIES OF DATA SUBJECTS AND DATA AFFECTED
   Approximate number of data subjects affected: [N] EU residents
   Categories of personal data:
   - [e.g., name, email address, hashed password]
   - [e.g., learning progress and assessment scores]
   - [e.g., resume / video introduction files (if applicable)]

3. LIKELY CONSEQUENCES
   [Realistic assessment — e.g., "Risk of phishing targeting affected
    addresses; no payment data was processed and none was exposed."]

4. MEASURES TAKEN AND PROPOSED
   - [Containment action 1, with timestamp]
   - [Containment action 2]
   - We are notifying affected individuals [today / by date].
   - We are conducting a full root-cause investigation expected to
     conclude by [date].
   - [Any third-party engaged: forensic firm name, insurer, etc.]

5. CONTACT INFORMATION
   Data Protection contact: privacy@biohubnetwork.ca
   Incident lead: [Name + role]

Yours faithfully,
[Authorising person]
BioHubNet
```

## Affected EU data subjects — GDPR Art. 34 (without undue delay if high risk)

```
Subject: Important security notice about your BHN Training account

Hi [Name],

We're writing to let you know about a security incident affecting the
BHN Training Platform. We discovered [what] on [date]. [Concise plain-
language description.]

WHAT INFORMATION OF YOURS WAS INVOLVED
[Specific to this user: e.g., your name, email address, and account
profile data. We do NOT believe your password was exposed because it
was hashed with bcrypt.]

WHAT WE'VE DONE
[Containment actions in plain language — what we've already fixed.]

WHAT YOU SHOULD DO
- Change your BHN password (link)
- Turn on multi-factor authentication if you haven't (link)
- Watch for any suspicious emails referring to BHN
- Contact privacy@biohubnetwork.ca with any questions

WE'RE SORRY THIS HAPPENED
[A real apology, in plain language, with what we're doing differently.]

— [Name], on behalf of the BHN team
```

## Office of the Privacy Commissioner of Canada — PIPEDA (as soon as feasible)

```
Subject: PIPEDA breach report — BioHubNet Training Platform

[Today's date]

To: Office of the Privacy Commissioner of Canada
    Breach Reporting Form

REPORTING ORGANISATION
Name: BioHubNet
Address: [redacted in template]
Privacy contact: privacy@biohubnetwork.ca

DESCRIPTION OF BREACH
[Same chronological description as GDPR template above.]

WHEN AND HOW DISCOVERED
Discovered on [date] at [time]. Discovered by [internal monitoring /
external research / customer report].

CAUSE OF THE BREACH
[Best understanding to date; mark as preliminary if RCA isn't complete.]

PERSONAL INFORMATION INVOLVED
[Same data categories list. State explicitly if Canadian residents
are involved and approximate number.]

NUMBER OF INDIVIDUALS AFFECTED
[N], of which [X] reside in Canada and [Y] in [each affected province].

REAL RISK OF SIGNIFICANT HARM ASSESSMENT
[PIPEDA-specific test: financial loss, identity theft, employment
impact, damage to reputation, etc. State conclusion + reasoning.]

NOTIFICATION TO AFFECTED INDIVIDUALS
Status: [planned for / completed on date / not required because no real risk]

MEASURES TAKEN
[Containment + remediation actions.]

CONTACT FOR FURTHER INFORMATION
[Name, role, email, phone]
```

## Quebec Commission d'accès à l'information — Law 25 (without delay)

```
[French version required. Use the OPC template structure but file with
the Commission d'accès à l'information du Québec. Notify in French if
the affected individual's primary language preference is French.]

Notification d'incident de confidentialité

Date: [date]
Organisme: BioHubNet
Coordonnées du responsable de la protection des renseignements
personnels: privacy@biohubnetwork.ca

Date à laquelle l'incident a été découvert: [date]
Description de l'incident: [description en français]
Catégories de renseignements personnels concernés: [liste]
Nombre de personnes touchées au Québec: [N]
Évaluation du risque de préjudice sérieux: [évaluation + conclusion]
Mesures prises pour réduire le risque: [liste]
[…]
```

## Customer notification — enterprise contract DPAs (typically within 24 hours of awareness)

```
Subject: Security incident notice — [Customer name]

[Today's date]

[Customer security contact],

This letter notifies [Customer name] of a security incident affecting
the BioHubNet Training Platform under our agreement dated [date].

INCIDENT SUMMARY
[Brief factual description.]

DATA POTENTIALLY INVOLVED
[Specific to the customer's tenant, if applicable. Otherwise: "We are
investigating whether [Customer]'s data was within the affected scope
and will update within 72 hours of confirmation."]

OUR RESPONSE
[Containment, investigation, communication plan to affected individuals
under our DPA.]

YOUR OBLIGATIONS
[As specified in the DPA — typically: cooperate with investigation,
maintain confidentiality of investigation details, comply with any
joint notification timing the parties agree to.]

NEXT UPDATE
We commit to a written update by [time within 24-72 hours] regardless
of investigation progress.

[Authorising signature]
```

## US state-by-state breach notice (template combining most strict requirements)

```
Subject: Notice of data security incident

Dear [Name],

We are writing to inform you of a data security incident that may have
involved some of your personal information.

WHEN: We discovered the incident on [date].
WHAT HAPPENED: [Plain description.]
INFORMATION INVOLVED: [List of data types — match California / NY SHIELD
Act minimum disclosures.]
WHAT WE'RE DOING: [Containment + remediation summary.]
WHAT YOU CAN DO:
- [Specific actions: change password, enable MFA, monitor accounts]
- For US residents: place a fraud alert with one of the credit bureaus
  (Equifax, Experian, TransUnion).

FOR MORE INFORMATION
privacy@biohubnetwork.ca
[A toll-free number if state law requires]

We sincerely regret this incident.

[Name, role]
BioHubNet
```

---

## Notes on use

- **Always update the date** to today's date when sending.
- **Numbers must be reconciled** before notification — better to delay 24h to get the count right than send a "rough estimate" that has to be corrected.
- **Get sign-off from leadership + (when retained) outside counsel** before any external send.
- **Keep a copy** of every notification in the incident folder; auditors will ask.
- **French / RTL versions** for jurisdictions that require them — translate before sending; never send English-only to Quebec or French-Canadian individuals.

## Change log

| Date | Change |
|---|---|
| 2026-05-09 | Initial templates. |
