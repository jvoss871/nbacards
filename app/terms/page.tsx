'use client'

const EFFECTIVE_DATE = 'July 24, 2026'

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="pt-6 first:pt-0">
      <h2 className="text-sm font-black text-[#1a1714] mb-2">{n}. {title}</h2>
      <div className="text-sm text-[#6b6259] leading-relaxed space-y-2.5">
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#1a1714]">Terms of Service</h1>
        <p className="text-[#a39890] text-xs mt-1">Effective {EFFECTIVE_DATE}</p>
      </div>

      <div className="bg-white border border-[#e2ddd6] rounded-2xl shadow-sm px-6 py-6 divide-y divide-[#f0ede8]">

        <Section n={1} title="Acceptance of Terms">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of CardPicks
            (&quot;CardPicks,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), including the website, associated
            apps, and all features described below (together, the &quot;Service&quot;). By creating an
            account or otherwise using the Service, you agree to be bound by these Terms. If you do
            not agree, do not use the Service.
          </p>
        </Section>

        <Section n={2} title="Eligibility">
          <p>
            You must be at least 18 years old to create an account or make a purchase on CardPicks.
            By using the Service, you represent that you meet this requirement and that you have the
            legal capacity to enter into these Terms.
          </p>
        </Section>

        <Section n={3} title="Description of the Service">
          <p>
            CardPicks is an entertainment app built around NBA statistics and schedules. It includes:
            opening virtual card packs, predicting the outcomes of real NBA games (&quot;Pick&apos;em&quot;),
            answering daily trivia questions, and an optional mock NBA Draft prediction game. Cards,
            packs, credits, and any in-app items are virtual, exist only within the Service, and have
            no value outside of it.
          </p>
        </Section>

        <Section n={4} title="Accounts">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activity that occurs under your account. Notify us immediately of any unauthorized
            use. We may suspend or terminate accounts that violate these Terms, as described in
            Section 9.
          </p>
        </Section>

        <Section n={5} title="Credits and Virtual Currency">
          <p>
            &quot;Credits&quot; are a virtual, in-app currency used to open packs, wager on picks, and
            unlock features within the Service. Credits:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Have no monetary value and cannot be redeemed, exchanged, or cashed out for real money or any other consideration.</li>
            <li>Are non-transferable between accounts.</li>
            <li>May be earned through gameplay or purchased with real money, at then-current prices set within the Service.</li>
            <li>May be forfeited if your account is terminated for violating these Terms.</li>
          </ul>
        </Section>

        <Section n={6} title="Purchases and Payment">
          <p>
            Purchases of credits are processed by a third-party payment processor (Stripe). By making
            a purchase, you authorize the charge to your selected payment method. All purchases are
            final and non-refundable except where required by applicable law. If you believe you were
            charged in error, contact us at the email in Section 15 before initiating a chargeback with
            your bank or card issuer — unresolved chargebacks may result in account suspension.
          </p>
        </Section>

        <Section n={7} title="Packs, Odds, and Randomized Outcomes">
          <p>
            Card packs contain a randomized selection of virtual player cards. The probability of
            receiving a card of a given rarity tier is disclosed in the Service at the time of
            purchase. Outcomes are determined by the Service&apos;s systems at the time a pack is
            opened and are final. CardPicks is a game of chance and skill played for entertainment
            purposes only — it is not gambling, since credits and cards have no cash value and cannot
            be withdrawn or exchanged for money.
          </p>
        </Section>

        <Section n={8} title="Predictions and Wagering Cards">
          <p>
            Pick&apos;em predictions are settled based on the actual outcome of the real-world NBA game
            being predicted, using data from our sports-data providers. If you wager a virtual card on
            a prediction, that card may be consumed (lost) if the prediction is incorrect, as disclosed
            in the Service at the time you place the wager. We are not responsible for delays or errors
            in third-party sports data feeds, though we will make reasonable efforts to correct
            settlement errors caused by bad data.
          </p>
        </Section>

        <Section n={9} title="Prohibited Conduct">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use bots, scripts, or other automated means to interact with the Service.</li>
            <li>Exploit bugs, glitches, or unintended behavior for gain, rather than reporting them to us.</li>
            <li>Create multiple accounts to circumvent limits, promotions, or restrictions.</li>
            <li>Attempt to reverse-engineer, scrape, or interfere with the Service&apos;s operation.</li>
            <li>Use the Service for any unlawful purpose.</li>
          </ul>
          <p>
            We may correct account balances, void transactions, or suspend or terminate accounts that
            violate this section, with or without notice.
          </p>
        </Section>

        <Section n={10} title="Intellectual Property">
          <p>
            The Service, including its software, design, and original content, is owned by CardPicks
            and protected by intellectual property laws. NBA team names, player names, and statistics
            referenced in the Service are used for informational and entertainment purposes to describe
            real-world sports events and public figures. <strong>CardPicks is an independent product and
            is not affiliated with, sponsored by, or endorsed by the National Basketball Association,
            its teams, or its players.</strong>
          </p>
        </Section>

        <Section n={11} title="Termination">
          <p>
            You may stop using the Service at any time. We may suspend or terminate your access to the
            Service, in whole or in part, at our discretion, including for violation of these Terms,
            with or without prior notice.
          </p>
        </Section>

        <Section n={12} title="Disclaimer of Warranties">
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND,
            WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT GUARANTEE THE SERVICE WILL BE
            UNINTERRUPTED, SECURE, OR ERROR-FREE.
          </p>
        </Section>

        <Section n={13} title="Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, CARDPICKS WILL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE
            SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE
            AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE.
          </p>
        </Section>

        <Section n={14} title="Governing Law">
          <p>
            These Terms are governed by the laws of the State of Georgia, USA, without regard to its
            conflict-of-laws principles. Any dispute arising from these Terms or the Service will be
            resolved in the state or federal courts located in Georgia, and you consent to their
            jurisdiction.
          </p>
        </Section>

        <Section n={15} title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. If we make material changes, we will update
            the effective date above. Continued use of the Service after a change takes effect
            constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section n={16} title="Contact">
          <p>
            Questions about these Terms can be sent to{' '}
            <a href="mailto:jvoss87@gmail.com" className="text-amber-600 font-bold hover:text-amber-700">jvoss87@gmail.com</a>.
          </p>
        </Section>

      </div>
    </div>
  )
}
