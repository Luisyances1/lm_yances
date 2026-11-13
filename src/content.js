export const profile = {
  name: 'Luis Miguel Yances Castillo',
  title: 'Desarrollador de software',
  email: 'luisyances1@gmail.com',
  phone: '+57 301 250 1375',
  linkedin: '',
  github: '',
  cv: 'cv-luis-miguel-yances.pdf'
};

export const stops = [
  {
    id: 'campus', kf: 1, short: 'Universidad',
    code: '', place: 'Montería, Córdoba', elevation: '18 m',
    role: 'Ingeniero de Sistemas', org: 'Universidad de Córdoba'
  },
  {
    id: 'quipux', kf: 4, short: 'Quipux',
    code: '', place: 'Medellín, Antioquia', elevation: '1.495 m',
    role: 'Analista de Información', org: 'Quipux, en la Gobernación de Antioquia'
  },
  {
    id: 'gomedical', kf: 7, short: 'GoMedical',
    code: '', place: 'Montería, Córdoba', elevation: '18 m',
    role: 'Ingeniero de Desarrollo y Soporte', org: 'Go Medical International'
  },
  {
    id: 'metagroup', kf: 10, short: 'Metagroup',
    code: '', place: 'Medellín, Antioquia', elevation: '1.495 m',
    role: 'Analista de Datos', org: 'Metagroup'
  },
  {
    id: 'ascenso', kf: 13, range: [11.4, 14.4], short: 'Ascenso',
    code: '', place: 'Ascenso', elevation: '',
    role: 'Del dato a la voz', org: 'Metagroup me asignó a Aunnait, su empresa hermana, para reforzar el equipo de desarrollo'
  },
  {
    id: 'aunnait', kf: 15, short: 'Aunnait',
    code: '', place: 'Remoto, entre España y Colombia', elevation: 'sobre las nubes',
    role: 'Desarrollador de Software', org: 'Aunnait'
  }
];

export const textVersion = {
  summary:
    'Ingeniero de Sistemas y desarrollador de software full-stack con más de 3 años de experiencia en salud, sector público y servicios en Colombia y España: backend con Python y Laravel, frontends con Vue y Nuxt, telefonía IP con Asterisk, agentes de voz y chatbots con IA, y DevOps.',
  jobs: [
    ['Desarrollador de Software', 'Aunnait (España, remoto)', 'Octubre 2025 – actualidad', 'Agentes de voz con ElevenLabs y Laravel, asistente de voz open source para el Ayuntamiento de Murcia, clasificador de intenciones para Decide Madrid (83 % de precisión), Asterisk, CI/CD en GitLab y servidores Linux.'],
    ['Analista de Datos', 'Metagroup (Medellín)', 'Octubre 2025', 'Tableros de Power BI y modelos DAX. Asignado después a Aunnait, empresa hermana.'],
    ['Ingeniero de Desarrollo y Soporte', 'Go Medical International (Montería)', 'Noviembre 2023 – octubre 2025', 'Funcionalidades para un sistema RIS/PACS de imágenes médicas con Laravel, Vue, Orthanc y PostgreSQL; soporte a clínicas.'],
    ['Analista de Información', 'Quipux, en la Gobernación de Antioquia (Medellín)', 'Octubre 2022 – marzo 2023', 'Segmentación de cartera con Python para campañas de cobro por llamadas y SMS.'],
    ['Web Master', 'Soluciones Integrales R&S', 'Marzo 2022 – agosto 2022', 'Administración y actualización del sitio web corporativo.']
  ],
  education: [
    'Especialización en Inteligencia Artificial, UNIR (en curso)',
    'Ingeniería de Sistemas, Universidad de Córdoba (2017 – 2022)',
    'Técnico en Desarrollo de Aplicaciones Móviles, SENA (2024 – 2025)'
  ],
  skills:
    'Python, PHP, JavaScript, SQL, Django, FastAPI, Laravel, Vue.js, Nuxt, Flutter, PostgreSQL, MySQL, SQL Server, Asterisk, WhatsApp Business API, ElevenLabs, LLM, Docker, GitLab CI/CD, Linux, Power BI, DAX'
};
