"""Verify real repository-subdirectory hosting, as on GitHub Pages."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root.parent)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page()
        failures = []
        page.on('pageerror', lambda error: failures.append(str(error)))
        page.on('response', lambda response: failures.append(response.url) if response.status >= 400 else None)
        page.goto(f'http://127.0.0.1:{server.server_port}/{root.name}/')
        page.wait_for_function("!document.querySelector('#start').disabled")
        page.locator('#start').click()
        page.locator('#fire').focus()
        page.keyboard.down('Space')
        page.wait_for_timeout(200)
        assert page.locator('#fire').is_enabled()
        page.keyboard.up('Space')
        assert page.locator('#fire').is_disabled()
        assert not failures, failures
        browser.close()
    print('PASS: repository subdirectory loads all modules/assets; keyboard hold/release works.')
finally:
    server.shutdown()
    server.server_close()
