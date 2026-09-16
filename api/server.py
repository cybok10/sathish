"""Small dependency-free API for the portfolio's approved student reviews."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

class PortfolioHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/testimonials":
            source = ROOT / "testimonials.json"
            entries = json.loads(source.read_text(encoding="utf-8"))
            approved = [entry for entry in entries if entry.get("approved") is True]
            body = json.dumps(approved).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404, "Not found")

if __name__ == "__main__":
    print("Portfolio API listening at http://localhost:8001/api/testimonials")
    ThreadingHTTPServer.allow_reuse_address = True
    ThreadingHTTPServer(("127.0.0.1", 8001), PortfolioHandler).serve_forever()
