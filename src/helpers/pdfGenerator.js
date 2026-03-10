const PDFDocument = require('pdfkit')

const pdfGenerator = {}

function buildPdf (buildFn) {
  return new Promise(function (resolve, reject) {
    const doc = new PDFDocument({ margin: 50 })
    const chunks = []

    doc.on('data', function (chunk) { chunks.push(chunk) })
    doc.on('end', function () { resolve(Buffer.concat(chunks)) })
    doc.on('error', function (err) { reject(err) })

    buildFn(doc)
    doc.end()
  })
}

pdfGenerator.generateHandoverPdf = async function (groupName, tickets, res) {
  const now = new Date().toISOString().split('T')[0]

  try {
    const buffer = await buildPdf(function (doc) {
      doc.fontSize(20).text('Übergabe-Bericht: ' + groupName, { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(10).text('Erstellt am: ' + now, { align: 'center' })
      doc.moveDown()
      doc.fontSize(12).text('Offene Tickets (' + tickets.length + ')', { underline: true })
      doc.moveDown(0.5)

      if (tickets.length === 0) {
        doc.fontSize(10).text('Keine offenen Tickets.')
      } else {
        const headers = ['#', 'Betreff', 'Status', 'Priorität', 'Datum']
        const colWidths = [40, 200, 80, 80, 80]
        drawTableRow(doc, headers, colWidths, true)

        for (let i = 0; i < tickets.length; i++) {
          const t = tickets[i]
          const dateStr = t.created ? new Date(t.created).toISOString().split('T')[0] : '-'
          const row = [
            String(t.uid),
            truncate(t.subject, 35),
            t.status || '-',
            t.priority || '-',
            dateStr
          ]
          drawTableRow(doc, row, colWidths, false)
        }
      }
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="handover-' + now + '.pdf"')
    res.setHeader('Content-Length', buffer.length)
    res.end(buffer)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

pdfGenerator.generateSitzungPdf = async function (reportData, res) {
  const now = new Date().toISOString().split('T')[0]
  const sinceStr = new Date(reportData.since).toISOString().split('T')[0]

  try {
    const buffer = await buildPdf(function (doc) {
      doc.fontSize(20).text('OV-Sitzungs-Bericht', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(10).text('Zeitraum: ' + sinceStr + ' bis ' + now, { align: 'center' })
      doc.moveDown()

      doc.fontSize(12).text('Zusammenfassung', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10).text('Neue Tickets: ' + reportData.summary.totalOpened)
      doc.fontSize(10).text('Geschlossene Tickets: ' + reportData.summary.totalClosed)
      doc.moveDown()

      const headers = ['#', 'Betreff', 'Status', 'Priorität', 'Zugewiesen']
      const colWidths = [40, 180, 80, 80, 100]

      doc.fontSize(12).text('Neue Tickets', { underline: true })
      doc.moveDown(0.5)

      const opened = reportData.opened
      for (const groupName in opened) {
        if (!Object.prototype.hasOwnProperty.call(opened, groupName)) continue
        doc.fontSize(11).text(groupName + ' (' + opened[groupName].length + ')')
        doc.moveDown(0.3)
        drawTableRow(doc, headers, colWidths, true)
        for (let i = 0; i < opened[groupName].length; i++) {
          const t = opened[groupName][i]
          const row = [String(t.uid), truncate(t.subject, 30), t.status || '-', t.priority || '-', t.assignee || '-']
          drawTableRow(doc, row, colWidths, false)
        }
        doc.moveDown(0.5)
      }

      doc.moveDown()
      doc.fontSize(12).text('Geschlossene Tickets', { underline: true })
      doc.moveDown(0.5)

      const closed = reportData.closed
      for (const groupName in closed) {
        if (!Object.prototype.hasOwnProperty.call(closed, groupName)) continue
        doc.fontSize(11).text(groupName + ' (' + closed[groupName].length + ')')
        doc.moveDown(0.3)
        drawTableRow(doc, headers, colWidths, true)
        for (let i = 0; i < closed[groupName].length; i++) {
          const t = closed[groupName][i]
          const row = [String(t.uid), truncate(t.subject, 30), t.status || '-', t.priority || '-', t.assignee || '-']
          drawTableRow(doc, row, colWidths, false)
        }
        doc.moveDown(0.5)
      }
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="sitzung-' + now + '.pdf"')
    res.setHeader('Content-Length', buffer.length)
    res.end(buffer)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

pdfGenerator.generateAssetListPdf = async function (assets, res) {
  const now = new Date().toISOString().split('T')[0]

  try {
    const buffer = await buildPdf(function (doc) {
      doc.fontSize(20).text('Inventarliste', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(10).text('Erstellt am: ' + now, { align: 'center' })
      doc.moveDown()

      const headers = ['AssetTag', 'Name', 'Kategorie', 'Standort']
      const colWidths = [120, 150, 100, 120]
      drawTableRow(doc, headers, colWidths, true)

      for (let i = 0; i < assets.length; i++) {
        const a = assets[i]
        const row = [
          a.assetTag || '-',
          truncate(a.name || '-', 25),
          a.category || '-',
          a.location || '-'
        ]
        drawTableRow(doc, row, colWidths, false)
      }
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="inventarliste-' + now + '.pdf"')
    res.setHeader('Content-Length', buffer.length)
    res.end(buffer)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

function truncate (str, maxLen) {
  if (!str) return '-'
  if (str.length <= maxLen) return str
  return str.substring(0, maxLen - 3) + '...'
}

function drawTableRow (doc, cells, colWidths, isHeader) {
  const pageBottom = doc.page.height - doc.page.margins.bottom
  if (doc.y + 20 > pageBottom) {
    doc.addPage()
  }

  const startX = doc.page.margins.left
  const y = doc.y

  if (isHeader) {
    doc.font('Helvetica-Bold').fontSize(9)
  } else {
    doc.font('Helvetica').fontSize(8)
  }

  let x = startX
  for (let i = 0; i < cells.length; i++) {
    doc.text(String(cells[i] || '-'), x, y, { width: colWidths[i], ellipsis: true, lineBreak: false })
    x += colWidths[i]
  }

  doc.x = startX
  doc.y = y + 15

  if (isHeader) {
    const lineEnd = startX + colWidths.reduce(function (a, b) { return a + b }, 0)
    doc.moveTo(startX, doc.y).lineTo(lineEnd, doc.y).stroke()
    doc.y += 5
  }
}

module.exports = pdfGenerator
