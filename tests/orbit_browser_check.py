from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).resolve().parents[1]/'.preview'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1100,'height':1000},device_scale_factor=.6)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8765/')
 page.locator('#lesson-open').click();page.locator('#star-distance').wait_for()
 background=page.locator('#background-stars').inner_html()
 values=[]
 for distance in ['120','220']:
  page.locator('#star-distance').fill(distance)
  page.locator('#orbit-time').fill('0')
  x=float(page.locator('#projected-star').get_attribute('cx'))
  y=float(page.locator('#physical-star circle').get_attribute('cy'))
  sky=float(page.locator('#apparent-star').evaluate('(el)=>parseFloat(el.style.left)'))
  arc=page.locator('#parallax-arc').get_attribute('d')
  values.append((x,y,sky,arc))
  assert page.locator('#background-stars').inner_html()==background
  assert sum('p' in s for s in page.locator('#orbit-map text').all_text_contents())==1
  page.locator('#orbit-time').fill('6')
  assert float(page.locator('#projected-star').get_attribute('cx'))>180
  assert float(page.locator('#physical-star circle').get_attribute('cy'))==y
  page.locator('#orbit-map').scroll_into_view_if_needed()
  page.screenshot(path=str(out/f'lesson-distance-{distance}.png'))
 assert abs(values[0][0]-180)>abs(values[1][0]-180)
 assert values[1][1]<values[0][1]
 assert abs(values[0][2]-50)>abs(values[1][2]-50)
 assert values[0][3]!=values[1][3]
 page.set_viewport_size({'width':390,'height':844})
 page.locator('#star-distance').scroll_into_view_if_needed()
 box=page.locator('#star-distance').bounding_box()
 assert box['x']>=0 and box['x']+box['width']<=390
 assert not errors,errors
 b.close()
 print('PASS: near/far geometry, smaller p and sky shift, stationary background, both orbit positions, single p label, mobile control, no page errors')
