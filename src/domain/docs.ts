/** Textos de ayuda (hojas LEER PRIMERO y CRITERIOS de la planilla original). */

export const STEPS = [
  { n: '01', title: 'Responde', text: 'Abre Nueva visita. Selecciona el estamento y el motivo de visita.' },
  { n: '02', title: 'Avanza', text: 'Continúa con la pregunta marcada PENDIENTE. Las preguntas no aplicables se saltan solas.' },
  { n: '03', title: 'Consulta', text: 'El resultado se genera en vivo: actividades, formularios y observaciones sugeridas. Guarda la visita para consultarla después.' },
]

export const FAQ = [
  { q: '¿Puedo cambiar un nombre de actividad?', a: 'Sí. En Administración → Reglas puedes editar el texto que verá el funcionario, o desactivar una regla.' },
  { q: '¿Qué pasa si cambio la edad o motivo?', a: 'Las preguntas que dejan de aplicar se ignoran en el resultado. Se te ofrecerá limpiar esas respuestas.' },
  { q: '¿Esto indica qué debo hacer clínicamente?', a: 'No. Sugiere registros y coordinación; requieren juicio profesional y protocolos MINSAL/locales.' },
]

export const NOTES = [
  'Edad: 0–9 / 10–14 / 15–19 / 20–64 / 65+. TENS sin EMP vigente deriva a EMP a toda edad. CLAP hasta los 20 años (19 incluidos): médico/a, matrón/a o enfermero/a realiza; otros derivan.',
  'Para el tramo 20–64 es obligatorio indicar si tiene exactamente 20 años, pues la indicación de CLAP cambia a los 21.',
  'Tras confirmar que se evaluará dependencia, selecciona la clasificación Barthel (no se ingresa un número libre).',
  'Si la evaluación arroja dependencia severa (20–35), se indican 2 ingresos PADDS según la selección ECICEP. Persona y cuidador llevan la misma condición ECICEP.',
  'Registrar el ingreso del cuidador únicamente cuando exista cuidador, se haya realizado la atención y corresponda el plan de cuidados.',
  'Si se responde NO a ECICEP, se muestra la observación “Solicitar ingreso ECICEP”. Si se responde SÍ, la pregunta final solicita el riesgo G1, G2 o G3 y genera la actividad de control integral correspondiente.',
  'Diabetes o ACV: se habilita exclusivamente si en la pregunta anterior se informa patología cardiovascular.',
]

export const CRITERIA = [
  { area: 'Motivo de visita', question: 'Citación / rescate', output: 'Actividad rescate en domicilio', criterion: 'Registro de rescate solo para la gestión domiciliaria.', origin: 'Borrador', validate: 'Definición y código exactos.' },
  { area: 'Motivo de visita', question: 'Entrega de productos', output: 'Actividad a confirmar', criterion: 'No había código específico en el borrador.', origin: 'Propuesta', validate: 'Código local y respaldo de entrega.' },
  { area: 'Motivo de visita', question: 'Procedimiento', output: 'Actividad domiciliaria', criterion: 'Ajustar al procedimiento realmente ejecutado.', origin: 'Borrador adaptado', validate: 'Subtipo / codificación.' },
  { area: 'VDI', question: 'Dependencia severa', output: 'Plan de cuidados', criterion: 'Si está confirmada, usar actividad de plan correspondiente.', origin: 'Borrador', validate: 'Requisitos de actividad; evitar doble registro.' },
  { area: 'VDI', question: 'Plan de persona vigente', output: 'Elaboración vs actualización', criterion: 'No asumir por número de visitas; comprobar plan vigente.', origin: 'Mejora añadida', validate: 'Periodicidad y criterios institucionales.' },
  { area: 'VDI', question: 'Cuidador y plan vigente', output: 'Plan cuidador', criterion: 'Solo si cuidador identificado y dependencia confirmada.', origin: 'Borrador adaptado', validate: 'Elegibilidad y definición de cuidador.' },
  { area: 'VDI', question: 'Dependencia en estudio', output: 'Barthel y evaluación', criterion: 'Evaluar antes de registrar condición como confirmada.', origin: 'Mejora añadida', validate: 'Proceso para determinar dependencia.' },
  { area: 'VDI', question: 'Zarit del cuidador: 0–16 / 17–20', output: 'Clasificación y orientación en observaciones', criterion: '0–16: sin sobrecarga. 17–20: sobrecarga intensa; sugerir derivación a taller de cuidador o control de salud mental.', origin: 'Solicitud octubre 2026', validate: 'Validar versión del instrumento y puntos de corte; puntajes mayores a 20 quedan fuera de los rangos solicitados.' },
  { area: 'Preventivos', question: 'Edad / vigencia', output: 'Control infantil, CLAP, EMP, EMPAM', criterion: 'TENS sin EMP/EMPAM vigente: derivar a EMP a cualquier edad. Enfermería ≥65 sin vigencia: completar formulario EMP; otros profesionales ≥65: derivar a EMPAM. Con CLAP no vigente y edad ≤20 (incluidos 19): médico/a, matrón/a y enfermería realizan CLAP; otros derivan a CLAP.', origin: 'Solicitud octubre 2026', validate: 'Validar denominación EMP/EMPAM y pertinencia local del CLAP por grupo etario. El tramo 20–64 se desambigua mediante una selección adicional para los 20 años exactos.' },
  { area: 'Cronicidad', question: '¿Patología cardiovascular/DM/ACV, salud mental o demencia?', output: 'Actividades y formularios por ruta; VDI por salud mental según número de visitas', criterion: 'Salud mental o demencia: VDI familia con integrante con problema de salud mental (1.ª, 2.ª o 3.ª+ según visitas previas), además de control y formulario de salud mental.', origin: 'Actualización solicitada octubre 2026', validate: 'Validar codificación; evitar doble VDI y registrar solo prestaciones efectuadas.' },
  { area: 'Compensación', question: '¿CV compensada? ¿Exámenes >3 meses?', output: 'Observación para gestionar exámenes', criterion: 'Solo si está descompensada y exámenes >3 meses: solicitar exámenes y gestionar revisión por profesional.', origin: 'Solicitud actualización octubre 2026', validate: 'Individualizar exámenes y profesional según cuadro clínico.' },
  { area: 'Programas', question: 'ECICEP / NANEAS / ChCC', output: 'Formulario y nota de coordinación', criterion: 'Registrar únicamente prestaciones efectivamente realizadas.', origin: 'Propuesta', validate: 'Protocolos y formularios del programa.' },
  { area: 'Vacunación', question: 'Esquema no vigente', output: 'Observación coordinación', criterion: 'Derivar/coordinar la actualización de vacunas.', origin: 'Borrador', validate: 'Indicaciones y calendario vigente.' },
  { area: 'Visitas previas', question: '0, 1, 2, 3+ visitas integrales previas desde enero', output: '0→primera; 1→segunda; 2+→tercera o más VDI por salud mental', criterion: 'El número de visitas previas define el tramo de VDI familiar con integrante con problema de salud mental; no define por sí mismo el tipo de plan de cuidados.', origin: 'Borrador adaptado', validate: 'Recuento y fuente oficial de visitas.' },
]

export const WARNINGS = [
  'Las actividades y textos propuestos no se deben interpretar como códigos oficiales MINSAL ni como orden clínica.',
  'PADSS se conserva como fue escrito en el borrador; confirmar nombre exacto y disponibilidad en el sistema local.',
  'Para Zarit se aplican únicamente los tramos solicitados: 0–16 «Sin sobrecarga» y 17–20 «Sobrecarga intensa». Otros puntajes requieren revisar instrumento, versión y criterios locales.',
  'El Barthel se registra como valor 0–100, pero su puntuación no define automáticamente la clasificación ni una actividad por sí sola.',
  'Los controles preventivos no vigentes generan recomendaciones; su ejecución depende del profesional habilitado, indicación y contexto.',
  'Si el motivo no es visita domiciliaria integral, el cuestionario omite las preguntas de cronicidad/dependencia y propone registro relativo al motivo.',
  'Los textos se modifican desde Administración. Para cambiar condiciones lógicas, se necesita editar src/domain/rules.ts y correr las pruebas.',
  'La actividad «Rescate de pacientes inasistentes - Telefónico - Desde el establecimiento» fue excluida del flujo domiciliario porque corresponde a una gestión telefónica realizada desde el establecimiento. Si se desea incluir, conviene crear un motivo diferenciado.',
  'Si hay dependencia severa confirmada previamente se solicita «programa dependencia, padds y cpu». Si se evalúa dependencia y Barthel resulta 20–35 (dependencia severa), se indican «Zarit abreviado» y «programa dependencia, padds y cpu».',
]
