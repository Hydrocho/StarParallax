from playwright.sync_api import sync_playwright
from datetime import datetime, timezone, timedelta
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1000,'height':850},device_scale_factor=.5)
 errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
 page.clock.install(); page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1))
 page.goto('http://127.0.0.1:8765/')
 page.wait_for_function('!document.getElementById("start").disabled')
 page.locator('#records-open').click(); assert page.locator('#records-empty').is_visible()
 page.locator('#records-dialog .primary').click(); page.locator('#start').click()
 page.clock.run_for(1000)
 page.locator('#records-open').click(); before=page.locator('#timer').inner_text()
 page.clock.fast_forward(10000); assert page.locator('#timer').inner_text()==before
 page.locator('#records-dialog .primary').click(); page.clock.fast_forward(61000)
 assert page.locator('#result-card').is_visible()
 assert page.evaluate('JSON.parse(localStorage.getItem("star-parallax.daily-top5.v2")).records.length')==1
 page.clock.run_for(500)
 assert page.evaluate('JSON.parse(localStorage.getItem("star-parallax.daily-top5.v2")).records.length')==1
 page.locator('#result-records').click(); assert page.locator('#records-list li').count()==1
 assert page.locator('#records-list strong').inner_text()=='0점'
 page.reload(); page.locator('#records-open').click(); assert page.locator('#records-list li').count()==1
 for width in [1000,768,600,390,320]:
  page.set_viewport_size({'width':width,'height':850})
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  box=page.locator('#records-dialog').bounding_box(); assert box['x']>=0 and box['x']+box['width']<=width
  page.locator('#records-dialog .primary').click()
  credit=page.locator('.brand-credit').bounding_box(); actions=page.locator('.top-actions').bounding_box()
  assert credit['x']+credit['width']<=actions['x'] or credit['y']+credit['height']<=actions['y']
  page.locator('#records-open').click()
 page.screenshot(path='.preview/records-mobile.png')
 assert not errors,errors
 b.close()
 print('PASS: empty records, pause/resume, one save per completed round, reload persistence, mobile modal and header, no browser errors')
