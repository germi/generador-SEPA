# Generador de remeses SEPA — AFA

Aplicació web (100% frontend, sense backend ni servidor) per generar el fitxer de
càrrecs directes SEPA (**pain.008.001.02**, XML ISO 20022) a partir d'un Excel de
famílies, llest per pujar a **BSOnline** (Banc Sabadell) o a qualsevol altre banc.

Tot el processament passa al navegador: l'Excel, els IBAN i els DNI **no surten mai
del teu ordinador** (no hi ha cap crida de xarxa ni cap servidor implicat).

Versió publicada, llesta per fer servir sense instal·lar res: https://generador-sepa.netlify.app/

## Ús

1. `npm install`
2. `npm run dev` (o `npm run build` + serveix la carpeta `dist/` en qualsevol hosting estàtic)
3. A l'aplicació:
   1. Puja l'Excel amb un full anomenat **"SEPA"** amb columnes `CURS`, `INFANT`,
      `TITULAR`, `IBAN`, `DNI`, `REFERÈNCIA MANDAT`. Els fills/es d'una mateixa
      família es detecten automàticament (files sense referència de mandat pròpia
      es consideren germans/es de la família anterior).
   2. Omple les dades del creditor (nom de l'AFA, identificador de creditor SEPA,
      IBAN, BIC opcional), l'import de la quota, el concepte, la data de cobrament
      i la data de signatura del mandat. Aquestes dades es desen només al teu
      navegador (`localStorage`) perquè no les hagis de tornar a escriure cada any.
   3. Revisa la taula: pots desmarcar famílies, corregir IBAN/imports/dates fila a
      fila. Les files amb IBAN invàlid o sense referència de mandat es desmarquen
      automàticament i cal revisar-les.
   4. Descarrega el fitxer `.xml` i puja'l directament a BSOnline (Adeudos Directos
      / Càrrecs Directes SEPA → esquema CORE).

## Notes importants

- El fitxer es genera sempre amb `SeqTp = FRST` (primer cobrament), tal com es
  gestiona aquesta remesa any rere any a l'AFA — no s'utilitza el mode recurrent
  (`RCUR`) del banc.
- El "identificador de creditor SEPA" (`CdtrSchmeId`) és el codi que el Banc
  Sabadell us va assignar en donar-vos d'alta com a creditor per fer càrrecs
  directes; no és el vostre NIF ni el DNI de ningú.
- El BIC és opcional (des del 2016 no és obligatori per a pagaments SEPA dins la
  UE); si es deixa buit, el fitxer inclou el codi estàndard `NOTPROVIDED`.
- Els noms i conceptes es filtren automàticament al joc de caràcters llatí que
  exigeixen els fitxers SEPA (lletres, xifres i uns pocs símbols); alguns
  caràcters especials (com `ª`) es poden eliminar en aquest procés.
- Verifica sempre les dates: per un primer cobrament (FRST) el banc sol requerir
  uns dies hàbils de marge abans de la data de cobrament sol·licitada.

## Codi font

Codi obert, disponible a GitHub: https://github.com/germi/generador-SEPA

## Stack

Vite + Vue 3 + Tailwind CSS 4 + [SheetJS (`xlsx`)](https://github.com/SheetJS/sheetjs)
per llegir l'Excel al navegador. Sense dependències de servidor.
