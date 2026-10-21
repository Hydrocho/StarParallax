from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1000,'height':950},device_scale_factor=.5)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8765/');page.locator('#lesson-open').click()
 page.locator('#orbit-time').fill('11.9')
 page.locator('#orbit-play').click()
 page.wait_for_function('Number(document.getElementById("orbit-time").value)<1')
 assert page.locator('#orbit-play').get_attribute('aria-pressed')=='true'
 page.locator('#orbit-play').click()
 stopped=page.locator('#orbit-time').input_value()
 page.wait_for_timeout(300)
 assert page.locator('#orbit-time').input_value()==stopped
 page.locator('#orbit-play').click()
 page.locator('#star-distance').fill('120')
 assert page.locator('#orbit-play').get_attribute('aria-pressed')=='true'
 page.locator('#orbit-time').fill('6')
 assert page.locator('#orbit-play').get_attribute('aria-pressed')=='false'
 page.locator('#orbit-play').click()
 page.keyboard.press('Escape')
 page.locator('#lesson-open').click()
 assert page.locator('#orbit-play').get_attribute('aria-pressed')=='false'
 page.set_viewport_size({'width':390,'height':844})
 page.locator('#orbit-play').scroll_into_view_if_needed()
 button=page.locator('#orbit-play').bounding_box();slider=page.locator('#orbit-time').bounding_box()
 assert button['x']+button['width']<=slider['x'] and slider['x']+slider['width']<=390
 assert not errors,errors
 b.close()
 print('PASS: continuous wrap, pause/resume, live distance control, manual scrub stops, close stops, mobile left-button layout')
