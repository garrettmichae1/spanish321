"""Explicit editorial corrections and additional accepted variants.
Run after scripts/authoring/course*.py. No language-model or paid service is used.
"""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
variants={
'c3-u05-q02':['en que','en la que','en la cual'],
'c3-u05-q03':['la que','la cual'],
'c3-u05-q04':['las que','las cuales'],
'c3-u06-q02':['¿Puede darme un ejemplo?','¿Podría dar un ejemplo?','¿Podría darme un ejemplo?'],
'c3-u11-q03':['Lo que quiero decir es…'],
'c3-u11-q05':['aunque','sin embargo'],
'c4-u06-q03':['Mientras que'],
'c4-u07-q01':['No obstante','Aun así','Ahora bien'],
'c4-u07-q02':['aun así','incluso así'],
'c4-u09-q04':['en','acerca de'],
'c4-u11-q01':['current version'],
'c4-u11-q02':['to attend'],
'c5-u01-q02':['lapsus','error'],
'c5-u02-q06':['condicionante'],
'c5-u03-q06':['ámbito'],
'c5-u04-q02':['remitirse'],
'c5-u04-q05':['disensos'],
'c5-u04-q06':['mantener','preservar'],
'c5-u05-q01':['finalidad'],
'c5-u07-q03':['determinante'],
'c5-u07-q06':['dividir'],
'c5-u08-q01':['suscitar'],
'c5-u08-q03':['asistir'],
'c5-u08-q05':['verificarse','confirmarse'],
'c5-u08-q06':['impacto'],
'c5-u10-q02':['pistas'],
'c5-u10-q04':['situación'],
'c5-u10-q06':['sustento','respaldo'],
'c5-u11-q05':['clarificar'],
}
# Constrain prompts where numerous expressions would otherwise be equally valid.
prompts={
'c3-u01-q06':'Write the sequence repair phrase meaning “Before that”, beginning with Antes.',
'c3-u03-q05':'In “No contesta; estará trabajando”, choose the meaning: current conjecture or confirmed future schedule. Copy one of those English labels.',
'c3-u11-q03':'Write the reformulation phrase “What I mean is…”, beginning with Lo que.',
'c4-u07-q02':'Write the two-word connector meaning “even so”, beginning with aun.',
'c4-u10-q04':'Complete: El equipo tendría que ___ su disponibilidad. (confirm)',
'c4-u11-q05':'Complete: Quedo ___ de su respuesta. (awaiting, beginning with p)',
'c5-u04-q02':'Complete: Cada afirmación debe poder ___ a una fuente. (be traced; use rastrear with se)',
'c5-u08-q01':'Complete the collocation meaning “raise a question”, using plantear: ___ una duda.',
'c5-u08-q03':'Give the neutral everyday verb meaning of echar una mano, beginning with a and ending in -ar.',
'c5-u10-q04':'Complete: La ironía puede contrastar sentido literal y ___. (context)',
'c5-u12-q03':'Complete: La evaluación de un compañero debe identificarse como evaluación ___. (give a Spanish phrase meaning peer evaluation)',
}
# Make person/tense constraints explicit where an isolated cloze was ambiguous.
prompts.update({
 'c2-u04-q01':'Use an indirect-object pronoun: ___ doy el libro a Ana.',
 'c2-u04-q03':'Use an indirect-object pronoun: ___ envío una carta a mis colegas.',
 'c2-u11-q05':'Complete the present perfect: Yo ___ visto la película. (haber)',
 'c2-u11-q06':'Complete the present perfect: Todavía no lo ___ hecho. (haber, nosotros)',
 'c3-u02-q04':'Complete the past perfect: Yo ___ terminado cuando llamaste. (haber)',
 'c3-u06-q01':'Complete with Según (according to) or Contra (against), based on attribution: ___ la coordinadora, el acceso mejoró.',
 'c3-u06-q03':'Complete the past perfect: Antes de abrir la sala, ya se ___ reunido varias veces. (haber, ellos)',
 'c3-u09-q01':'Complete: No creo que el plan ___ suficiente. (ser, present subjunctive)',
 'c4-u04-q01':'Complete the present perfect subjunctive: Me alegra que tú ___ venido. (haber)',
 'c4-u05-q05':'Complete: Dijo que él ___ en Quito. (vivir, present indicative; current residence explicitly maintained)',
})
variants.update({
 'c3-u11-q06':['Según'],
 'c4-u05-q01':['el día siguiente','un día después'],
 'c5-u07-q03':['determinante','clave','crucial'],
})
# Remove variants incompatible with the newly narrowed instruction.
for key in ['c4-u07-q02','c5-u04-q02','c5-u08-q01','c5-u08-q03','c5-u10-q04']:
 variants.pop(key,None)
for path in sorted((root/'content/units').glob('*.json')):
 u=json.loads(path.read_text())
 for q in u['quiz']:
  if q['id'] in prompts:q['prompt']=prompts[q['id']]
  for alternative in variants.get(q['id'],[]):
   if alternative not in q['answers']:q['answers'].append(alternative)
 path.write_text(json.dumps(u,ensure_ascii=False,indent=2)+'\n')
