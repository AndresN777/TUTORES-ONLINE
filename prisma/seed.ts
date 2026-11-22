/**
 * Reproducible development/demo data. Never run against production.
 * Every demo account uses the password in DEMO_PASSWORD (documented in README.md).
 * Dates are relative to "now" so the demo always has upcoming and past sessions.
 */
import { PrismaClient, type Modality, type BookingStatus } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { addDays, localDateOf, mondayOf, zonedToUtc } from "../src/lib/utils/time";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Demo12345";
const TZ = "America/Santo_Domingo";

if (process.env.NODE_ENV === "production") {
  throw new Error("El seed de demostración no se ejecuta en producción.");
}

const SUBJECTS = [
  ["matematicas", "Matemáticas"],
  ["quimica", "Química"],
  ["fisica", "Física"],
  ["ingles", "Inglés"],
  ["lenguaje", "Lenguaje"],
  ["biologia", "Biología"],
] as const;
const LEVELS = ["Primaria", "Secundaria", "Universidad"];

type TutorSeed = {
  first: string;
  last: string;
  email: string;
  subjects: string[];
  levels: string[];
  virtual: boolean;
  inPerson: boolean;
  zone?: string;
  bio: string;
  days: number[];
  verification?: "APPROVED" | "PENDING";
};

const TUTORS: TutorSeed[] = [
  { first: "Ana", last: "Torres", email: "ana.torres@tutores.test", subjects: ["fisica", "matematicas"], levels: ["Secundaria", "Universidad"], virtual: true, inPerson: true, zone: "Centro", bio: "Licenciada en Física con 8 años de experiencia preparando a estudiantes de secundaria y primeros años de universidad. Trabajo con ejercicios resueltos paso a paso.", days: [0, 2, 4] },
  { first: "Isaac", last: "Newton", email: "isaac.newton@tutores.test", subjects: ["matematicas"], levels: ["Universidad"], virtual: true, inPerson: true, zone: "Norte", bio: "Matemático especializado en cálculo diferencial e integral. Clases enfocadas en exámenes universitarios.", days: [1, 3] },
  { first: "Marie", last: "Curie", email: "marie.curie@tutores.test", subjects: ["quimica"], levels: ["Secundaria"], virtual: true, inPerson: false, bio: "Química con experiencia en laboratorio. Explico estequiometría y química orgánica con ejemplos cotidianos.", days: [0, 1, 5] },
  { first: "Rosalind", last: "Franklin", email: "rosalind.franklin@tutores.test", subjects: ["quimica", "biologia"], levels: ["Universidad"], virtual: true, inPerson: true, zone: "Este", bio: "Bioquímica. Acompaño a estudiantes universitarios en química general y biología molecular.", days: [2, 3] },
  { first: "Melissa", last: "Espinoza Ibrahim", email: "melissa.espinoza@tutores.test", subjects: ["ingles"], levels: ["Secundaria"], virtual: true, inPerson: false, bio: "Profesora de inglés certificada C2, enfocada en conversación y preparación de exámenes internacionales.", days: [0, 4] },
  { first: "Gregor", last: "Mendel", email: "gregor.mendel@tutores.test", subjects: ["biologia"], levels: ["Secundaria"], virtual: false, inPerson: true, zone: "Centro", bio: "Biólogo y docente. Genética, ecología y preparación para olimpiadas de biología.", days: [1, 5] },
  { first: "Zafnat", last: "Panea", email: "zafnat.panea@tutores.test", subjects: ["lenguaje"], levels: ["Primaria"], virtual: false, inPerson: true, zone: "Norte", bio: "Maestra de lengua con 10 años en primaria: comprensión lectora, ortografía y redacción.", days: [0, 2] },
  { first: "Helena", last: "De Troya", email: "helena.troya@tutores.test", subjects: ["ingles"], levels: ["Universidad"], virtual: true, inPerson: false, bio: "Traductora e intérprete. Inglés académico y redacción de ensayos para universitarios.", days: [3, 4] },
  { first: "Jorge", last: "Salas", email: "jorge.salas@tutores.test", subjects: ["matematicas"], levels: ["Primaria"], virtual: true, inPerson: true, zone: "Este", bio: "Docente de matemáticas para primaria: refuerzo escolar con juegos y material concreto.", days: [5] },
  { first: "Tomás", last: "Guzmán", email: "tomas.guzman@tutores.test", subjects: ["matematicas", "fisica"], levels: ["Secundaria"], virtual: true, inPerson: false, bio: "Ingeniero civil, 4 años dando clases particulares de álgebra y física básica.", days: [1], verification: "PENDING" },
];

const STUDENTS = [
  { first: "Laura", last: "Méndez", email: "laura.mendez@tutores.test", age: 17, sex: "FEMALE" as const },
  { first: "Pedro", last: "Álvarez", email: "pedro.alvarez@tutores.test", age: 19, sex: "MALE" as const },
  { first: "Sofía", last: "Núñez", email: "sofia.nunez@tutores.test", age: 16, sex: "FEMALE" as const },
  { first: "Diego", last: "Herrera", email: "diego.herrera@tutores.test", age: 20, sex: "MALE" as const },
];

const SLOT_MINUTES = [9 * 60, 10 * 60, 16 * 60, 17 * 60];

async function main() {
  console.info("Limpiando datos…");
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.review.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.availabilityException.deleteMany(),
    prisma.availabilitySlot.deleteMany(),
    prisma.tutorLevel.deleteMany(),
    prisma.tutorSubject.deleteMany(),
    prisma.tutorProfile.deleteMany(),
    prisma.session.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.level.deleteMany(),
  ]);

  const passwordHash = await hash(DEMO_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const subjects = new Map<string, string>();
  for (const [slug, name] of SUBJECTS) subjects.set(slug, (await prisma.subject.create({ data: { slug, name } })).id);
  const levels = new Map<string, string>();
  for (const [i, name] of LEVELS.entries()) levels.set(name, (await prisma.level.create({ data: { name, position: i } })).id);

  await prisma.user.create({
    data: { email: "admin@tutores.test", passwordHash, role: "ADMIN", firstName: "Equipo", lastName: "TutoresOn-Line", age: 30, sex: "UNDISCLOSED" },
  });

  const tutorIds = new Map<string, string>();
  for (const t of TUTORS) {
    const user = await prisma.user.create({
      data: {
        email: t.email,
        passwordHash,
        role: "TUTOR",
        firstName: t.first,
        lastName: t.last,
        age: 35,
        sex: "UNDISCLOSED",
        timezone: TZ,
        tutorProfile: {
          create: {
            bio: t.bio,
            verification: t.verification ?? "APPROVED",
            offersVirtual: t.virtual,
            offersInPerson: t.inPerson,
            zone: t.zone ?? null,
            subjects: { create: t.subjects.map((s) => ({ subjectId: subjects.get(s)! })) },
            levels: { create: t.levels.map((l) => ({ levelId: levels.get(l)! })) },
            availability: { create: t.days.flatMap((weekday) => SLOT_MINUTES.map((startMinute) => ({ weekday, startMinute }))) },
          },
        },
      },
    });
    tutorIds.set(t.email, user.id);
  }

  const studentIds = new Map<string, string>();
  for (const s of STUDENTS) {
    const user = await prisma.user.create({
      data: { email: s.email, passwordHash, role: "STUDENT", firstName: s.first, lastName: s.last, age: s.age, sex: s.sex },
    });
    studentIds.set(s.email, user.id);
  }

  const thisMonday = mondayOf(localDateOf(new Date(), TZ));
  /** A slot `weeks` weeks from this week's Monday, on `weekday`, at `minute` (tutor local time). */
  const at = (weeks: number, weekday: number, minute: number) => {
    const startAt = zonedToUtc(addDays(thisMonday, weeks * 7 + weekday), minute, TZ);
    return { startAt, endAt: new Date(startAt.getTime() + 60 * 60000) };
  };

  type B = { student: string; tutor: string; subject: string; when: { startAt: Date; endAt: Date }; modality: Modality; status: BookingStatus; note?: string; url?: string; place?: string; review?: [number, string]; report?: string };
  const T = (n: string) => `${n}@tutores.test`;
  const bookings: B[] = [
    { student: T("laura.mendez"), tutor: T("ana.torres"), subject: "fisica", when: at(1, 0, 16 * 60), modality: "VIRTUAL", status: "ACCEPTED", note: "Repaso de cinemática.", url: "https://meet.google.com/abc-defg-hij" },
    { student: T("laura.mendez"), tutor: T("marie.curie"), subject: "quimica", when: at(1, 1, 10 * 60), modality: "VIRTUAL", status: "ACCEPTED", url: "https://zoom.us/j/1234567890" },
    { student: T("laura.mendez"), tutor: T("isaac.newton"), subject: "matematicas", when: at(2, 1, 10 * 60), modality: "IN_PERSON", status: "PENDING", note: "Derivadas e integrales." },
    { student: T("laura.mendez"), tutor: T("melissa.espinoza"), subject: "ingles", when: at(2, 0, 17 * 60), modality: "VIRTUAL", status: "PENDING", note: "Conversación." },
    { student: T("laura.mendez"), tutor: T("zafnat.panea"), subject: "lenguaje", when: at(3, 2, 9 * 60), modality: "IN_PERSON", status: "PENDING", note: "Comprensión lectora." },
    { student: T("laura.mendez"), tutor: T("helena.troya"), subject: "ingles", when: at(2, 3, 17 * 60), modality: "VIRTUAL", status: "REJECTED", note: "Gramática." },
    { student: T("laura.mendez"), tutor: T("gregor.mendel"), subject: "biologia", when: at(-2, 1, 10 * 60), modality: "IN_PERSON", status: "COMPLETED", place: "Biblioteca Central, sala 2", note: "Genética básica." },
    { student: T("laura.mendez"), tutor: T("ana.torres"), subject: "fisica", when: at(-3, 0, 16 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [5, "Explica con mucha paciencia y deja ejercicios para practicar."] },
    // Requests waiting for Ana Torres (two of them compete for the same block).
    { student: T("pedro.alvarez"), tutor: T("ana.torres"), subject: "fisica", when: at(2, 2, 16 * 60), modality: "IN_PERSON", status: "PENDING", note: "Ejercicios de dinámica." },
    { student: T("diego.herrera"), tutor: T("ana.torres"), subject: "fisica", when: at(2, 2, 16 * 60), modality: "VIRTUAL", status: "PENDING", note: "Primera clase de prueba." },
    { student: T("sofia.nunez"), tutor: T("ana.torres"), subject: "matematicas", when: at(3, 4, 9 * 60), modality: "VIRTUAL", status: "PENDING", note: "Funciones cuadráticas." },
    // Past sessions of Ana Torres still to be closed, plus history.
    { student: T("pedro.alvarez"), tutor: T("ana.torres"), subject: "fisica", when: at(-1, 2, 16 * 60), modality: "VIRTUAL", status: "ACCEPTED", url: "https://zoom.us/j/9876543210", note: "Dinámica." },
    { student: T("pedro.alvarez"), tutor: T("ana.torres"), subject: "fisica", when: at(-4, 2, 16 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [5, "Aprobé mi examen de dinámica gracias a sus clases."] },
    { student: T("sofia.nunez"), tutor: T("ana.torres"), subject: "matematicas", when: at(-5, 4, 9 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [4, "Muy clara; a veces la clase se queda corta de tiempo."] },
    { student: T("diego.herrera"), tutor: T("ana.torres"), subject: "fisica", when: at(-2, 4, 10 * 60), modality: "VIRTUAL", status: "CANCELLED" },
    // Other tutors' reputation, including reported reviews for moderation.
    { student: T("diego.herrera"), tutor: T("helena.troya"), subject: "ingles", when: at(-2, 3, 17 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [1, "Pésima, no sabe nada y además es una inútil."], report: "Lenguaje ofensivo" },
    { student: T("sofia.nunez"), tutor: T("isaac.newton"), subject: "matematicas", when: at(-2, 1, 10 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [2, "Llegó 20 minutos tarde y no recuperó el tiempo."], report: "La clase empezó a tiempo." },
    { student: T("pedro.alvarez"), tutor: T("isaac.newton"), subject: "matematicas", when: at(-3, 3, 10 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [5, "Domina el cálculo y lo explica muy bien."] },
    { student: T("pedro.alvarez"), tutor: T("marie.curie"), subject: "quimica", when: at(-3, 0, 9 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [5, "Excelente con la estequiometría."] },
    { student: T("sofia.nunez"), tutor: T("rosalind.franklin"), subject: "biologia", when: at(-3, 2, 10 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [5, "Muy preparada."] },
    { student: T("diego.herrera"), tutor: T("melissa.espinoza"), subject: "ingles", when: at(-3, 4, 16 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [4, "Buena conversación."] },
    { student: T("sofia.nunez"), tutor: T("gregor.mendel"), subject: "biologia", when: at(-4, 1, 9 * 60), modality: "IN_PERSON", status: "COMPLETED", review: [4, "Clases ordenadas."] },
    { student: T("diego.herrera"), tutor: T("zafnat.panea"), subject: "lenguaje", when: at(-4, 0, 9 * 60), modality: "IN_PERSON", status: "COMPLETED", review: [4, "Paciente con los más pequeños."] },
    { student: T("pedro.alvarez"), tutor: T("jorge.salas"), subject: "matematicas", when: at(-4, 5, 9 * 60), modality: "VIRTUAL", status: "COMPLETED", review: [3, "Correcto, aunque algo desorganizado."] },
  ];

  for (const b of bookings) {
    const booking = await prisma.booking.create({
      data: {
        studentId: studentIds.get(b.student)!,
        tutorId: tutorIds.get(b.tutor)!,
        subjectId: subjects.get(b.subject)!,
        ...b.when,
        modality: b.modality,
        status: b.status,
        studentNote: b.note ?? null,
        meetingUrl: b.url ?? null,
        meetingPlace: b.place ?? null,
      },
    });
    if (b.review) {
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          studentId: booking.studentId,
          tutorId: booking.tutorId,
          rating: b.review[0],
          comment: b.review[1],
          reportReason: b.report ?? null,
          reportedAt: b.report ? new Date() : null,
        },
      });
    }
  }

  await prisma.availabilityException.create({
    data: { tutorId: tutorIds.get(T("ana.torres"))!, date: `${new Date().getFullYear()}-12-24` },
  });

  const laura = studentIds.get(T("laura.mendez"))!;
  const ana = tutorIds.get(T("ana.torres"))!;
  await prisma.notification.createMany({
    data: [
      { userId: laura, message: "Ana Torres aceptó tu solicitud de Física.", link: "/student/bookings" },
      { userId: laura, message: "Helena De Troya declinó tu solicitud de Inglés.", link: "/student/bookings" },
      { userId: ana, message: "Nueva solicitud de Pedro Álvarez — Física.", link: "/tutor" },
      { userId: ana, message: "Nueva solicitud de Diego Herrera — Física.", link: "/tutor" },
    ],
  });

  console.info(`Listo: ${TUTORS.length} profesores, ${STUDENTS.length} estudiantes, ${bookings.length} tutorías, 1 administrador.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
