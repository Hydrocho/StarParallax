from playwright.sync_api import sync_playwright
from datetime import datetime, timezone, timedelta
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1000,'height':800},device_scale_factor=.5)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('Math.random = () => 0.5;')
 page.clock.install()
 page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1))
 page.goto('http://127.0.0.1:8765/')
 page.wait_for_function('!document.getElementById("start").disabled')
 page.locator('#start').click()
 page.locator('#move-right').focus();page.keyboard.down('KeyD');page.clock.run_for(500);page.keyboard.up('KeyD')
 page.locator('#fire').focus();page.keyboard.down('Space');page.clock.run_for(1091);page.keyboard.up('Space')
 page.clock.run_for(1500)
 assert page.locator('#score').inner_text().startswith('01'),page.locator('#score').inner_text()
 assert page.locator('#fire').is_enabled()
 assert page.locator('#result-card').is_hidden()
 page.locator('#pause').click();before=page.locator('#timer').inner_text();page.clock.fast_forward(10000)
 assert page.locator('#timer').inner_text()==before
 page.locator('#resume').click();page.clock.fast_forward(61000)
 assert page.locator('#result-card').is_visible()
 assert page.locator('#timer').inner_text()=='00:00'
 assert page.locator('#fire').is_disabled()
 assert '파괴 1개' in page.locator('#result-stats').inner_text()
 page.locator('#replay').click();page.clock.run_for(100)
 assert page.locator('#score').inner_text().startswith('00')
 assert page.locator('#timer').inner_text()=='01:00'
 page.locator('#pause').click()
 page.screenshot(path='.preview/timed-desktop.png')
 page.set_viewport_size({'width':390,'height':844});page.locator('#resume').click();page.clock.run_for(100)
 page.screenshot(path='.preview/timed-mobile.png')
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 assert not errors, errors
 b.close()
 print('PASS: real charge/hit/continued play, paused timer, 60-second finish, disabled firing, replay, mobile HUD, no page errors')
