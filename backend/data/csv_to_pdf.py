import pandas as pd
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

def create_pdf(csv_file, pdf_file):
    df = pd.read_csv(csv_file)
    data = [df.columns.tolist()] + df.values.tolist()
    
    doc = SimpleDocTemplate(pdf_file, pagesize=landscape(A4), rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
    elements = []
    
    styles = getSampleStyleSheet()
    title = Paragraph("Seed Products Dataset", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 20))
    
    table_data = []
    for row in data:
        table_row = []
        for cell in row:
            table_row.append(Paragraph(str(cell), styles['Normal']))
        table_data.append(table_row)
        
    col_widths = [150, 60, 200, 200, 150]
    
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.aliceblue),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    
    elements.append(t)
    doc.build(elements)

if __name__ == "__main__":
    create_pdf("seed_products.csv", "seed_products.pdf")
