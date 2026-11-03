import {brand} from './brand'
import type {Dictionary} from './fr'

/** English texts. Same structure as fr.ts (TypeScript reports any missing key). */

const founderRole = 'Physiotherapist by training'

export const en: Dictionary = {
    brandText: {
        tagline: 'Wellbeing & retreats',
        founderRole,
        area: '100% online, on Google Meet',
    },
    nav: [
        {to: '/seminaires', label: 'Seminars'},
        {to: '/accompagnement', label: 'Coaching'},
        {to: '/a-propos', label: 'Approach'},
        {to: '/contact', label: 'Contact'},
    ],
    home: {
        eyebrow: `${founderRole} · Workplace wellbeing`,
        title: ['Slow down,', 'to move', 'forward.'],
        accentWord: 'forward.',
        intro: 'Online wellbeing seminars and one-to-one coaching for teams and people who want to feel at ease in their body and find some calm in their schedule. Wherever you are.',
        primaryCta: 'Plan a seminar',
        secondaryCta: 'Discover the approach',

        manifesto: 'We spend whole days sitting, rushing, putting off the moment we take care of ourselves. Synégo offers the opposite: chosen, measured time to move better, breathe deeper and get back to work with energy. No miracle cure, no jargon: simple gestures, learned together, that everyone keeps for themselves.',

        pillars: [
            {
                word: 'Posture',
                text: 'Understand how the body works at a desk, at home or on the road, and adjust what tires you without you noticing.'
            },
            {
                word: 'Breathing',
                text: 'A few minutes of guided breathing are enough to bring the pressure down. You learn exercises you can repeat alone, anywhere.'
            },
            {
                word: 'Movement',
                text: 'Gentle, accessible movement for everyone, with no sportswear or equipment, to wake a team up or close a day.'
            },
            {word: 'Recovery', text: 'Sleep, breaks, pacing: small habits that change the way you finish the week.'},
        ],

        method: {
            eyebrow: 'The method',
            title: 'A seminar is prepared like an important appointment.',
            steps: [
                {
                    hour: '12',
                    short: 'Audit',
                    title: 'The audit',
                    text: 'A first conversation to understand your team, its pace, its constraints and how you want people to feel when they leave.'
                },
                {
                    hour: '3',
                    short: 'Programme',
                    title: 'A tailored programme',
                    text: 'You receive a written proposal: schedule, length, number of participants, online format. The quote follows, with no commitment.'
                },
                {
                    hour: '6',
                    short: 'The day',
                    title: 'The day itself',
                    text: 'On Google Meet, everyone from their own desk: small-group workshops, practice and explanation, a relaxed atmosphere. Nobody is put on the spot.'
                },
                {
                    hour: '9',
                    short: 'Follow-up',
                    title: 'The follow-up',
                    text: 'A report and exercise sheets are added to your client space. Follow-up sessions make the effect last.'
                },
            ],
        },

        forWhom: [
            {
                title: 'For companies',
                text: 'Leadership teams, field teams, departments going through change: a seminar or a series of workshops to breathe, reconnect and leave with gestures that help every day.',
                cta: 'Book a seminar audit',
                to: '/rendez-vous#prospects',
            },
            {
                title: 'For you, personally',
                text: 'One-to-one coaching at your own pace, to build new habits and stay on track between sessions with your client space.',
                cta: 'Book a discovery call',
                to: '/rendez-vous#prospects',
            },
        ],

        quote: {
            title: 'On quote, always.',
            text: 'Every team is different: its size, its pace, its energy at the moment. Instead of a price list, you receive a proposal built for you after a free first conversation.',
            cta: 'Request a quote',
        },

        finalCta: {
            title: ['Let\'s take the time', 'to talk.'],
            text: 'A first conversation, with no commitment, to see what would do you good.',
        },

        marquee: ['Posture', 'Breathing', 'Cohesion', 'Movement', 'Recovery', 'Sleep', 'Energy', 'Calm'],
    },
    seminaires: {
        eyebrow: 'Seminars & workshops',
        title: ['Days', 'that leave', 'a mark.'],
        intro: 'On Google Meet, as a half day, a full day or a series of workshops: everyone joins from their desk or from home. The format adapts to the team, never the other way round.',
        formats: [
            {
                title: 'Posture & work',
                duration: 'Half day',
                text: 'Understand the tension caused by workstations, learn to spot it and release it. Everyone joins from their own desk: we adjust live, cameras on.',
                details: ['Live adjustment of each workstation', 'A 5-minute routine to repeat every day', 'A summary sheet in the client space'],
            },
            {
                title: 'Stress & recovery',
                duration: 'Half day or full day',
                text: 'Breathing, muscle release, managing breaks: simple tools to get through busy periods better.',
                details: ['Introduction to cardiac coherence breathing', 'Small-group workshops (Meet breakout rooms)', 'Audio exercises available in the client space'],
            },
            {
                title: 'Remote cohesion',
                duration: 'Half day',
                text: 'For scattered or remote teams: moving, breathing and laughing together through the screen, to reconnect differently.',
                details: ['Designed for remote teams', 'Short, lively sequences, cameras on', 'Schedule designed with you'],
            },
            {
                title: 'Restorative cycle',
                duration: '4 to 8 weeks',
                text: 'One online session every week for one or two months, to build lasting new habits within the team.',
                details: ['One group session a week', 'Audio exercises between sessions', 'Individual follow-up offered afterwards'],
            },
        ],
        day: {
            eyebrow: 'A typical day',
            title: 'The seminar, hour by hour',
            slots: [
                {
                    time: '09:00',
                    title: 'Log-in & warm-up',
                    text: 'Everyone joins the Google Meet from their desk, cameras on, then ten minutes to wake the body up.'
                },
                {
                    time: '10:00',
                    title: 'Posture workshop',
                    text: 'What our days do to our backs, and how to avoid it. We adjust everyone\'s workstation, live.'
                },
                {
                    time: '12:30',
                    title: 'Lunch break',
                    text: 'Cameras off, away from the screen: a real break, designed as a moment of recovery.'
                },
                {
                    time: '14:00',
                    title: 'Guided breathing',
                    text: 'An introduction to cardiac coherence and relaxation. Everyone leaves with their own routine.'
                },
                {
                    time: '15:30',
                    title: 'Group activity',
                    text: 'In Meet breakout rooms, a movement exercise that gets the team working together, without competition.'
                },
                {
                    time: '16:30',
                    title: 'Closing & commitments',
                    text: 'Everyone picks one habit to keep. We talk about it again at the follow-up.'
                },
            ],
        },
        faq: [
            {
                q: 'Do we need sportswear?',
                a: 'No. Every exercise can be done in work clothes, without equipment, with a little space around your chair.'
            },
            {
                q: 'How many participants?',
                a: 'From 6 to 40 people depending on the format. Beyond that, the day is split into several groups to keep real time with everyone.'
            },
            {
                q: 'Where do seminars take place?',
                a: 'Online, on Google Meet: everyone joins from their desk or from home, anywhere. There is no practice to travel to. On request, a workshop can occasionally be held in person (on quote).'
            },
            {
                q: 'What do we need?',
                a: 'A computer with camera and microphone, an internet connection and a little space to move. The Google Meet link is sent when you book and reminded the day before.'
            },
            {
                q: 'How much does it cost?',
                a: 'Every seminar is quoted after the free audit: the price depends on the format, the length and the number of participants.'
            },
            {
                q: 'Is it medical care?',
                a: 'No. Seminars are about wellbeing and prevention. They do not replace a consultation with a healthcare professional.'
            },
        ],
    },
    accompagnement: {
        eyebrow: 'One-to-one coaching',
        title: ['Support', 'at your', 'own pace.'],
        intro: 'For those who want to go further than a workshop: a personal programme, regular sessions and an online space to keep track between appointments.',
        steps: [
            {
                title: 'Discovery call',
                text: '20 minutes on Google Meet to get to know each other and see whether coaching suits you. Free, no commitment.'
            },
            {
                title: 'Proposal on quote',
                text: 'You receive a written proposal: number of sessions, pace, goals. You decide in your own time.'
            },
            {
                title: 'Your client space',
                text: 'Once registered, you find your programmes, exercise sheets and appointments in a secure space.'
            },
            {
                title: 'Follow-up sessions',
                text: 'Sessions on Google Meet that you book yourself, at times that suit you, with no waiting for confirmation.'
            },
        ],
        space: {
            title: 'Your space, just for you',
            items: [
                'Your documents: programmes, reports, quotes and invoices',
                'Your upcoming appointments and their Google Meet link, to move or cancel in two clicks',
                'Your questions, with written answers and a history',
                'Sign in by email, text message or with your Google account',
            ],
        },
    },
    apropos: {
        eyebrow: 'The approach',
        title: ['The body', 'already knows.', 'We listen.'],
        intro: `${brand.founder}, ${founderRole.toLowerCase()}, founded Synégo with one conviction: wellbeing at work cannot be decreed, it has to be practised. [To be completed: background, turning point, what led to creating Synégo.]`,
        values: [
            {
                title: 'Simplicity',
                text: 'Exercises understood the first time and repeated without help. If a gesture needs a manual, it will never be repeated.'
            },
            {title: 'Measure', text: 'No spectacular promises. Real progress, over a week, a month, a season.'},
            {
                title: 'Trust',
                text: 'What is said in a session stays in the session. Your documents are stored securely and shared with no one.'
            },
            {
                title: 'Rigour',
                text: 'Physiotherapy training, put to the service of prevention and wellbeing, with the same seriousness.'
            },
        ],
        signature: 'The name Synégo blends synergy and ego, in the sense of the self: what we do together so that everyone feels better.',
    },
    rendezVous: {
        eyebrow: 'Book an appointment',
        title: ['Choose', 'your', 'moment.'],
        intro: 'All appointments take place on Google Meet. Bookings are confirmed instantly: you receive the joining link, then a reminder 48 h and 24 h before.',
        prospects: {
            title: 'New to Synégo',
            text: 'A first conversation to get to know each other and talk about your project. Free, no commitment.',
        },
        clients: {
            title: 'Already a client',
            text: 'Book your next follow-up session straight into your calendar.',
            loggedOut: 'Follow-up sessions are reserved for coached clients. Sign in to your space to access them.',
            notSigned: 'Your account is ready. Follow-up sessions will open as soon as your coaching has started.',
        },
    },
    contact: {
        eyebrow: 'Contact & quotes',
        title: ['Write to us,', 'we will', 'reply.'],
        intro: 'Describe your team or your needs in a few lines. You will receive a personal reply within 2 working days.',
        placeholder: 'For example: a team of 15 people, mostly desk-based, a one-day seminar in June…',
    },
    legal: {
        disclaimer: 'Synégo services relate to wellbeing and prevention. They are neither a diagnosis nor a medical treatment, and do not replace a consultation with a healthcare professional.',
    },

    booking: {
        minutes: 'min',
        seeSlots: 'See available times',
        clientsOnly: 'Clients only',
        unavailable: 'The calendar is temporarily unavailable. Please write to us from the contact page.',
        booked: 'You\'re booked. A confirmation email is on its way.',
        iframeTitle: 'Choose a time',
        login: 'Sign in',
        addToCalendar: 'Add to my calendar',
        calendarHint: 'Apple and Samsung: the file opens straight in your calendar.',
        calendarOther: 'Other calendar (.ics)',
        types: {
            'audit-seminaire': {
                title: 'Seminar audit',
                summary: '45 minutes online to understand your team, your constraints and the effect you are looking for. You leave with concrete ideas, even if we don\'t work together.',
            },
            'appel-decouverte': {
                title: 'Discovery call',
                summary: '20 minutes on Google Meet to get to know each other, talk about your project and see whether coaching suits you.',
            },
            'seance-suivi': {
                title: 'Follow-up session',
                summary: 'The regular online appointment for coached clients: we review, adjust the programme and move forward.',
            },
        },
    },

    contactForm: {
        kindQuote: 'Quote request',
        kindContact: 'Simple question',
        name: 'Full name',
        email: 'Email',
        phone: 'Phone (optional)',
        company: 'Company (optional)',
        subject: 'Subject',
        message: 'Your message',
        consent: 'Your details are only used to answer your request. They are never sold or used for marketing.',
        submit: 'Send request',
        sending: 'Sending…',
        sentTitle: 'Thank you, we\'ve got it.',
        sentText: 'Your request reference is #{ref}. You will receive a personal reply within 2 working days.',
        another: 'Send another request',
        direct: 'Or directly',
    },

    ui: {
        skip: 'Skip to content',
        home: 'Home',
        mainNav: 'Main navigation',
        mobileNav: 'Mobile menu',
        openMenu: 'Open menu',
        closeMenu: 'Close menu',
        clientSpace: 'Client space',
        mySpace: 'My space',
        book: 'Book an appointment',
        bookShort: 'Appointments',
        language: 'Language',
        themeToDark: 'Switch to dark mode',
        themeToLight: 'Switch to light mode',
        scroll: 'Scroll',
        loading: 'Loading',
        breathIn: 'Breathe in',
        breathOut: 'Breathe out',
        breathFree: 'Breathe at your own pace',
        breathCaption: 'Cardiac coherence · 5 s / 5 s',
        finalCtaBook: 'Book a first conversation',
        finalCtaQuote: 'Request a quote',
        whyEyebrow: 'Why Synégo',
        pillarsEyebrow: 'Four gestures',
        pillarsTitle: 'What we work on together',
        formatsEyebrow: 'Formats',
        formatsTitle: 'Four ways to bring a team together differently',
        formatCta: 'Get a proposal for this format',
        faqEyebrow: 'Frequently asked questions',
        faqTitle: 'Before you start',
        seminarAudit: 'Book a seminar audit',
        discoveryCall: 'Book a discovery call',
        journeyEyebrow: 'The journey',
        journeyTitle: 'From first contact to follow-up',
        spaceEyebrow: 'Client space',
        spaceCta: 'Go to my space',
        valuesEyebrow: 'What guides the work',
        valuesTitle: 'Four principles, not one more',
        footerExplore: 'Explore',
        footerReach: 'Reach us',
        footerLogin: 'Sign in',
        footerRegister: 'Create an account',
        footerQuoteOnly: 'Prices on quote only.',
        legalNotice: 'Legal notice',
        privacy: 'Privacy',
        notFoundTitle: 'This page has another appointment.',
        notFoundCta: 'Back to home',
        dialogBack: 'Back',
        dialogConfirm: 'Confirm',
    },

    auth: {
        loginTitle: 'Welcome back.',
        loginText: 'Sign in to find your documents, appointments and conversations.',
        registerTitle: 'Create your space.',
        registerText: 'A personal, secure space to follow your coaching.',
        google: 'Continue with Google',
        or: 'or',
        tabEmail: 'Email',
        tabPhone: 'Phone',
        email: 'Email address',
        password: 'Password',
        passwordHint: 'At least 10 characters',
        confirm: 'Confirm password',
        name: 'Full name',
        forgot: 'Forgot your password?',
        forgotText: 'Enter your email: you will receive a link to choose a new password.',
        forgotSend: 'Send the link',
        forgotSent: 'If an account exists for this address, a link has just been sent.',
        back: 'Back',
        login: 'Sign in',
        register: 'Create my account',
        phone: 'Mobile number',
        phoneHint: 'Example: +33 6 12 34 56 78',
        sendCode: 'Get a code by text message',
        code: 'Code received by text',
        codeSentTo: 'Code sent to {phone}.',
        changeNumber: 'Change number',
        confirmCode: 'Confirm',
        noAccount: 'No account yet?',
        hasAccount: 'Already have an account?',
        createAccount: 'Create an account',
        mismatch: 'The two passwords do not match.',
        tooShort: 'The password must be at least 10 characters long.',
        pleaseWait: 'One moment…',
        privacyNote: 'Sign-in secured by Firebase. No password is stored on our servers.',
        resendCode: 'Resend the code',
        resendIn: 'Resend the code in {s} s',
        errors: {
            'auth/invalid-email': 'This email address does not look valid.',
            'auth/invalid-credential': 'Wrong email or password.',
            'auth/email-already-in-use': 'An account already exists with this address. Please sign in instead.',
            'auth/weak-password': 'Password too simple: at least 10 characters, with numbers or symbols.',
            'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
            'auth/invalid-phone-number': 'Invalid number. Example: +33 6 12 34 56 78.',
            'auth/missing-phone-number': 'Please enter your mobile number.',
            'auth/invalid-verification-code': 'The code you entered does not match.',
            'auth/missing-verification-code': 'Please enter the code you received.',
            'auth/code-expired': 'The code has expired. Request a new one.',
            'auth/operation-not-allowed': 'Text-message sign-in is not enabled: Firebase console > Authentication > Sign-in method > Phone.',
            'auth/billing-not-enabled': 'Firebase refuses to send real text messages on this project (free plan). Upgrade to Blaze, or use a test number.',
            'auth/quota-exceeded': 'The project\'s daily text-message quota is reached. Try again tomorrow or use a test number.',
            'auth/captcha-check-failed': 'Anti-bot check failed: add this domain in Firebase > Authentication > Settings > Authorized domains.',
            'auth/invalid-app-credential': 'The anti-bot check was rejected (common locally). Use a test number, or try on the production domain.',
            'auth/unauthorized-domain': 'This domain is not authorized in Firebase > Authentication > Settings > Authorized domains.',
            'auth/network-request-failed': 'No internet connection. Check your network.',
            'auth/popup-closed-by-user': 'The Google window was closed before signing in.',
            'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups for this site.',
            'auth/requires-recent-login': 'For security, please sign in again and retry.',
            generic: 'Sign-in failed ({code}). Please try again.',
        },
    },

    espace: {
        nav: {
            home: 'Home',
            appointments: 'Appointments',
            documents: 'Documents',
            requests: 'Requests',
            profile: 'Profile',
            admin: 'Back office'
        },
        logout: 'Sign out',
        backToSite: 'Back to the website',
        hello: 'Hello {name}.',
        roleProspect: 'Account created: your coaching has not started yet.',
        roleClient: 'Coached client since {date}.',
        roleAdmin: 'Coach space',
        apiDown: 'Your space is temporarily unavailable. Please try again in a few minutes.',
        verifyTitle: 'Confirm your email address',
        verifyText: 'A link was sent to {email}. Click it, then come back here.',
        verifyDone: 'I have confirmed',
        verifyResend: 'Resend the email',
        verifySent: 'Email sent again.',
        verifyPending: 'Not confirmed yet: check your inbox (and spam folder).',
        nextAppointment: 'Next appointment',
        noUpcoming: 'No upcoming appointment.',
        latestDocuments: 'Latest documents',
        noDocuments: 'No documents yet.',
        openRequests: 'Open requests',
        noRequests: 'No open request.',
        seeAll: 'See all',
        bookNow: 'Book a time',
        appointmentsTitle: 'Your appointments',
        bookTitle: 'Book an appointment',
        bookClose: 'Close',
        rescheduleTitle: 'Choose your new time: the previous appointment will be cancelled automatically.',
        cancelConfirm: 'Cancel the appointment on {date}?',
        canceled: 'Appointment cancelled. Calendly is sending you a confirmation email.',
        rescheduled: 'Done: your new appointment is confirmed and the previous one cancelled.',
        actionFailed: 'This is not possible right now: {reason}',
        upcoming: 'Upcoming',
        past: 'Past',
        reschedule: 'Reschedule',
        cancel: 'Cancel',
        join: 'Join the video call',
        cancelPolicy: 'You can cancel or reschedule up to 24 hours before.',
        cancelClosed: 'Less than 24 hours to go: this appointment can no longer be cancelled.',
        status: {Scheduled: 'Scheduled', Canceled: 'Cancelled', Done: 'Done', NoShow: 'Missed'},
        documentsTitle: 'Your documents',
        documentsText: 'Programmes, reports, quotes and invoices shared with you, and the files you upload.',
        documentsWarning: 'Please do not upload medical documents: this space is not designed for health data.',
        drop: 'Upload a file',
        dropHint: 'PDF, image or Office document, 10 MB max.',
        uploading: 'Uploading…',
        sharedWithYou: 'Shared with you',
        yours: 'Uploaded by you',
        download: 'Download',
        delete: 'Delete',
        confirmDelete: 'Delete “{name}”?',
        deleted: 'Document deleted.',
        requestsTitle: 'Your requests',
        requestsText: 'A question about your programme, a document, an appointment? Write here: the answer will appear in this thread.',
        newRequest: 'New request',
        subject: 'Subject',
        message: 'Message',
        send: 'Send',
        reply: 'Reply',
        replyPlaceholder: 'Your reply…',
        ticketStatus: {Open: 'Sent', InProgress: 'In progress', Closed: 'Closed'},
        ticketCategory: {Support: 'Question', Devis: 'Quote', Contact: 'Contact'},
        reference: 'Request #{id}',
        you: 'You',
        profileTitle: 'Your profile',
        displayName: 'Display name',
        company: 'Company',
        phone: 'Phone',
        save: 'Save',
        saved: 'Saved.',
        signInMethod: 'Sign-in method',
        dangerTitle: 'Delete my account',
        dangerText: 'Your documents, appointments and details will be permanently erased. This cannot be undone.',
        dangerConfirm: 'Type DELETE to confirm',
        dangerWord: 'DELETE',
        dangerButton: 'Delete permanently',
    },

    pause: {
        cta: 'Take a 30-second pause',
        intro: 'Settle in. Drop your shoulders, rest your hands.',
        inhale: 'Breathe in',
        exhale: 'Breathe out',
        cycle: 'Breath {n} of {total}',
        outroTitle: 'Thank you.',
        outroText: 'You just gave yourself thirty seconds. That is exactly what we do, together, during a seminar.',
        discover: 'Discover the seminars',
        back: 'Back to the site',
        close: 'Close the pause',
    },

    legalPages: {
        mentions: {
            title: 'Legal notice',
            sections: [
                {
                    heading: 'Publisher',
                    text: '[Company name], [legal form] with a share capital of €[amount], registered under SIRET number [number], head office at [address]. Publication director: [First Last].'
                },
                {
                    heading: 'Hosting',
                    text: 'The website is hosted on a virtual private server (VPS) at [hosting provider], [provider address]. Authentication and document storage are provided by Google Firebase (Google Ireland Ltd).'
                },
                {
                    heading: 'Nature of services',
                    text: 'Synégo services relate to wellbeing and prevention. They are neither a diagnosis nor a medical treatment.'
                },
                {
                    heading: 'Intellectual property',
                    text: 'The texts, logo and graphic elements of the site belong to Synégo. Any reproduction without permission is prohibited.'
                },
            ],
        },
        privacy: {
            title: 'Privacy policy',
            sections: [
                {
                    heading: 'Data collected',
                    text: 'Name, email, phone and company when you fill in a form or create an account; documents you upload to your space; appointment details provided by Calendly. Appointments take place on Google Meet (Google Ireland Ltd): Synégo records nothing there.'
                },
                {
                    heading: 'Purposes',
                    text: 'Answering your requests, preparing quotes, organising appointments and following up on your coaching. No data is sold or used for advertising.'
                },
                {
                    heading: 'Retention',
                    text: 'Prospect data is kept for 3 years after the last contact. Client data is kept for the duration of the contract and then archived according to legal obligations.'
                },
                {
                    heading: 'Your rights',
                    text: 'You can access, correct or delete your account at any time from your client space (Profile > Delete my account), or by writing to [contact@synego.fr].'
                },
                {
                    heading: 'Security',
                    text: 'Encrypted connection (HTTPS), passwords handled by Firebase, documents only accessible to their owner, encrypted daily backups. Service administration is only reachable through a private network (VPN).'
                },
                {
                    heading: 'Cookies',
                    text: 'The site uses no advertising cookies or analytics tools. Only the technical elements needed to sign in are stored in your browser.'
                },
            ],
        },
    },
}
