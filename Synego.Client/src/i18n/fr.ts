import {brand} from './brand'

/**
 * Textes en français : langue de référence du site.
 * Chaque autre langue (en.ts…) doit avoir exactement la même structure : TypeScript le vérifie.
 * Projet pédagogique : l'entreprise et ses coordonnées (voir brand.ts) sont fictives.
 */

const founderRole = 'Kinésithérapeute de formation'

export const fr = {
    brandText: {
        tagline: 'Bien-être & séminaires',
        founderRole,
        area: '100 % en ligne, en visio Google Meet',
    },
    nav: [
        {to: '/seminaires', label: 'Séminaires'},
        {to: '/formations', label: 'Formations'},
        {to: '/accompagnement', label: 'Accompagnement'},
        {to: '/a-propos', label: 'L\'approche'},
        {to: '/contact', label: 'Contact'},
    ],
    home: {
        eyebrow: `${founderRole} · Bien-être en entreprise`,
        title: ['Ralentir,', 'pour mieux', 'avancer.'],
        accentWord: 'avancer.',
        intro: 'Séminaires et accompagnements bien-être en visio, pour les équipes et les personnes qui veulent retrouver de l\'aisance dans leur corps et du calme dans leur agenda. Où que vous soyez.',
        primaryCta: 'Organiser un séminaire',
        secondaryCta: 'Découvrir l\'approche',

        manifesto: 'On passe des journées entières assis, pressés, à repousser le moment de s\'occuper de soi. Synégo propose l\'inverse : un temps choisi, mesuré, pour bouger mieux, respirer plus large et revenir au travail avec de l\'énergie. Pas de recette miracle, pas de jargon : des gestes simples, appris ensemble, que chacun garde ensuite pour soi.',

        pillars: [
            {
                word: 'Posture',
                text: 'Comprendre comment le corps travaille au bureau, à la maison ou sur la route, et ajuster ce qui fatigue sans qu\'on s\'en rende compte.',
            },
            {
                word: 'Respiration',
                text: 'Quelques minutes de respiration guidée suffisent à faire redescendre la pression. On apprend des exercices qu\'on peut refaire seul, n\'importe où.',
            },
            {
                word: 'Mouvement',
                text: 'Des mises en mouvement douces et accessibles à tous, sans tenue de sport ni matériel, pour réveiller une équipe ou clôturer une journée.',
            },
            {
                word: 'Récupération',
                text: 'Sommeil, pauses, gestion de l\'effort : de petites habitudes qui changent la façon dont on termine la semaine.',
            },
        ],

        method: {
            eyebrow: 'La méthode',
            title: 'Un séminaire se prépare comme un rendez-vous important.',
            steps: [
                {
                    hour: '12',
                    short: 'Audit',
                    title: 'L\'audit',
                    text: 'Un premier échange pour comprendre votre équipe, son rythme, ses contraintes et ce que vous voulez qu\'elle ressente en repartant.',
                },
                {
                    hour: '3',
                    short: 'Programme',
                    title: 'Le programme sur mesure',
                    text: 'Vous recevez une proposition écrite : déroulé, durée, nombre de participants, format en ligne. Le devis suit, sans engagement.',
                },
                {
                    hour: '6',
                    short: 'Jour J',
                    title: 'Le jour J',
                    text: 'En visio sur Google Meet, chacun depuis son poste : ateliers en petits groupes, pratique et explications, ambiance détendue. Personne n\'est mis en difficulté.',
                },
                {
                    hour: '9',
                    short: 'Suivi',
                    title: 'Le suivi',
                    text: 'Un compte rendu et des fiches d\'exercices sont déposés dans votre espace client. Des séances de suivi prolongent l\'effet.',
                },
            ],
        },

        forWhom: [
            {
                title: 'Pour les entreprises',
                text: 'Comités de direction, équipes terrain, services en pleine réorganisation : un séminaire ou une série d\'ateliers pour souffler, se retrouver et repartir avec des gestes utiles au quotidien.',
                cta: 'Demander un audit séminaire',
                to: '/rendez-vous#prospects',
            },
            {
                title: 'Pour vous, personnellement',
                text: 'Un accompagnement individuel, à votre rythme, pour installer de nouvelles habitudes et garder le cap entre deux séances grâce à votre espace client.',
                cta: 'Réserver un appel découverte',
                to: '/rendez-vous#prospects',
            },
        ],

        quote: {
            title: 'Sur devis, toujours.',
            text: 'Chaque équipe est différente : sa taille, son rythme, son énergie du moment. Plutôt qu\'une grille de tarifs, vous recevez une proposition construite pour vous après un premier échange gratuit.',
            cta: 'Demander un devis',
        },

        finalCta: {
            title: ['Prenons le temps', 'd\'en parler.'],
            text: 'Un premier échange, sans engagement, pour voir ce qui vous ferait du bien.',
        },

        marquee: ['Posture', 'Respiration', 'Cohésion', 'Mouvement', 'Récupération', 'Sommeil', 'Énergie', 'Calme'],
    },
    seminaires: {
        eyebrow: 'Séminaires & ateliers',
        title: ['Des journées', 'qui laissent', 'une trace.'],
        intro: 'En visio sur Google Meet, en demi-journée, en journée ou en cycle de plusieurs ateliers : chacun participe depuis son bureau ou de chez lui. Le format s\'adapte à l\'équipe, jamais l\'inverse.',
        formats: [
            {
                title: 'Posture & travail',
                duration: 'Demi-journée',
                text: 'Comprendre les tensions liées au poste de travail, apprendre à les repérer et à les relâcher. Chacun participe depuis son propre poste : on ajuste en direct, caméra allumée.',
                details: ['Ajustement du poste de chacun, en direct', 'Routine de 5 minutes à refaire chaque jour', 'Fiche récapitulative dans l\'espace client'],
            },
            {
                title: 'Stress & récupération',
                duration: 'Demi-journée ou journée',
                text: 'Respiration, relâchement musculaire, gestion des temps de pause : des outils simples pour mieux traverser les périodes chargées.',
                details: ['Initiation à la cohérence cardiaque', 'Ateliers en petits groupes (sous-groupes Meet)', 'Exercices audio disponibles dans l\'espace client'],
            },
            {
                title: 'Cohésion à distance',
                duration: 'Demi-journée',
                text: 'Pour les équipes dispersées ou en télétravail : bouger, respirer et rire ensemble à travers l\'écran, pour se retrouver autrement.',
                details: ['Pensé pour les équipes en télétravail', 'Séquences courtes et rythmées, caméras allumées', 'Déroulé co-construit avec vous'],
            },
            {
                title: 'Cycle ressourcement',
                duration: '4 à 8 semaines',
                text: 'Un rendez-vous en visio chaque semaine pendant un ou deux mois, pour installer durablement de nouvelles habitudes dans l\'équipe.',
                details: ['Une séance collective par semaine', 'Exercices audio entre deux séances', 'Suivi individuel proposé ensuite'],
            },
        ],
        day: {
            eyebrow: 'Une journée type',
            title: 'Le séminaire, heure par heure',
            slots: [
                {
                    time: '09:00',
                    title: 'Connexion & mise en mouvement',
                    text: 'Chacun rejoint le Google Meet depuis son poste, caméra allumée, puis dix minutes pour réveiller le corps.'
                },
                {
                    time: '10:00',
                    title: 'Atelier posture',
                    text: 'Ce que nos journées font à notre dos, et comment l\'éviter. On ajuste le poste de chacun, en direct.'
                },
                {
                    time: '12:30',
                    title: 'Pause déjeuner',
                    text: 'Caméras coupées, loin de l\'écran : un vrai temps de pause, pensé comme un moment de récupération.'
                },
                {
                    time: '14:00',
                    title: 'Respiration guidée',
                    text: 'Initiation à la cohérence cardiaque et au relâchement. Chacun repart avec sa routine.'
                },
                {
                    time: '15:30',
                    title: 'Atelier collectif',
                    text: 'En sous-groupes Meet, un exercice en mouvement qui fait travailler l\'équipe ensemble, sans compétition.'
                },
                {
                    time: '16:30',
                    title: 'Clôture & engagements',
                    text: 'Chacun choisit une habitude à garder. On en reparle lors du suivi.'
                },
            ],
        },
        faq: [
            {
                q: 'Faut-il une tenue de sport ?',
                a: 'Non. Tous les exercices se pratiquent en tenue de travail, sans matériel, avec un peu d\'espace autour de sa chaise.',
            },
            {
                q: 'Combien de participants ?',
                a: 'De 6 à 40 personnes selon le format. Au-delà, la journée est organisée en plusieurs groupes pour garder un vrai temps d\'échange avec chacun.',
            },
            {
                q: 'Où se déroulent les séminaires ?',
                a: 'En ligne, sur Google Meet : chacun participe depuis son bureau ou de chez lui, partout en France et ailleurs. Il n\'y a pas de cabinet à rejoindre. Sur demande, un atelier peut ponctuellement se tenir en présentiel (sur devis).',
            },
            {
                q: 'De quoi a-t-on besoin ?',
                a: 'D\'un ordinateur avec caméra et micro, d\'une connexion internet et d\'un peu d\'espace pour bouger. Le lien Google Meet est envoyé à la réservation et rappelé la veille.',
            },
            {
                q: 'Quel est le tarif ?',
                a: 'Chaque séminaire fait l\'objet d\'un devis après l\'audit gratuit : il dépend du format, de la durée et du nombre de participants.',
            },
            {
                q: 'Est-ce un soin médical ?',
                a: 'Non. Les séminaires relèvent du bien-être et de la prévention. Ils ne remplacent pas une consultation auprès d\'un professionnel de santé.',
            },
        ],
    },
    accompagnement: {
        eyebrow: 'Accompagnement individuel',
        title: ['Un suivi', 'à votre', 'rythme.'],
        intro: 'Pour celles et ceux qui veulent aller plus loin qu\'un atelier : un programme personnel, des séances régulières et un espace en ligne pour garder le fil entre deux rendez-vous.',
        steps: [
            {
                title: 'Appel découverte',
                text: '20 minutes en visio Google Meet pour faire connaissance et voir si l\'accompagnement vous correspond. Gratuit et sans engagement.'
            },
            {
                title: 'Proposition sur devis',
                text: 'Vous recevez une proposition écrite : nombre de séances, rythme, objectifs. Vous décidez à tête reposée.'
            },
            {
                title: 'Votre espace client',
                text: 'Une fois inscrit, vous retrouvez vos programmes, vos fiches d\'exercices et vos rendez-vous dans un espace sécurisé.'
            },
            {
                title: 'Séances de suivi',
                text: 'Des séances en visio Google Meet, que vous réservez vous-même aux créneaux qui vous arrangent, sans attendre de confirmation.'
            },
        ],
        space: {
            title: 'Votre espace, rien qu\'à vous',
            items: [
                'Vos documents : programmes, comptes rendus, devis et factures',
                'Vos rendez-vous à venir et leur lien Google Meet, à déplacer ou annuler en deux clics',
                'Vos questions, avec des réponses écrites et un historique',
                'Connexion par e-mail, par SMS ou avec votre compte Google',
            ],
        },
    },
    apropos: {
        eyebrow: 'L\'approche',
        title: ['Le corps', 'sait déjà.', 'On l\'écoute.'],
        intro: `${brand.founder}, ${founderRole.toLowerCase()}, a fondé Synégo avec une conviction : le bien-être au travail ne se décrète pas, il se pratique. Après dix ans auprès de salariés de tous horizons, ${brand.founderFirstName} voyait revenir les mêmes signaux : nuques raides, souffle court, fatigue qui s'installe dès le mardi. Synégo est née de l'envie d'agir avant, avec des gestes simples que chacun peut refaire seul, même derrière un écran.`,
        values: [
            {
                title: 'Simplicité',
                text: 'Des exercices compris en une fois et refaits sans aide. Si un geste demande un manuel, il ne sera jamais refait.'
            },
            {
                title: 'Mesure',
                text: 'Pas de promesse spectaculaire. Des progrès réels, à l\'échelle d\'une semaine, d\'un mois, d\'une saison.'
            },
            {
                title: 'Confiance',
                text: 'Ce qui se dit en séance reste en séance. Vos documents sont stockés de façon sécurisée et ne sont partagés avec personne.'
            },
            {
                title: 'Exigence',
                text: 'Une formation de kinésithérapeute, mise au service de la prévention et du bien-être, avec le même sérieux.'
            },
        ],
        signature: 'Le nom Synégo mêle synergie et ego, au sens de soi : ce qu\'on fait ensemble pour que chacun aille mieux.',
    },
    rendezVous: {
        eyebrow: 'Prendre rendez-vous',
        title: ['Choisissez', 'votre', 'moment.'],
        intro: 'Tous les rendez-vous ont lieu en visio sur Google Meet. La réservation est confirmée immédiatement : vous recevez le lien de connexion, puis un rappel 48 h et 24 h avant.',
        prospects: {
            title: 'Vous découvrez Synégo',
            text: 'Un premier échange pour faire connaissance et parler de votre projet. Gratuit, sans engagement.',
        },
        clients: {
            title: 'Vous êtes déjà client',
            text: 'Réservez votre prochaine séance de suivi directement dans votre agenda.',
            loggedOut: 'Les séances de suivi sont réservées aux clients accompagnés. Connectez-vous à votre espace pour y accéder.',
            notSigned: 'Votre compte est bien créé. Les séances de suivi seront ouvertes dès que votre accompagnement aura démarré.',
        },
    },
    contact: {
        eyebrow: 'Contact & devis',
        title: ['Écrivez-nous,', 'on vous', 'répond.'],
        intro: 'Décrivez votre équipe ou votre besoin en quelques lignes. Vous recevez une réponse personnalisée sous 48 heures ouvrées.',
        placeholder: 'Par exemple : une équipe de 15 personnes, plutôt sédentaire, un séminaire d\'une journée en juin…',
    },
    legal: {
        disclaimer: 'Les prestations Synégo relèvent du bien-être et de la prévention. Elles ne constituent ni un diagnostic, ni un traitement médical, et ne remplacent pas une consultation auprès d\'un professionnel de santé.',
    },
    booking: {
        minutes: 'min',
        seeSlots: 'Voir les créneaux',
        clientsOnly: 'Réservé aux clients',
        unavailable: 'L\'agenda est momentanément indisponible. Écrivez-nous depuis la page contact.',
        booked: 'C\'est réservé. Un e-mail de confirmation vient de vous être envoyé.',
        iframeTitle: 'Choisir un créneau',
        login: 'Se connecter',
        addToCalendar: 'Ajouter à mon agenda',
        calendarHint: 'Apple et Samsung : le fichier s\'ouvre directement dans votre agenda.',
        calendarOther: 'Autre agenda (.ics)',
        types: {
            'audit-seminaire': {
                title: 'Audit séminaire',
                summary: '45 minutes en visio pour comprendre votre équipe, vos contraintes et l\'effet recherché. Vous repartez avec des pistes concrètes, même si nous ne travaillons pas ensemble.',
            },
            'appel-decouverte': {
                title: 'Appel découverte',
                summary: '20 minutes en visio Google Meet pour faire connaissance, parler de votre projet et voir si l\'accompagnement vous correspond.',
            },
            'seance-suivi': {
                title: 'Séance de suivi',
                summary: 'Le rendez-vous régulier des clients accompagnés, en visio : on fait le point, on ajuste le programme, on avance.',
            },
        } as Record<string, { title: string, summary: string }>,
    },

    contactForm: {
        kindQuote: 'Demande de devis',
        kindContact: 'Simple question',
        name: 'Nom et prénom',
        email: 'E-mail',
        phone: 'Téléphone (facultatif)',
        company: 'Entreprise (facultatif)',
        subject: 'Objet',
        message: 'Votre message',
        consent: 'Vos informations servent uniquement à répondre à votre demande. Elles ne sont ni revendues ni utilisées pour de la prospection.',
        submit: 'Envoyer la demande',
        sending: 'Envoi…',
        sentTitle: 'Merci, c\'est bien reçu.',
        sentText: 'Votre demande porte la référence n°{ref}. Vous recevrez une réponse personnalisée sous 48 heures ouvrées.',
        another: 'Envoyer une autre demande',
        direct: 'Ou directement',
    },

    ui: {
        skip: 'Aller au contenu',
        home: 'Accueil',
        mainNav: 'Navigation principale',
        mobileNav: 'Menu mobile',
        openMenu: 'Ouvrir le menu',
        closeMenu: 'Fermer le menu',
        clientSpace: 'Espace client',
        mySpace: 'Mon espace',
        book: 'Prendre rendez-vous',
        bookShort: 'Rendez-vous',
        language: 'Langue',
        themeToDark: 'Passer en mode sombre',
        themeToLight: 'Passer en mode clair',
        scroll: 'Défiler',
        loading: 'Chargement',
        breathIn: 'Inspirez',
        breathOut: 'Expirez',
        breathFree: 'Respirez à votre rythme',
        breathCaption: 'Cohérence cardiaque · 5 s / 5 s',
        finalCtaBook: 'Réserver un premier échange',
        finalCtaQuote: 'Demander un devis',
        whyEyebrow: 'Pourquoi Synégo',
        pillarsEyebrow: 'Quatre gestes',
        pillarsTitle: 'Ce qu\'on travaille ensemble',
        formatsEyebrow: 'Formats',
        formatsTitle: 'Quatre façons de faire équipe autrement',
        formatCta: 'Recevoir une proposition pour ce format',
        faqEyebrow: 'Questions fréquentes',
        faqTitle: 'Avant de se lancer',
        seminarAudit: 'Réserver un audit séminaire',
        discoveryCall: 'Réserver un appel découverte',
        journeyEyebrow: 'Le parcours',
        journeyTitle: 'De la première prise de contact au suivi',
        spaceEyebrow: 'Espace client',
        spaceCta: 'Accéder à mon espace',
        valuesEyebrow: 'Ce qui guide le travail',
        valuesTitle: 'Quatre principes, pas un de plus',
        footerExplore: 'Explorer',
        footerReach: 'Joindre',
        footerLogin: 'Se connecter',
        footerRegister: 'Créer un compte',
        footerQuoteOnly: 'Tarifs sur devis uniquement.',
        legalNotice: 'Mentions légales',
        privacy: 'Confidentialité',
        cgv: 'CGV',
        notFoundTitle: 'Cette page a pris un autre rendez-vous.',
        notFoundCta: 'Revenir à l\'accueil',
        dialogBack: 'Retour',
        dialogConfirm: 'Confirmer',
    },

    auth: {
        loginTitle: 'Bon retour.',
        loginText: 'Connectez-vous pour retrouver vos documents, vos rendez-vous et vos échanges.',
        registerTitle: 'Créer votre espace.',
        registerText: 'Un espace personnel et sécurisé pour suivre votre accompagnement.',
        google: 'Continuer avec Google',
        or: 'ou',
        tabEmail: 'E-mail',
        tabPhone: 'Téléphone',
        email: 'Adresse e-mail',
        password: 'Mot de passe',
        passwordHint: '10 caractères minimum',
        confirm: 'Confirmer le mot de passe',
        name: 'Nom et prénom',
        forgot: 'Mot de passe oublié ?',
        forgotText: 'Indiquez votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.',
        forgotSend: 'Envoyer le lien',
        forgotSent: 'Si un compte existe pour cette adresse, un lien vient d\'être envoyé.',
        back: 'Retour',
        login: 'Se connecter',
        register: 'Créer mon compte',
        phone: 'Numéro de mobile',
        phoneHint: 'Exemple : 06 12 34 56 78',
        sendCode: 'Recevoir un code par SMS',
        code: 'Code reçu par SMS',
        codeSentTo: 'Code envoyé au {phone}.',
        changeNumber: 'Changer de numéro',
        confirmCode: 'Valider',
        noAccount: 'Pas encore de compte ?',
        hasAccount: 'Déjà un compte ?',
        createAccount: 'Créer un compte',
        mismatch: 'Les deux mots de passe ne correspondent pas.',
        tooShort: 'Le mot de passe doit faire au moins 10 caractères.',
        pleaseWait: 'Un instant…',
        privacyNote: 'Connexion sécurisée par Firebase. Aucun mot de passe n\'est stocké sur nos serveurs.',
        resendCode: 'Renvoyer le code',
        resendIn: 'Renvoyer le code dans {s} s',
        errors: {
            'auth/invalid-email': 'Cette adresse e-mail ne semble pas valide.',
            'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
            'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse. Connectez-vous plutôt.',
            'auth/weak-password': 'Mot de passe trop simple : 10 caractères minimum, avec chiffres ou symboles.',
            'auth/too-many-requests': 'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
            'auth/invalid-phone-number': 'Numéro invalide. Exemple : 06 12 34 56 78 ou +33 6 12 34 56 78.',
            'auth/missing-phone-number': 'Indiquez votre numéro de mobile.',
            'auth/invalid-verification-code': 'Le code reçu par SMS ne correspond pas.',
            'auth/missing-verification-code': 'Saisissez le code reçu par SMS.',
            'auth/code-expired': 'Le code a expiré. Demandez-en un nouveau.',
            'auth/operation-not-allowed': 'La connexion par SMS n\'est pas activée : console Firebase > Authentication > Méthodes de connexion > Téléphone.',
            'auth/billing-not-enabled': 'Firebase refuse l\'envoi de SMS réels sur ce projet (offre gratuite). Passez le projet en offre Blaze, ou utilisez un numéro de test.',
            'auth/quota-exceeded': 'Le quota de SMS du projet est atteint pour aujourd\'hui. Réessayez demain ou utilisez un numéro de test.',
            'auth/captcha-check-failed': 'La vérification anti-robot a échoué : ce domaine doit figurer dans Firebase > Authentication > Paramètres > Domaines autorisés.',
            'auth/invalid-app-credential': 'La vérification anti-robot a été refusée (fréquent en local). Utilisez un numéro de test, ou testez sur le domaine de production.',
            'auth/unauthorized-domain': 'Ce domaine n\'est pas autorisé dans Firebase > Authentication > Paramètres > Domaines autorisés.',
            'auth/network-request-failed': 'Connexion internet indisponible. Vérifiez votre réseau.',
            'auth/popup-closed-by-user': 'Fenêtre Google fermée avant la fin de la connexion.',
            'auth/popup-blocked': 'Le navigateur a bloqué la fenêtre Google. Autorisez les fenêtres pour ce site.',
            'auth/requires-recent-login': 'Par sécurité, reconnectez-vous puis recommencez.',
            'auth/invalid-api-key': 'La connexion est momentanément indisponible (configuration du site). Réessayez plus tard ou écrivez-nous.',
            generic: 'La connexion a échoué ({code}). Réessayez.',
        } as Record<string, string>,
    },

    espace: {
        nav: {
            home: 'Accueil',
            appointments: 'Rendez-vous',
            documents: 'Documents',
            requests: 'Demandes',
            formations: 'Formations',
            payments: 'Paiements',
            profile: 'Profil',
            admin: 'Back-office'
        },
        logout: 'Se déconnecter',
        backToSite: 'Retour au site',
        hello: 'Bonjour {name}.',
        roleProspect: 'Compte créé : votre accompagnement n\'a pas encore démarré.',
        roleClient: 'Client accompagné depuis le {date}.',
        roleAdmin: 'Espace coach',
        apiDown: 'Votre espace est momentanément indisponible. Réessayez dans quelques minutes.',
        verifyTitle: 'Confirmez votre adresse e-mail',
        verifyText: 'Un lien vous a été envoyé à {email}. Cliquez dessus, puis revenez ici.',
        verifyDone: 'J\'ai confirmé',
        verifyResend: 'Renvoyer l\'e-mail',
        verifySent: 'E-mail renvoyé.',
        verifyPending: 'Pas encore confirmé : vérifiez vos e-mails (et les indésirables).',
        nextAppointment: 'Prochain rendez-vous',
        noUpcoming: 'Aucun rendez-vous à venir.',
        latestDocuments: 'Derniers documents',
        noDocuments: 'Aucun document pour l\'instant.',
        openRequests: 'Demandes en cours',
        noRequests: 'Aucune demande en cours.',
        seeAll: 'Tout voir',
        bookNow: 'Réserver un créneau',
        appointmentsTitle: 'Vos rendez-vous',
        bookTitle: 'Prendre un rendez-vous',
        bookClose: 'Fermer',
        rescheduleTitle: 'Choisissez votre nouveau créneau : l\'ancien rendez-vous sera annulé automatiquement.',
        cancelConfirm: 'Annuler le rendez-vous du {date} ?',
        canceled: 'Rendez-vous annulé. Calendly vous envoie une confirmation par e-mail.',
        rescheduled: 'C\'est déplacé : votre nouveau rendez-vous est confirmé et l\'ancien annulé.',
        actionFailed: 'Action impossible pour le moment : {reason}',
        upcoming: 'À venir',
        past: 'Passés',
        reschedule: 'Déplacer',
        cancel: 'Annuler',
        join: 'Rejoindre la visio',
        cancelPolicy: 'Annulation ou déplacement possible jusqu\'à 24 h avant.',
        cancelClosed: 'Moins de 24 h : le rendez-vous ne peut plus être annulé.',
        status: {Scheduled: 'Prévu', Canceled: 'Annulé', Done: 'Effectué', NoShow: 'Absent'} as Record<string, string>,
        documentsTitle: 'Vos documents',
        documentsText: 'Programmes, comptes rendus, devis et factures partagés avec vous, et les fichiers que vous déposez.',
        documentsWarning: 'Merci de ne pas déposer de documents médicaux : cet espace n\'est pas prévu pour des données de santé.',
        drop: 'Déposer un fichier',
        dropHint: 'PDF, image ou document Office, 10 Mo maximum.',
        uploading: 'Envoi…',
        sharedWithYou: 'Partagé avec vous',
        yours: 'Déposé par vous',
        download: 'Télécharger',
        delete: 'Supprimer',
        confirmDelete: 'Supprimer « {name} » ?',
        deleted: 'Document supprimé.',
        requestsTitle: 'Vos demandes',
        requestsText: 'Une question sur votre programme, un document, un rendez-vous ? Écrivez ici : la réponse arrive dans ce fil.',
        newRequest: 'Nouvelle demande',
        subject: 'Objet',
        message: 'Message',
        send: 'Envoyer',
        reply: 'Répondre',
        replyPlaceholder: 'Votre réponse…',
        ticketStatus: {Open: 'Envoyée', InProgress: 'En cours', Closed: 'Close'} as Record<string, string>,
        ticketCategory: {Support: 'Question', Devis: 'Devis', Contact: 'Contact'} as Record<string, string>,
        reference: 'Demande n°{id}',
        you: 'Vous',
        profileTitle: 'Votre profil',
        displayName: 'Nom affiché',
        company: 'Entreprise',
        phone: 'Téléphone',
        save: 'Enregistrer',
        saved: 'Enregistré.',
        signInMethod: 'Méthode de connexion',
        dangerTitle: 'Supprimer mon compte',
        dangerText: 'Vos documents, rendez-vous et informations seront définitivement effacés. Cette action est irréversible.',
        dangerConfirm: 'Tapez SUPPRIMER pour confirmer',
        dangerWord: 'SUPPRIMER',
        dangerButton: 'Supprimer définitivement',
    },

    formations: {
        eyebrow: 'Formations en ligne',
        title: ['Apprendre', 'à son', 'rythme.'],
        intro: 'Des programmes en vidéo pour installer de nouveaux réflexes : posture, respiration, récupération. Vous avancez quand vous voulez ; la communauté et la coach répondent à vos questions.',
        empty: 'Les premières formations arrivent bientôt. Écrivez-nous pour être prévenu.',
        lessons: '{n} leçons',
        modules: '{n} modules',
        seeProgram: 'Voir le programme',
        installments: 'ou en 3 fois avec Klarna',
        buy: 'Acheter la formation',
        access: 'Accéder à la formation',
        loginToBuy: 'Se connecter pour acheter',
        program: 'Le programme',
        preview: 'Aperçu gratuit',
        watchPreview: 'Voir l\'aperçu',
        included: 'Inclus',
        includedItems: ['Accès illimité aux vidéos et aux supports', 'La communauté des membres et les réponses de la coach', 'Votre progression enregistrée, sur tous vos appareils'],
        termsBefore: 'J\'accepte les ',
        termsLink: 'conditions générales de vente',
        termsAfter: ' et je demande l\'accès immédiat, ce qui met fin à mon droit de rétractation.',
        termsRequired: 'Cochez la case pour accepter les conditions générales de vente.',
        paymentsOff: 'Le paiement en ligne n\'est pas encore activé. Écrivez-nous pour réserver votre place.',
        redirecting: 'Redirection vers le paiement sécurisé…',
        secure: 'Paiement sécurisé par Stripe : carte bancaire, Apple Pay, ou en 3 fois avec Klarna.',
        notFound: 'Cette formation n\'existe pas ou n\'est plus proposée.',
        back: 'Toutes les formations',
        minutes: 'min',
        draft: 'Brouillon : visible par les coachs uniquement.',
    },

    payment: {
        eyebrow: 'Paiement sécurisé',
        hello: 'Bonjour {name},',
        helloAnon: 'Bonjour,',
        intro: 'Voici le règlement préparé pour vous par Synégo.',
        pay: 'Payer {amount}',
        methods: 'Carte bancaire, Apple Pay, ou en 3 fois avec Klarna. Synégo ne voit jamais vos coordonnées bancaires.',
        paid: 'Ce paiement est réglé. Merci !',
        receipt: 'Voir le reçu',
        expired: 'Ce lien n\'est plus valable. Écrivez-nous pour en recevoir un nouveau.',
        canceled: 'Ce lien a été annulé.',
        paymentsOff: 'Le paiement en ligne n\'est pas encore activé : écrivez-nous pour convenir du règlement.',
        notFound: 'Lien de paiement introuvable. Vérifiez l\'adresse reçue par e-mail.',
        kind: {Course: 'Formation', Seminar: 'Séminaire', Other: 'Accompagnement'} as Record<string, string>,
        returnTitle: 'Merci, c\'est réglé.',
        returnPending: 'Validation du paiement…',
        returnPendingText: 'Certains moyens de paiement demandent quelques instants. Cette page se met à jour toute seule.',
        returnCourse: 'Votre formation vous attend dans votre espace.',
        returnCourseClaim: 'Connectez-vous avec l\'adresse e-mail utilisée pour le paiement (confirmée) : la formation apparaîtra dans votre espace.',
        returnOther: 'Un reçu vous est envoyé par e-mail. À très bientôt !',
        openCourse: 'Commencer la formation',
        goSpace: 'Aller à mon espace',
        home: 'Retour à l\'accueil',
        returnFailed: 'Le paiement n\'a pas abouti. Aucun montant n\'a été prélevé.',
        returnUnknown: 'Nous ne retrouvons pas ce paiement. Si votre compte a été débité, écrivez-nous.',
    },

    learning: {
        myCoursesTitle: 'Vos formations',
        myCoursesText: 'Reprenez là où vous vous étiez arrêté. Chaque formation a sa communauté : posez vos questions, partagez vos progrès.',
        empty: 'Aucune formation pour l\'instant.',
        browse: 'Découvrir les formations',
        progress: '{done} / {total} leçons',
        resume: 'Continuer',
        start: 'Commencer',
        draft: 'Brouillon',
        back: 'Vos formations',
        tabLessons: 'Leçons',
        tabCommunity: 'Communauté',
        markDone: 'Marquer comme terminée',
        done: 'Terminée',
        next: 'Leçon suivante',
        previous: 'Leçon précédente',
        comments: 'Questions et commentaires',
        commentPlaceholder: 'Une question, un ressenti, une astuce…',
        send: 'Publier',
        noComments: 'Soyez la première personne à commenter cette leçon.',
        noLessons: 'Le contenu de cette formation arrive bientôt.',
        communityText: 'Échangez avec les autres membres et la coach. Pas de données de santé ici : la communauté est un espace de partage, pas de consultation.',
        newPost: 'Partager quelque chose avec le groupe…',
        pinned: 'Épinglé',
        like: 'J\'aime',
        comment: 'Commenter',
        delete: 'Supprimer',
        pin: 'Épingler',
        unpin: 'Désépingler',
        coach: 'Coach',
        confirmDelete: 'Supprimer ce message ?',
        noPosts: 'La communauté démarre : présentez-vous !',
        paymentsTitle: 'Vos paiements',
        paymentsText: 'Formations, séminaires et accompagnements réglés en ligne, et les paiements qui vous attendent.',
        noPayments: 'Aucun paiement pour l\'instant.',
        payNow: 'Payer',
        status: {
            Pending: 'À régler',
            Paid: 'Réglé',
            Failed: 'Échoué',
            Canceled: 'Annulé',
            Refunded: 'Remboursé'
        } as Record<string, string>,
        receipt: 'Reçu',
        due: 'À régler avant le {date}',
        pendingNotice: 'Un paiement vous attend : {label}.',
    },

    pause: {
        cta: 'S\'accorder une pause de 30 secondes',
        intro: 'Installez-vous. Relâchez les épaules, posez les mains.',
        inhale: 'Inspirez',
        exhale: 'Expirez',
        cycle: 'Respiration {n} sur {total}',
        outroTitle: 'Merci.',
        outroText: 'Vous venez de vous offrir trente secondes. C\'est exactement ce que nous faisons, ensemble, pendant un séminaire.',
        discover: 'Découvrir les séminaires',
        back: 'Revenir au site',
        close: 'Fermer la pause',
    },

    legalPages: {
        cgv: {
            title: 'Conditions générales de vente',
            sections: [
                {
                    heading: 'Projet pédagogique',
                    text: 'Ce site est réalisé dans le cadre d\'un atelier ISITECH : l\'entreprise et ses offres sont fictives. Les paiements fonctionnent en mode test, aucun montant réel n\'est prélevé.'
                },
                {
                    heading: 'Objet',
                    text: `Les présentes conditions régissent la vente en ligne, par ${brand.company.legalName}, de formations vidéo et le règlement en ligne de prestations sur devis (séminaires, accompagnements).`
                },
                {
                    heading: 'Prix et paiement',
                    text: 'Les prix des formations sont indiqués toutes taxes comprises. Les séminaires et accompagnements font l\'objet d\'un devis, puis d\'un lien de paiement. Le paiement est assuré par Stripe : carte bancaire, Apple Pay, ou paiement en 3 fois avec Klarna, sous réserve d\'acceptation par Klarna et selon ses conditions. Synégo n\'a jamais accès à vos coordonnées bancaires.'
                },
                {
                    heading: 'Accès aux formations',
                    text: 'L\'accès est ouvert dès la confirmation du paiement, depuis votre espace client, pour une durée illimitée tant que le service existe. Il est personnel : les identifiants ne doivent pas être partagés.'
                },
                {
                    heading: 'Droit de rétractation',
                    text: 'Pour une formation en ligne, vous demandez l\'accès immédiat au contenu numérique et renoncez expressément à votre droit de rétractation (article L221-28 du Code de la consommation). Pour un séminaire ou un accompagnement réglé par un particulier, vous disposez de 14 jours après le paiement pour vous rétracter, sauf si la prestation a déjà commencé à votre demande. Les professionnels ne bénéficient pas du droit de rétractation.'
                },
                {
                    heading: 'Communauté',
                    text: 'Chaque formation donne accès à un espace d\'échange. Restez bienveillant, ne partagez aucune donnée de santé ni information personnelle d\'un tiers. La coach peut retirer tout message contraire à ces règles.'
                },
                {
                    heading: 'Nature des prestations',
                    text: 'Les contenus et prestations relèvent du bien-être et de la prévention. Ils ne constituent ni un diagnostic, ni un traitement médical, et ne remplacent pas l\'avis d\'un professionnel de santé.'
                },
                {
                    heading: 'Réclamations',
                    text: `Pour toute question ou réclamation : ${brand.email}. En cas de litige, une solution amiable sera recherchée avant toute action.`
                },
            ],
        },
        mentions: {
            title: 'Mentions légales',
            sections: [
                {
                    heading: 'Projet pédagogique',
                    text: 'Ce site a été réalisé dans le cadre d\'un atelier de l\'école ISITECH. L\'entreprise Synégo, les personnes et les coordonnées mentionnées sont fictives : aucune prestation n\'est réellement proposée.'
                },
                {
                    heading: 'Éditeur',
                    text: `${brand.company.legalName}, société par actions simplifiée au capital de ${brand.company.capital} €, immatriculée au RCS de ${brand.company.rcsCity} sous le numéro ${brand.company.siren} (SIRET ${brand.company.siret}), dont le siège est situé ${brand.company.address}. Directrice de la publication : ${brand.founder}. Contact : ${brand.email}, ${brand.phone}.`
                },
                {
                    heading: 'Hébergement',
                    text: 'Le site est hébergé sur un serveur privé virtuel (VPS) Linode, service d\'Akamai Technologies, Inc., 145 Broadway, Cambridge, MA 02142, États-Unis. Les documents déposés sont stockés sur ce même serveur. L\'authentification est assurée par Google Firebase (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande).'
                },
                {
                    heading: 'Nature des prestations',
                    text: 'Les prestations Synégo relèvent du bien-être et de la prévention. Elles ne constituent ni un diagnostic, ni un traitement médical.'
                },
                {
                    heading: 'Propriété intellectuelle',
                    text: 'Les textes, le logo et les éléments graphiques du site sont la propriété de Synégo. Toute reproduction sans autorisation est interdite.'
                },
            ],
        },
        privacy: {
            title: 'Politique de confidentialité',
            sections: [
                {
                    heading: 'Responsable du traitement',
                    text: `${brand.company.legalName}, ${brand.company.address}, représentée par ${brand.founder}. Pour toute question sur vos données : ${brand.email}.`
                },
                {
                    heading: 'Données collectées',
                    text: 'Nom, e-mail, téléphone et entreprise lorsque vous remplissez un formulaire ou créez un compte ; documents que vous déposez dans votre espace ; informations de rendez-vous transmises par Calendly. Les rendez-vous ont lieu sur Google Meet (Google Ireland Ltd) : rien n\'y est enregistré par Synégo.'
                },
                {
                    heading: 'Finalités',
                    text: 'Répondre à vos demandes, établir des devis, organiser les rendez-vous et assurer le suivi de votre accompagnement. Aucune donnée n\'est revendue ni utilisée à des fins publicitaires.'
                },
                {
                    heading: 'Durée de conservation',
                    text: 'Les données des prospects sont conservées 3 ans après le dernier contact. Les données des clients sont conservées pendant la relation contractuelle puis archivées selon les obligations légales.'
                },
                {
                    heading: 'Vos droits',
                    text: `Vous pouvez accéder à vos données, les corriger ou supprimer votre compte à tout moment depuis votre espace client (Profil > Supprimer mon compte), ou en écrivant à ${brand.email}. Vous pouvez aussi introduire une réclamation auprès de la CNIL (cnil.fr).`
                },
                {
                    heading: 'Sécurité',
                    text: 'Connexion chiffrée (HTTPS), mots de passe gérés par Firebase, documents accessibles uniquement à leur propriétaire, sauvegardes chiffrées quotidiennes. Le back-office est réservé aux comptes Coach, et les outils d\'administration technique du serveur ne sont pas exposés sur Internet.'
                },
                {
                    heading: 'Cookies',
                    text: 'Le site n\'utilise aucun cookie publicitaire ni outil de mesure d\'audience. Seuls les éléments techniques nécessaires à la connexion sont stockés dans votre navigateur.'
                },
            ],
        },
    },
}

export type Dictionary = typeof fr
