from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pathlib import Path


def setup_static_files(app: FastAPI):
    """Setup static file serving for results"""

    # Create results directory if it doesn't exist
    results_dir = Path("results")
    results_dir.mkdir(exist_ok=True)

    # Mount static files
    app.mount("/results", StaticFiles(directory="results"), name="results")

    @app.get("/results/{filename}")
    async def get_result_file(filename: str):
        """Serve result files with proper headers"""
        file_path = results_dir / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(
            path=file_path,
            media_type="image/png",
            headers={"Cache-Control": "no-cache"}
        )
