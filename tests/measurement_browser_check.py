from playwright.sync_api import sync_playwright
from datetime import datetime, timezone, timedelta
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1000,'height':850},device_scale_factor=.7)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('Math.random=()=>0.5')
 page.clock.install();page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1))
 page.goto('http://127.0.0.1:8765/');page.wait_for_function('!document.getElementById("start").disabled')
 page.locator('#start').click();page.clock.run_for(100)
 assert page.locator('#mini-panel').is_hidden()
 def move(key,ms):
  page.locator('#move-right').focus();page.keyboard.down(key);page.clock.run_for(ms);page.keyboard.up(key);page.clock.run_for(100)
 move('KeyD',500)
 assert page.locator('#map-toggle').is_visible()
 scan=page.locator('#map-toggle').bounding_box();left=page.locator('#move-left').bounding_box()
 assert scan['y']+scan['height']<left['y']
 assert abs(scan['x']+scan['width']/2-left['x']-left['width']/2)<2
 page.keyboard.press('ArrowUp');assert page.locator('#mini-content').is_visible()
 target=page.locator('#target-code').inner_text()
 move('KeyD',200);assert '오른쪽' in page.locator('#parallax-hint').inner_text()
 assert page.locator('#charge-guide').is_hidden()
 page.locator('#pause').click();before=page.locator('#parallax-hint').inner_text();page.clock.run_for(1000)
 assert page.locator('#parallax-hint').inner_text()==before
 page.locator('#resume').click()
 move('KeyD',300)
 page.screenshot(path='.preview/scan-crossing.png')
 assert '왼쪽' in page.locator('#parallax-hint').inner_text()
 assert page.locator('#target-code').inner_text()==target
 move('KeyA',1000)
 assert '140 u' in page.locator('#parallax-hint').inner_text(),page.locator('#parallax-hint').inner_text()
 assert '6.54°' in page.locator('#parallax-hint').inner_text()
 assert page.locator('#charge-guide').is_visible()
 assert page.locator('#mini-map').is_hidden()
 assert page.locator('#measurement-top-view').is_visible()
 assert '140 u' in page.locator('#top-view-svg').text_content()
 box=page.locator('#measurement-top-view').bounding_box()
 right=page.locator('#move-right').bounding_box()
 assert box['x']+box['width'] <= right['x']-10
 page.screenshot(path='.preview/auto-scan-desktop.png')
 move('KeyD',500)
 page.locator('#fire').focus();page.keyboard.down('Space');page.clock.run_for(1091);page.keyboard.up('Space');page.clock.run_for(1500)
 assert page.locator('#score').inner_text().startswith('24')
 assert page.locator('#charge-guide').is_hidden()
 page.locator('#pause').click();page.locator('#pause-restart').click();move('KeyD',500)
 page.set_viewport_size({'width':390,'height':844});page.clock.run_for(100)
 page.locator('#map-toggle').click()
 def hold(selector,ms):
  page.locator(selector).hover();page.mouse.down();page.clock.run_for(ms);page.mouse.up();page.clock.run_for(100)
 hold('#move-left',500);assert '오른쪽' in page.locator('#parallax-hint').inner_text()
 hold('#move-right',1000);assert '140 u' in page.locator('#parallax-hint').inner_text()
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 panel=page.locator('#mini-panel').bounding_box();fire=page.locator('#fire').bounding_box()
 assert panel['y']+panel['height']<=fire['y'],(panel,fire)
 box=page.locator('#measurement-top-view').bounding_box()
 for selector in ['#move-right','#fire','.range-panel']:
  other=page.locator(selector).bounding_box()
  assert box['x']+box['width']<=other['x'] or box['y']+box['height']<=other['y'] or box['x']>=other['x']+other['width'] or box['y']>=other['y']+other['height'],(selector,box,other)
 page.screenshot(path='.preview/auto-scan-mobile.png')
 page.keyboard.press('ArrowUp');assert page.locator('#charge-guide').is_hidden()
 assert page.locator('#measurement-top-view').is_hidden()
 assert not errors,errors
 b.close()
 print('PASS: front-only trigger, automatic 16u scan both directions, progress, pause, distance and angle, guided hit, transparent HUD, mobile pointer controls, cancellation')


