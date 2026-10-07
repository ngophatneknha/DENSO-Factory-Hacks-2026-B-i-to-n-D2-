"""Hugging Face Spaces Entrypoint for DENSO Factory Hacks 2026 - D2 Control Room.

Integrates FastAPI with Gradio to run 100% free on Hugging Face Spaces.
"""
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
sys.path.insert(0, str(backend_dir))

# Configure paths for cloud runtime
os.environ.setdefault("D2_VAR_DIR", str(backend_dir / "var"))
os.environ.setdefault("D2_FRONTEND_DIST", str(root_dir / "frontend" / "dist"))

import uvicorn
from app.main import app as fastapi_app

# Gradio wrapper for Hugging Face Space detection
try:
    import gradio as gr
    with gr.Blocks(title="DENSO Factory Hacks 2026 - D2 Control Room") as demo:
        gr.Markdown("# 🏭 DENSO Factory Hacks 2026 - D2 Logistics Control Room")
        gr.Markdown(
            "Hệ thống Ra quyết định Thông minh & Bản sao số Logistics Nội bộ Nhà máy.\n\n"
            "👉 **[BẤM VÀO ĐÂY ĐỂ MỞ CONTROL ROOM GIAO DIỆN CHÍNH](/)**"
        )
    app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")
except ImportError:
    app = fastapi_app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
