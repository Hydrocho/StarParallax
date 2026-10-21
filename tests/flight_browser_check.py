from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / '.preview'
out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=0.6)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda r: errors.append(r.url) if r.status >= 400 else None)
    page.goto('http://127.0.0.1:8765/')
    page.wait_for_function("!document.querySelector('#start').disabled")
    page.locator('#start').click()
    page.locator('#move-left').focus()
    page.keyboard.down('KeyA')
    page.wait_for_function("parseFloat(document.querySelector('#position').textContent) < -7", timeout=30000)
    page.keyboard.up('KeyA')
    assert float(page.locator('#position').inner_text()) < -1
    fire_box = page.locator('#fire').bounding_box()
    page.mouse.move(fire_box['x'] + 20, fire_box['y'] + 20)
    page.mouse.down()
    page.wait_for_timeout(600)
    assert page.locator('#fire').is_enabled()  # Holding must not launch.
    assert float(page.locator('#charge-meter').get_attribute('value')) > 20
    page.mouse.up()
    assert page.locator('#fire').is_disabled()
    page.wait_for_function("!document.querySelector('#fire').disabled", timeout=15000)
    page.screenshot(path=str(out / 'flight-desktop.png'))
    # A long keyboard hold caps without auto-launching; pause cancels the charge.
    page.locator('#fire').focus()
    page.keyboard.down('Space')
    page.wait_for_function("document.querySelector('#charge-meter').value === 240")
    assert page.locator('#fire').is_enabled()
    page.keyboard.press('KeyP')
    page.keyboard.up('Space')
    assert page.locator('#pause-card').is_visible()
    page.locator('#resume').click()
    assert page.locator('#fire').is_enabled()
    assert '비행 중' not in page.locator('#bomb-status').inner_text()
    page.locator('#pause').click()
    assert page.locator('#pause-card').is_visible()
    position = page.locator('#position').inner_text()
    page.keyboard.down('KeyD'); page.wait_for_timeout(200); page.keyboard.up('KeyD')
    assert page.locator('#position').inner_text() == position
    page.locator('#resume').click()
    page.locator('#help').click()
    assert page.locator('#guide-dialog').is_visible()
    page.keyboard.press('Escape')
    assert not page.locator('#pause-card').is_visible()
    page.wait_for_function("!document.querySelector('#fire').disabled")
    page.locator('#lesson-open').click()
    page.locator('#orbit-time').fill('6')
    assert '반대편' in page.locator('#orbit-month').inner_text()
    page.keyboard.press('Escape')
    assert page.locator('#mini-content').is_hidden()
    page.locator('#map-toggle').click()
    assert page.locator('#mini-content').is_visible()
    page.locator('#map-toggle').click()
    assert page.locator('#mini-content').is_hidden()
    for width, height in [(390, 844), (844, 390)]:
        page.set_viewport_size({'width': width, 'height': height})
        page.wait_for_timeout(150)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        for selector in ['#move-left', '#move-right', '#fire', '#charge-meter']:
            box = page.locator(selector).bounding_box()
            assert box['x'] >= 0 and box['y'] >= 0 and box['x'] + box['width'] <= width + 1 and box['y'] + box['height'] <= height + 1, (selector, box)
        page.screenshot(path=str(out / f'flight-{width}.png'))
    page.locator('#pause').click()
    page.locator('#pause-restart').click()
    assert page.locator('#score').inner_text().startswith('00')
    assert page.locator('#position').inner_text() == '+0.0'
    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=0.6, has_touch=True, is_mobile=True)
    touch = mobile.new_page()
    touch.on('pageerror', lambda e: errors.append(str(e)))
    touch.goto('http://127.0.0.1:8765/')
    touch.wait_for_function("!document.querySelector('#start').disabled")
    touch.locator('#start').tap()
    left = touch.locator('#move-left').bounding_box()
    fire = touch.locator('#fire').bounding_box()
    a = {'x': left['x'] + left['width']/2, 'y': left['y'] + left['height']/2, 'id': 1}
    b = {'x': fire['x'] + fire['width']/2, 'y': fire['y'] + fire['height']/2, 'id': 2}
    cdp = mobile.new_cdp_session(touch)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [a]})
    touch.wait_for_timeout(250)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [a, b]})
    touch.wait_for_timeout(350)
    assert touch.locator('#fire').is_enabled()
    # CDP touchEnd lists the finger being released, not the remaining fingers.
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [b]})
    touch.wait_for_timeout(100)
    assert touch.locator('#fire').is_disabled()
    assert float(touch.locator('#position').inner_text()) < 0
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    touch.wait_for_timeout(100)
    stopped = touch.locator('#position').inner_text()
    touch.wait_for_timeout(250)
    assert touch.locator('#position').inner_text() == stopped
    mobile.close()
    blocked = browser.new_page()
    blocked.add_init_script('HTMLCanvasElement.prototype.getContext = () => null;')
    blocked.goto('http://127.0.0.1:8765/')
    blocked.locator('#scene-error').wait_for(state='visible')
    assert blocked.locator('#fire').is_disabled()
    assert not errors, errors
    browser.close()
    print('PASS: hold/release, cap/cancel, pause/resume, help/lesson, restart, portrait/landscape, simultaneous touch move+charge, release, WebGL failure, no browser errors.')
