import { faker } from '@faker-js/faker';

type FakerFn = () => unknown;

const EXACT: Record<string, FakerFn> = {
  id:           () => faker.string.uuid(),
  uuid:         () => faker.string.uuid(),
  email:        () => faker.internet.email(),
  username:     () => faker.internet.username(),
  firstName:    () => faker.person.firstName(),
  first_name:   () => faker.person.firstName(),
  lastName:     () => faker.person.lastName(),
  last_name:    () => faker.person.lastName(),
  name:         () => faker.person.fullName(),
  fullName:     () => faker.person.fullName(),
  full_name:    () => faker.person.fullName(),
  phone:        () => faker.phone.number(),
  phoneNumber:  () => faker.phone.number(),
  phone_number: () => faker.phone.number(),
  address:      () => faker.location.streetAddress(),
  street:       () => faker.location.street(),
  city:         () => faker.location.city(),
  state:        () => faker.location.state(),
  country:      () => faker.location.country(),
  zip:          () => faker.location.zipCode(),
  zipCode:      () => faker.location.zipCode(),
  postal:       () => faker.location.zipCode(),
  lat:          () => parseFloat(faker.location.latitude().toString()),
  latitude:     () => parseFloat(faker.location.latitude().toString()),
  lng:          () => parseFloat(faker.location.longitude().toString()),
  longitude:    () => parseFloat(faker.location.longitude().toString()),
  url:          () => faker.internet.url(),
  website:      () => faker.internet.url(),
  avatar:       () => faker.image.avatar(),
  image:        () => faker.image.url(),
  thumbnail:    () => faker.image.url({ width: 150, height: 150 }),
  createdAt:    () => faker.date.past().toISOString(),
  created_at:   () => faker.date.past().toISOString(),
  updatedAt:    () => faker.date.recent().toISOString(),
  updated_at:   () => faker.date.recent().toISOString(),
  deletedAt:    () => null,
  deleted_at:   () => null,
  birthDate:    () => faker.date.birthdate().toISOString().split('T')[0],
  birth_date:   () => faker.date.birthdate().toISOString().split('T')[0],
  slug:         () => faker.helpers.slugify(faker.lorem.words(2)),
  price:        () => parseFloat(faker.commerce.price()),
  amount:       () => parseFloat(faker.commerce.price()),
  cost:         () => parseFloat(faker.commerce.price()),
  description:  () => faker.lorem.paragraph(),
  bio:          () => faker.lorem.sentences(2),
  title:        () => faker.lorem.sentence(),
  subject:      () => faker.lorem.sentence(),
  body:         () => faker.lorem.paragraphs(2),
  content:      () => faker.lorem.paragraphs(2),
  token:        () => faker.string.alphanumeric(40),
  accessToken:  () => faker.string.alphanumeric(40),
  access_token: () => faker.string.alphanumeric(40),
  refreshToken: () => faker.string.alphanumeric(40),
  refresh_token:() => faker.string.alphanumeric(40),
  password:     () => faker.internet.password(),
  color:        () => faker.color.human(),
  colour:       () => faker.color.human(),
  brand:        () => faker.company.name(),
  company:      () => faker.company.name(),
  category:     () => faker.commerce.department(),
  tag:          () => faker.lorem.word(),
  status:       () => faker.helpers.arrayElement(['active', 'inactive', 'pending']),
  role:         () => faker.helpers.arrayElement(['user', 'admin', 'moderator']),
  gender:       () => faker.helpers.arrayElement(['male', 'female', 'other']),
  locale:       () => faker.helpers.arrayElement(['en', 'fr', 'de', 'es', 'ja']),
  currency:     () => faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'INR']),
  rating:       () => faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  score:        () => faker.number.int({ min: 0, max: 100 }),
  count:        () => faker.number.int({ min: 0, max: 1000 }),
  total:        () => faker.number.int({ min: 1, max: 10000 }),
  page:         () => faker.number.int({ min: 1, max: 10 }),
  limit:        () => faker.helpers.arrayElement([10, 20, 50]),
  ip:           () => faker.internet.ip(),
  ipAddress:    () => faker.internet.ip(),
  userAgent:    () => faker.internet.userAgent(),
  version:      () => faker.system.semver(),
};

// Substring matching for partial names like "userEmail" → email
const PARTIAL: Array<[string, FakerFn]> = [
  ['email',       () => faker.internet.email()],
  ['phone',       () => faker.phone.number()],
  ['avatar',      () => faker.image.avatar()],
  ['image',       () => faker.image.url()],
  ['url',         () => faker.internet.url()],
  ['name',        () => faker.person.fullName()],
  ['title',       () => faker.lorem.sentence()],
  ['description', () => faker.lorem.paragraph()],
  ['address',     () => faker.location.streetAddress()],
  ['city',        () => faker.location.city()],
  ['country',     () => faker.location.country()],
  ['created',     () => faker.date.past().toISOString()],
  ['updated',     () => faker.date.recent().toISOString()],
  ['price',       () => parseFloat(faker.commerce.price())],
  ['amount',      () => parseFloat(faker.commerce.price())],
  ['token',       () => faker.string.alphanumeric(40)],
  ['id',          () => faker.string.uuid()],
  ['slug',        () => faker.helpers.slugify(faker.lorem.words(2))],
  ['color',       () => faker.color.human()],
];

export function applyHeuristic(fieldName: string): { value: unknown; matched: boolean } {
  const lower = fieldName.toLowerCase();

  if (EXACT[fieldName]) return { value: EXACT[fieldName](), matched: true };
  if (EXACT[lower])     return { value: EXACT[lower](), matched: true };

  for (const [fragment, fn] of PARTIAL) {
    if (lower.includes(fragment)) return { value: fn(), matched: true };
  }

  return { value: undefined, matched: false };
}
