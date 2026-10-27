// Training program, technique cues and back-safety notes. Video data comes from exercises.gen.js.

export const MUSCLES = {
  glute_max: 'Ягодичные', glute_med: 'Средняя ягодичная', erector: 'Разгибатели спины',
  lats: 'Широчайшие', upper_back: 'Середина спины', rectus_abd: 'Прямая мышца живота',
  obliques: 'Косые мышцы живота', transversus: 'Поперечная мышца живота', pecs: 'Грудные',
  quads: 'Квадрицепс', hamstrings: 'Задняя поверхность бедра', delt_front: 'Передняя дельта',
  delt_side: 'Средняя дельта', delt_rear: 'Задняя дельта', biceps: 'Бицепс', triceps: 'Трицепс',
};

// muscle -> filter group in the library
export const GROUPS = {
  legs: { name: 'Ноги и ягодицы', muscles: ['quads', 'hamstrings', 'glute_max', 'glute_med'] },
  back: { name: 'Спина', muscles: ['lats', 'upper_back', 'erector'] },
  chest: { name: 'Грудь', muscles: ['pecs'] },
  shoulders: { name: 'Плечи', muscles: ['delt_front', 'delt_side', 'delt_rear'] },
  arms: { name: 'Руки', muscles: ['biceps', 'triceps'] },
  core: { name: 'Кор', muscles: ['rectus_abd', 'obliques', 'transversus'] },
};

// cues: technique hints; back: why/how it is safe for the lumbar discs; weighted: shows a weight field
export const TEXT = {
  cat_camel: {
    cues: ['На четвереньках: кисти под плечами, колени под тазом.',
      'Медленно округляй и прогибай спину в комфортной амплитуде, без рывков.',
      'Не дави в крайних точках: цель — подвижность, а не растяжка.',
      'Дыши спокойно, выдох — на округлении.'],
    back: 'Мягкая мобилизация, а не силовое упражнение. Если прогиб или округление отдаёт в спину или ногу — уменьши амплитуду.',
  },
  bird_dog: {
    cues: ['Спина ровная, живот слегка напряжён, взгляд в пол.',
      'Вытягивай руку и противоположную ногу по линии корпуса — не выше.',
      'Таз не поворачивается и не проваливается: как будто на пояснице стакан воды.',
      'Задержка 8–10 с, затем медленно вернись и смени сторону.'],
    back: 'Учит держать поясницу нейтральной под нагрузкой. Нога выше корпуса — это уже прогиб в пояснице.',
  },
  glute_bridge: {
    cues: ['Лёжа на спине, стопы на ширине таза, голени почти вертикально.',
      'Сначала напряги живот, затем поднимай таз сжатием ягодиц.',
      'Вверху прямая линия колени — таз — плечи, задержка 1–2 с.',
      'Опускайся медленно.'],
    back: 'Таз поднимают ягодицы, а не прогиб в пояснице. Если тянет поясницу — поднимайся ниже. Hip thrust — тот же принцип с опорой лопатками о скамью.',
    weighted: true,
  },
  dead_bug: {
    cues: ['Лёжа на спине: руки вверх, бёдра вертикально, колени под 90°.',
      'Поясница спокойно лежит на полу всё упражнение.',
      'На выдохе медленно опусти противоположные руку и ногу.',
      'Вернись и смени сторону.'],
    back: 'Если поясница отрывается от пола — уменьши амплитуду ноги или опускай только ногу.',
  },
  side_plank: {
    cues: ['Локоть строго под плечом, тело — одна прямая от головы до стоп.',
      'Таз не проваливается и не уходит назад.',
      'Шея в линии с корпусом, дыхание ровное.',
      'Облегчённый вариант — с опорой на колени.'],
    back: 'Нагружает косые мышцы без сгибания позвоночника. Начни с колен, если трудно держать линию.',
  },
  mcgill_curl_up: {
    cues: ['Одна нога согнута, другая прямая, ладони под поясницей.',
      'Сохрани естественный прогиб поясницы — не вжимай её в пол.',
      'Приподними голову и плечи на пару сантиметров единым блоком, без кивка.',
      'Держи 8–10 с, дыши, опусти и повтори.'],
    back: 'Это не скручивание: поясница не сгибается, подъём минимальный. Шея не тянется вперёд.',
  },
  goblet_squat: {
    cues: ['Гантель у груди, стопы чуть шире плеч, носки немного наружу.',
      'Таз назад и вниз до касания скамьи, корпус наклоняется вместе с голенями.',
      'Коснись скамьи, не садясь и не расслабляясь.',
      'Вставай, толкаясь всей стопой, колени смотрят по носкам.'],
    back: 'Скамья ограничивает глубину: опускайся, только пока спина ровная. Вес лёгкий — гантель у груди тоже нагружает позвоночник.',
    weighted: true,
  },
  split_squat: {
    cues: ['Длинный шаг, задняя нога на носке, корпус вертикально.',
      'Опускайся прямо вниз, колено задней ноги к полу.',
      'Переднее колено над стопой, передняя стопа вся на полу.',
      'Держись за опору, если теряешь равновесие.'],
    back: 'Корпус прямо, без наклона и прогиба. Начни без веса; гантели — только в опущенных руках, не на плечах.',
    weighted: true,
  },
  bench_pushup: {
    cues: ['Ладони на краю скамьи чуть шире плеч.',
      'Тело — одна линия от пяток до головы, живот и ягодицы напряжены.',
      'Опускайся грудью к скамье, локти под ~45° к корпусу.',
      'Выжимайся, не провисая в пояснице.'],
    back: 'Таз не провисает — иначе прогиб в пояснице. Чем выше опора, тем легче упражнение.',
  },
  db_bench_press: {
    cues: ['Стопы на полу, лопатки сведены и опущены.',
      'Ягодицы на скамье, у поясницы естественный небольшой прогиб.',
      'Опускай гантели к груди медленно, локти под ~45°.',
      'Выжимай вверх, не отрывая таз.'],
    back: 'Тяжёлые гантели не поднимай с пола в наклоне: ставь их на скамью и бёдра, ложись с ними на груди.',
    weighted: true,
  },
  lat_pulldown: {
    cues: ['Бёдра плотно под валиками, корпус чуть отклонён назад и неподвижен.',
      'Сначала опусти плечи, затем тяни гриф к верху груди.',
      'Локти идут вниз и назад, за голову гриф не заводи.',
      'Возвращай медленно до прямых рук.'],
    back: 'Не раскачивайся и не откидывайся ради рывка — работают руки и лопатки, поясница неподвижна.',
    weighted: true,
  },
  seated_cable_row: {
    cues: ['Сидя ровно, колени слегка согнуты, стопы в упоре.',
      'Корпус вертикально и неподвижно — тянут только руки.',
      'Рукоять к животу, в конце сведи лопатки.',
      'Возвращай медленно, не наклоняясь за рукоятью.'],
    back: 'Не тянись корпусом за рукоятью и не откидывайся назад: поясница остаётся неподвижной.',
    weighted: true,
  },
  seated_db_press: {
    cues: ['Спинка вертикально или почти вертикально, спина и таз прижаты.',
      'Гантели у плеч, локти чуть впереди корпуса.',
      'Выжимай вверх, не прогибаясь и не отрываясь от спинки.',
      'Опускай медленно до уровня ушей.'],
    back: 'Спинка снимает нагрузку с поясницы. Если тянет прогнуться — вес слишком большой.',
    weighted: true,
  },
  cable_pull_through: {
    cues: ['Спиной к нижнему блоку, канат между ног, стопы шире плеч.',
      'Отводи таз назад, колени чуть согнуты, спина ровная.',
      'Выпрямляйся, сжимая ягодицы и подавая таз вперёд.',
      'Вверху стой прямо, без отклонения назад.'],
    back: 'Безопасная замена румынской тяге: нагрузка горизонтальная, не осевая. Наклон умеренный, спина ровная всю амплитуду.',
    weighted: true,
  },
  face_pull: {
    cues: ['Блок на уровне лба, канат хватом сверху, руки прямые.',
      'Сначала опусти плечи, затем тяни канат к лицу, локти в стороны на уровне плеч.',
      'В конце разведи концы каната: кисти у висков, лопатки сведены.',
      'Возвращай медленно, корпус неподвижен.'],
    back: 'Для устойчивости поставь одну ногу чуть впереди. Не отклоняйся назад, чтобы сдвинуть вес.',
    weighted: true,
  },
  leg_extension: {
    cues: ['Колено напротив оси тренажёра, валик над голеностопом.',
      'Спина и таз прижаты к спинке, держись за рукояти.',
      'Разгибай ноги без рывка, вверху короткая пауза.',
      'Опускай медленно.'],
    back: 'Поясница прижата к спинке, корпус не помогает. Для сгибания ног в тренажёре — те же правила.',
    weighted: true,
  },
  pallof_press: {
    cues: ['Встань боком к блоку, рукоять у груди, стопы шире плеч.',
      'Напряги живот и ягодицы: таз и плечи смотрят вперёд.',
      'Выжми рукоять вперёд и задержись на 1–2 с, не давая блоку развернуть корпус.',
      'Медленно верни к груди, после подходов смени сторону.'],
    back: 'Упражнение «против вращения»: корпус не поворачивается вообще. Начинай с малого веса.',
    weighted: true,
  },
};

// Prescription fields: sets, reps [min,max] or hold [min,max] seconds or minutes [min,max];
// side: per side/leg; extraSets: optional extra sets; title/note: overrides for this slot.
const WARMUP = [
  { ex: 'cat_camel', sets: 1, reps: [10, 10] },
  { ex: 'bird_dog', sets: 1, reps: [6, 6], side: true },
  { ex: 'glute_bridge', sets: 1, reps: [10, 10], noWeight: true },
  { ex: 'walk', sets: 1, minutes: [3, 5], title: 'Ходьба или велотренажёр',
    note: 'Лёгкий темп, можно говорить фразами.' },
];

const CORE = [
  { ex: 'mcgill_curl_up', sets: 3, extraSets: 1, hold: [8, 10] },
  { ex: 'side_plank', sets: 3, hold: [8, 10], side: true },
  { ex: 'bird_dog', sets: 3, hold: [8, 10], side: true },
];

const STRENGTH = {
  A: [
    { ex: 'db_bench_press', sets: 3, reps: [10, 12] },
    { ex: 'lat_pulldown', sets: 3, reps: [10, 12] },
    { ex: 'goblet_squat', sets: 3, reps: [10, 10], note: 'Лёгкий вес.' },
    { ex: 'glute_bridge', sets: 3, reps: [12, 12], title: 'Ягодичный мостик или hip thrust' },
    { ex: 'pallof_press', sets: 3, reps: [10, 10], side: true },
  ],
  B: [
    { ex: 'seated_cable_row', sets: 3, reps: [10, 12], title: 'Тяга в тренажёре с упором грудью',
      note: 'Ролик показывает тягу нижнего блока: траектория та же, но грудь прижата к подушке — поясница полностью разгружена.' },
    { ex: 'seated_db_press', sets: 3, reps: [10, 10], title: 'Жим гантелей сидя со спинкой' },
    { ex: 'cable_pull_through', sets: 3, reps: [10, 12], title: 'Тяга на блоке стоя (pull-through)',
      note: 'Замена румынской тяги.' },
    { ex: 'leg_extension', sets: 3, reps: [12, 12], title: 'Разгибание или сгибание ног в тренажёре' },
    { ex: 'side_plank', sets: 3, hold: [20, 30], side: true },
  ],
  C: [
    { ex: 'seated_cable_row', sets: 3, reps: [10, 12] },
    { ex: 'bench_pushup', sets: 3, reps: [10, 12] },
    { ex: 'split_squat', sets: 3, reps: [8, 8], side: true, sideWord: 'на ногу' },
    { ex: 'face_pull', sets: 3, reps: [15, 15] },
    { ex: 'dead_bug', sets: 3, reps: [8, 8], side: true },
  ],
};

export const DAYS = {
  A: { title: 'День A', short: 'A' },
  B: { title: 'День B', short: 'B' },
  C: { title: 'День C', short: 'C' },
  core: { title: 'Кора по McGill', short: 'К' },
};

// JS getDay(): 0 = Sunday
export const SCHEDULE = { 1: 'A', 3: 'B', 5: 'C' };
export const dayForDate = (d) => SCHEDULE[d.getDay()] || 'core';

export const CARDIO_GOAL = [150, 200];
export const CARDIO_TYPES = ['Ходьба', 'Велосипед', 'Эллипс', 'Плавание'];

// Safe alternatives offered after "Боль, остановиться"
export const SUBSTITUTES = {
  db_bench_press: ['bench_pushup'],
  bench_pushup: ['db_bench_press'],
  lat_pulldown: ['seated_cable_row', 'face_pull'],
  seated_cable_row: ['lat_pulldown', 'face_pull'],
  face_pull: ['seated_cable_row'],
  seated_db_press: ['bench_pushup', 'face_pull'],
  goblet_squat: ['leg_extension', 'glute_bridge'],
  split_squat: ['leg_extension', 'glute_bridge'],
  leg_extension: ['glute_bridge'],
  cable_pull_through: ['glute_bridge'],
  glute_bridge: ['leg_extension'],
  pallof_press: ['dead_bug', 'side_plank'],
  side_plank: ['dead_bug'],
  dead_bug: ['mcgill_curl_up'],
  bird_dog: ['dead_bug'],
  mcgill_curl_up: ['dead_bug'],
  cat_camel: [],
};

/** Ordered sections of a session for a day key ('A' | 'B' | 'C' | 'core'). */
export function sessionPlan(day) {
  if (day === 'core') return [{ kind: 'core', name: 'Кора по McGill', items: CORE }];
  return [
    { kind: 'warmup', name: 'Разминка', items: WARMUP },
    { kind: 'core', name: 'Кора по McGill', items: CORE },
    { kind: 'strength', name: 'Силовая часть', items: STRENGTH[day] },
  ];
}

export const range = ([a, b]) => (a === b ? `${a}` : `${a}–${b}`);

/** "3 × 10–12 повторов", "3 × 8–10 с на сторону", "3–5 мин" */
export function targetText(it) {
  const sets = it.extraSets ? `${it.sets}–${it.sets + it.extraSets}` : `${it.sets}`;
  const side = it.side ? ` ${it.sideWord || 'на сторону'}` : '';
  if (it.minutes) return `${range(it.minutes)} мин`;
  if (it.hold) return it.sets === 1 ? `${range(it.hold)} с${side}` : `${sets} × ${range(it.hold)} с${side}`;
  const reps = `${range(it.reps)} повторов${side}`;
  return it.sets === 1 ? reps : `${sets} × ${reps}`;
}
