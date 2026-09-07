import * as XLSX from 'xlsx'

const HEADERS = ['CURS', 'INFANT', 'TITULAR', 'IBAN', 'DNI', 'REFERÈNCIA MANDAT']

const EXAMPLE_ROWS = [
  ['I3', 'Marina Puig Soler', 'Anna Soler Vila', 'ES00 0000 0000 0000 0000 0000', '12345678A', 'FAM001'],
  ['I5', 'Pol Puig Soler', '', '', '', ''],
  ['P3', 'Martí Riera Costa', 'Martí Riera Costa', 'ES00 1111 1111 1111 1111 1111', '23456789B', 'FAM002'],
]

const INSTRUCTIONS = [
  ['Com omplir aquest Excel'],
  [''],
  ['El full "SEPA" ha de tenir les columnes CURS, INFANT, TITULAR, IBAN, DNI i REFERÈNCIA MANDAT (en qualsevol ordre).'],
  [''],
  ['Cada fila és un infant. Quan una família té més d’un fill/a matriculat, hi ha dues maneres d’indicar-ho i totes dues funcionen:'],
  ['  1) Deixa TITULAR, IBAN, DNI i REFERÈNCIA MANDAT en blanc a les files dels germans/es (com a la fila de "Pol Puig Soler" de l’exemple) — s’agrupen amb la família de la fila de sobre.'],
  ['  2) O bé repeteix el mateix IBAN a cada fila — l’aplicació detecta l’IBAN repetit i les agrupa igualment en una sola família.'],
  [''],
  ['La REFERÈNCIA MANDAT ha de ser única per família (és la referència del mandat SEPA signat amb el banc).'],
  ['Esborra les files d’exemple abans de pujar el fitxer real.'],
]

export function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  const sepaSheet = XLSX.utils.aoa_to_sheet([HEADERS, ...EXAMPLE_ROWS])
  sepaSheet['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 28 }, { wch: 30 }, { wch: 12 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, sepaSheet, 'SEPA')

  const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS)
  instructionsSheet['!cols'] = [{ wch: 100 }]
  XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instruccions')

  XLSX.writeFile(wb, 'plantilla_families_AFA.xlsx')
}
