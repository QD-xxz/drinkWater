#!/usr/bin/env python3
import http.server
import socketserver
from datetime import datetime

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

PORT = 8080

with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
    print(f"服务器运行在 http://localhost:{PORT}")
    print(f"启动时间: {datetime.now()}")
    print("按 Ctrl+C 停止服务器")
    httpd.serve_forever()
