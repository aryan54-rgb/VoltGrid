"""Add the three-page functionality appendix to the formatted SEML PDF."""

from io import BytesIO
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / 'VoltGrid_SEML_Report_Formatted.pdf'
SHOTS = ROOT / 'screenshots'
PAGE_W, PAGE_H = 612, 792  # Match the existing report pages.
IMAGE_X, IMAGE_W = 81, 450


def overlay_pdf(draw):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H))
    draw(c)
    c.save()
    buffer.seek(0)
    return PdfReader(buffer).pages[0]


def draw_index_entry(c):
    # Continue the existing index table, directly under chapter 6.
    left, first, second, right = 107.5, 166.5, 436, 505
    bottom, top = 71, 95
    c.setStrokeColorRGB(0.25, 0.25, 0.25)
    c.setLineWidth(0.45)
    c.rect(left, bottom, right - left, top - bottom, stroke=1, fill=0)
    for x in (first, second):
        c.line(x, bottom, x, top)
    c.setFillColorRGB(0, 0, 0)
    c.setFont('Times-Bold', 9)
    c.drawCentredString((left + first) / 2, 79, '7')
    c.drawString(first + 5, 79, 'Project Functionality Screenshots')
    c.setFont('Times-Roman', 9)
    c.drawCentredString((second + right) / 2, 79, '13-15')


def page_header(c, section):
    c.setFillColorRGB(0, 0, 0)
    c.setFont('Times-Bold', 16)
    c.drawCentredString(PAGE_W / 2, 736, 'CHAPTER 7: PROJECT FUNCTIONALITY SCREENSHOTS')
    c.setFont('Times-Bold', 14)
    c.drawString(81, 698, section)
    c.setFont('Helvetica', 8)
    c.drawString(56, 47, 'SEML Laboratory')


def figure(c, filename, top, caption):
    path = SHOTS / filename
    with Image.open(path) as im:
        height = IMAGE_W * im.height / im.width
    bottom = top - height
    c.drawImage(str(path), IMAGE_X, bottom, IMAGE_W, height, preserveAspectRatio=True)
    c.setFont('Times-Roman', 10)
    c.drawCentredString(PAGE_W / 2, bottom - 15, caption)
    return bottom - 15


def appendix_page(section, figures, note):
    def draw(c):
        page_header(c, section)
        c.setFont('Times-Roman', 10)
        c.drawString(81, 676, 'Representative interface captures from project test data.')
        for filename, top, caption in figures:
            figure(c, filename, top, caption)
        if note:
            c.setFont('Times-Italic', 10)
            for index, line in enumerate(note):
                c.drawString(81, 307 - index * 18, line)
    return overlay_pdf(draw)


reader = PdfReader(REPORT)
source_pages = list(reader.pages)
if len(source_pages) >= 18 and 'CHAPTER 7: PROJECT FUNCTIONALITY SCREENSHOTS' in (source_pages[-1].extract_text() or ''):
    source_pages = source_pages[:-3]
if len(source_pages) != 15:
    raise RuntimeError(f'Expected 15 original pages, found {len(source_pages)}')

if 'Project Functionality Screenshots' not in (source_pages[2].extract_text() or ''):
    source_pages[2].merge_page(overlay_pdf(draw_index_entry))
appendix = [
    appendix_page('7.1 Driver: Station Discovery and Booking', [
        ('appendix_driver_stations.jpg', 661, 'Figure 7.1  Driver station search, map, and availability'),
        ('appendix_driver_booking.jpg', 337, 'Figure 7.2  Charging slot booking flow'),
    ], ''),
    appendix_page('7.2 Operator: Station and Connector Management', [
        ('appendix_operator_stations.jpg', 661, 'Figure 7.3  Station management and location view'),
        ('appendix_operator_connectors.jpg', 342, 'Figure 7.4  Connector status and availability board'),
    ], ''),
    appendix_page('7.3 Operator: Kiosk Terminal Simulation', [
        ('appendix_kiosk.jpg', 650, 'Figure 7.5  Kiosk telemetry and charging state controls'),
    ], (
        'The kiosk is a software simulator; no physical charger is connected.',
        'It models cable, session, power, and fault-state transitions.',
    )),
]

writer = PdfWriter()
for page in [*source_pages, *appendix]:
    writer.add_page(page)
output = REPORT.with_suffix('.appendix.pdf')
with output.open('wb') as handle:
    writer.write(handle)
output.replace(REPORT)
print(f'{REPORT} ({len(writer.pages)} pages)')
