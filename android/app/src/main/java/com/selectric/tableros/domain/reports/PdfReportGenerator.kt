package com.selectric.tableros.domain.reports

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import com.selectric.tableros.data.remote.dto.Tablero
import java.io.File
import java.io.FileOutputStream

class PdfReportGenerator(private val context: Context) {

    fun generateTableroPdf(tablero: Tablero): File? {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4
        val page = pdfDocument.startPage(pageInfo)
        val canvas = page.canvas

        val titlePaint = Paint().apply {
            color = Color.BLACK
            textSize = 20f
            isFakeBoldText = true
        }

        val textPaint = Paint().apply {
            color = Color.DKGRAY
            textSize = 12f
        }

        canvas.drawText("Informe Técnico - Tablero Eléctrico Selectric", 40f, 50f, titlePaint)
        canvas.drawText("Nombre del Tablero: ${tablero.nombre}", 40f, 90f, textPaint)
        canvas.drawText("Capacidad: ${tablero.maxPolos} Polos", 40f, 110f, textPaint)
        canvas.drawText("Tensión: ${tablero.tension ?: "N/D"}", 40f, 130f, textPaint)
        canvas.drawText("Fases: ${tablero.fases}Ф", 40f, 150f, textPaint)
        canvas.drawText("Ubicación: ${tablero.ubicacion ?: "N/D"}", 40f, 170f, textPaint)

        canvas.drawText("Circuitos Registrados (${tablero.circuitos.size}):", 40f, 210f, titlePaint)

        var y = 240f
        tablero.circuitos.forEach { c ->
            canvas.drawText("Polo #${c.posicionPolo} (${c.numPolos}P): ${c.descripcion ?: "Sin desc."} - ${c.amperaje ?: 20.0}A [${c.estado}]", 40f, y, textPaint)
            y += 20f
        }

        pdfDocument.finishPage(page)

        val file = File(context.cacheDir, "informe_tablero_${tablero.id}.pdf")
        return try {
            pdfDocument.writeTo(FileOutputStream(file))
            pdfDocument.close()
            file
        } catch (e: Exception) {
            pdfDocument.close()
            null
        }
    }
}
