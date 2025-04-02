const puppeteer = require('puppeteer');

async function generatePDF() {
  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create new page
    const page = await browser.newPage();

    // Set viewport to A4 size
    await page.setViewport({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      deviceScaleFactor: 2, // For better quality
    });

    // Navigate to the CV page
    await page.goto('http://localhost:4321/cv', {
      waitUntil: 'networkidle0',
    });

    // Wait for the content to be fully loaded
    await page.waitForSelector('.sm\\:flex-row');

    // Generate PDF
    await page.pdf({
      path: 'public/cv.pdf',
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      },
      // preferCSSPageSize: true,
      displayHeaderFooter: false,
      scale: 0.72
    });

    console.log('PDF generated successfully!');
    await browser.close();
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

generatePDF(); 