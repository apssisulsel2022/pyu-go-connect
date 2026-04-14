import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('\n📊 COMPREHENSIVE PERFORMANCE TEST\n');
    
    const navigationStart = Date.now();
    const response = await page.goto('http://localhost:8082', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    const navigationTime = Date.now() - navigationStart;
    
    // Get detailed timing
    const timings = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        resourceCount: resources.length,
        totalTransferSize: Math.round(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024),
      };
    });
    
    console.log('✅ METRICS:\n');
    console.log(`  ⏱️  Navigation Time:          ${navigationTime}ms`);
    console.log(`  ⏱️  First Paint:              ${timings.firstPaint?.toFixed(0) || 'N/A'}ms`);
    console.log(`  ⏱️  First Contentful Paint:  ${timings.firstContentfulPaint?.toFixed(0) || 'N/A'}ms`);
    console.log(`  ⏱️  DOM Content Loaded:      ${timings.domContentLoaded?.toFixed(0) || 'N/A'}ms`);
    console.log(`  📦 Total Resources:          ${timings.resourceCount}`);
    console.log(`  📊 Total Transfer Size:      ${timings.totalTransferSize}KB\n`);
    
    const totalTime = Math.max(navigationTime, timings.firstContentfulPaint || 0);
    if (totalTime < 3000) {
      console.log(`✨ SUCCESS: ${totalTime.toFixed(0)}ms < 3000ms ✨\n`);
      console.log(`🎉 PERFORMANCE TARGET ACHIEVED!\n`);
    } else {
      console.log(`⚠️  Time: ${totalTime}ms (target: <3000ms)\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
