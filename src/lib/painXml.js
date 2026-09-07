import { cleanIban } from './iban.js'
import { sanitizeSepaText, escapeXml } from './sepaCharset.js'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function isoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function isoDateTime(d) {
  return `${isoDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function amountStr(n) {
  return (Math.round(n * 100) / 100).toFixed(2)
}

function bicOrFallback(bic) {
  const clean = String(bic || '').trim().toUpperCase()
  if (clean) return `<BIC>${escapeXml(clean)}</BIC>`
  // Per EU Reg. 260/2012 BIC is optional; when unknown, banks accept "NOTPROVIDED".
  return `<Othr><Id>NOTPROVIDED</Id></Othr>`
}

/**
 * Builds a SEPA Direct Debit Initiation XML (pain.008.001.02 / ISO 20022).
 *
 * @param {Object} params
 * @param {Object} params.creditor - { name, iban, bic, creditorId }
 * @param {string} params.requestedCollectionDate - 'YYYY-MM-DD'
 * @param {string} params.seqType - 'FRST' | 'RCUR' | 'OOFF' | 'FNAL'
 * @param {Array}  params.transactions - [{ endToEndId, debtorName, debtorIban, amount, mandateId, mandateSignatureDate, remittanceInfo }]
 * @param {string} [params.messageId]
 * @param {string} [params.paymentInfoId]
 */
export function buildPain008Xml({
  creditor,
  requestedCollectionDate,
  seqType = 'FRST',
  transactions,
  messageId,
  paymentInfoId,
}) {
  const now = new Date()
  const msgId = sanitizeSepaText(messageId || `AFA-${now.getTime()}`, 35)
  const pmtInfId = sanitizeSepaText(paymentInfoId || `${msgId}-1`, 35)

  const nbOfTxs = transactions.length
  const ctrlSum = amountStr(transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0))

  const creditorName = sanitizeSepaText(creditor.name, 70)
  const creditorIban = cleanIban(creditor.iban)
  const creditorId = sanitizeSepaText(creditor.creditorId, 35)

  const txBlocks = transactions
    .map((t, idx) => {
      const endToEndId = sanitizeSepaText(t.endToEndId || `AFA-${idx + 1}`, 35) || 'NOTPROVIDED'
      const debtorName = sanitizeSepaText(t.debtorName, 70)
      const debtorIban = cleanIban(t.debtorIban)
      const mandateId = sanitizeSepaText(t.mandateId, 35)
      const mandateDate = t.mandateSignatureDate
      const remit = sanitizeSepaText(t.remittanceInfo, 140)
      const amt = amountStr(t.amount)

      return `      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(endToEndId)}</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${amt}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${escapeXml(mandateId)}</MndtId>
            <DtOfSgntr>${escapeXml(mandateDate)}</DtOfSgntr>
            <AmdmntInd>false</AmdmntInd>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>
            <Othr><Id>NOTPROVIDED</Id></Othr>
          </FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>${escapeXml(debtorName)}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${escapeXml(debtorIban)}</IBAN>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(remit)}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${isoDateTime(now)}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(creditorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>CORE</Cd>
        </LclInstrm>
        <SeqTp>${escapeXml(seqType)}</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${escapeXml(requestedCollectionDate)}</ReqdColltnDt>
      <Cdtr>
        <Nm>${escapeXml(creditorName)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${escapeXml(creditorIban)}</IBAN>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          ${bicOrFallback(creditor.bic)}
        </FinInstnId>
      </CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${escapeXml(creditorId)}</Id>
              <SchmeNm>
                <Prtry>SEPA</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>
${txBlocks}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>
`

  return xml
}
