const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  let resources = [];
  let transferSize = 0;

  // Capture network requests
  page.on('response', async (response) => {
    try {
      const buffer = await response.buffer();
      transferSize += buffer.length;
      resources.push({
        url: response.url(),
        status: response.status(),
        size: buffer.length,
        type: response.request().resourceType()
      });
    } catch (e) {
      // Some responses may not have content
    }
  });

  console.log('\n=== PERFORMANCE METRICS ===\n');
  const startTime = Date.now();
  
  try {
    await page.goto('http://localhost:8081/', { waitUntil: 'networkidle2', timeout: 30000 });
    const loadTime = Date.now() - startTime;

    // Get performance metrics from the browser
    const metrics = await page.metrics();
    const perfData = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paints = performance.getEntriesByType('paint');
      const fcp = paints.find(p => p.name === 'first-contentful-paint');
      
      return {
        fcp: fcp ? fcp.startTime : null,
        loadEventEnd: nav ? nav.loadEventEnd : null,
        domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
        navigationStart: nav ? nav.navigationStart : null
      };
    });

    console.log('Page Load Time (Total Navigation): ' + loadTime + 'ms');
    console.log('First Contentful Paint (FCP): ' + (perfData.fcp ? Math.round(perfData.fcp) : 'N/A') + 'ms');
    console.log('DOM Content Loaded: ' + (perfData.domContentLoaded ? Math.round(perfData.domContentLoaded) : 'N/A') + 'ms');
    console.log('Load Event End: ' + (perfData.loadEventEnd ? Math.round(perfData.loadEventEnd) : 'N/A') + 'ms');
    console.log('\nTotal Resources Loaded: ' + resources.length);
    console.log('Total Transfer Size: ' + (transferSize / 1024).toFixed(2) + ' KB');
    
    console.log('\n--- Performance Metrics ---');
    console.log('✓ Page Load Time: ' + (loadTime < 3000 ? '✓ GOOD (' + loadTime + 'ms)' : '✗ OVER (3000ms) (' + loadTime + 'ms - ' + (loadTime - 3000) + 'ms over)'));
    console.log('✓ FCP: ' + (perfData.fcp && perfData.fcp < 3000 ? '✓ GOOD (' + Math.round(perfData.fcp) + 'ms)' : '✗ OVER (3000ms) (' + Math.round(perfData.fcp) + 'ms)'));
    
    // Resource breakdown
    const resourcesByType = {};
    resources.forEach(r => {
      resourcesByType[r.type] = (resourcesByType[r.type] || 0) + 1;
    });
    console.log('\n--- Resource Breakdown ---');
    Object.entries(resourcesByType).forEach(([type, count]) => {
      console.log(type + ': ' + count);
    });

  } catch (error) {
    console.error('Error measuring performance:', error.message);
  }

  await browser.close();
})();
