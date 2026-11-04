export type UserRole = 'Prospect' | 'Client' | 'Coach'

export type Profile = {
    id: string
    email: string | null
    displayName: string | null
    phoneNumber: string | null
    company: string | null
    role: UserRole
    signedAt: string | null
}

export type BookingType = {
    key: string
    title: string
    summary: string
    durationMinutes: number
    audience: 'Prospect' | 'Client'
    calendlyUrl: string | null
    locked: boolean
}

export type AppointmentStatus = 'Scheduled' | 'Canceled' | 'Done' | 'NoShow'

export type Appointment = {
    id: string
    typeKey: string
    title: string
    startsAt: string
    endsAt: string
    status: AppointmentStatus
    cancelUrl: string | null
    rescheduleUrl: string | null
    meetingUrl: string | null
    location: string | null
}

export type DocumentItem = {
    id: string
    fileName: string
    contentType: string
    sizeBytes: number
    category: string
    sharedByStaff: boolean
    createdAt: string
}

export type TicketCategory = 'Support' | 'Devis' | 'Contact'
export type TicketStatus = 'Open' | 'InProgress' | 'Closed'

export type TicketSummary = {
    id: number
    subject: string
    category: TicketCategory
    status: TicketStatus
    createdAt: string
    updatedAt: string
    messageCount: number
}

export type TicketMessage = {
    id: string
    authorName: string
    fromStaff: boolean
    body: string
    createdAt: string
}

export type TicketDetail = {
    id: number
    subject: string
    category: TicketCategory
    status: TicketStatus
    contactName: string
    contactEmail: string
    contactPhone: string | null
    company: string | null
    createdAt: string
    closedAt: string | null
    messages: TicketMessage[]
}

export type AdminClient = {
    id: string
    email: string | null
    displayName: string | null
    phoneNumber: string | null
    company: string | null
    role: UserRole
    createdAt: string
    signedAt: string | null
    documentCount: number
    noteCount: number
    upcomingAppointments: number
}

export type AdminAppointment = {
    id: string
    typeKey: string
    title: string
    startsAt: string
    endsAt: string
    status: AppointmentStatus
    name: string | null
    email: string | null
    userId: string | null
    userRole: UserRole | null
    reviewReason: string | null
    adminNotes: string | null
    cancelUrl: string | null
    rescheduleUrl: string | null
    meetingUrl: string | null
    reminder48SentAt: string | null
    reminder24SentAt: string | null
}

export type ClientNote = {
    id: string
    body: string
    pinned: boolean
    authorName: string
    createdAt: string
    updatedAt: string
}

export type AdminTicketRow = {
    id: number
    subject: string
    category: TicketCategory
    status: TicketStatus
    contactName: string
    contactEmail: string
    company: string | null
    createdAt: string
    updatedAt: string
    messageCount: number
}

export const statusLabels: Record<TicketStatus, string> = {
    Open: 'Nouvelle',
    InProgress: 'En cours',
    Closed: 'Close',
}

export const categoryLabels: Record<TicketCategory, string> = {
    Support: 'Question',
    Devis: 'Devis',
    Contact: 'Contact',
}

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
    Scheduled: 'Prévu',
    Canceled: 'Annulé',
    Done: 'Effectué',
    NoShow: 'Absent',
}

export type CalendlyEventType = {
    uri: string
    name: string
    duration: number
    secret: boolean
    schedulingUrl: string
    usesGoogleMeet: boolean
}

export type CalendlyStatus = {
    connected: boolean
    account: { userUri: string, name: string, email: string, schedulingUrl: string | null } | null
    webhookActive: boolean
    publicUrlIsLocal: boolean
    error: string | null
    eventTypes: CalendlyEventType[]
    types: {
        key: string
        title: string
        audience: 'Prospect' | 'Client'
        durationMinutes: number
        enabled: boolean
        eventTypeUri: string | null
        calendlyUrl: string
    }[]
}

// ---------- Formations et paiements ----------
export type PaymentKind = 'Course' | 'Seminar' | 'Other'
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Canceled' | 'Refunded'

export type CourseCard = {
    id: string
    slug: string
    title: string
    summary: string
    durationLabel: string | null
    priceCents: number
    currency: string
    modules: number
    lessons: number
}

export type PublicLesson = {
    id: string
    title: string
    durationMinutes: number | null
    freePreview: boolean
    body: string | null
    videoEmbedUrl: string | null
}

export type CourseDetail = Omit<CourseCard, 'modules' | 'lessons'> & {
    description: string
    modules: { title: string, lessons: PublicLesson[] }[]
    hasAccess: boolean
    paymentsEnabled: boolean
}

export type MyCourse = {
    id: string
    slug: string
    title: string
    summary: string
    published: boolean
    lessons: number
    done: number
}

export type ClassroomLesson = {
    id: string
    title: string
    body: string
    videoEmbedUrl: string | null
    durationMinutes: number | null
    done: boolean
    comments: number
}

export type Classroom = {
    id: string
    slug: string
    title: string
    summary: string
    isCoach: boolean
    modules: { id: string, title: string, lessons: ClassroomLesson[] }[]
}

export type CommunityComment = {
    id: string
    authorName: string
    authorIsCoach: boolean
    body: string
    createdAt: string
    canDelete: boolean
}

export type CommunityPost = CommunityComment & {
    pinned: boolean
    likes: number
    likedByMe: boolean
    comments: CommunityComment[]
}

export type PaymentLink = {
    label: string
    kind: PaymentKind
    amountCents: number
    currency: string
    status: PaymentStatus
    expired: boolean
    firstName: string | null
    courseSlug: string | null
    courseTitle: string | null
    receiptUrl: string | null
    paymentsEnabled: boolean
}

export type PaymentConfirmation = {
    status: PaymentStatus
    kind: PaymentKind
    label: string
    amountCents: number
    currency: string
    courseSlug: string | null
    linkedToAccount: boolean
    receiptUrl: string | null
}

export type MyPayment = {
    id: string
    label: string
    kind: PaymentKind
    amountCents: number
    currency: string
    status: PaymentStatus
    createdAt: string
    paidAt: string | null
    expiresAt: string
    receiptUrl: string | null
    payUrl: string | null
}
