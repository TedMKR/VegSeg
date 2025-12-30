from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl, validator
from typing import Optional
import aiofiles
import uuid
import os
import numpy as np
import cv2
import tensorflow as tf
from PIL import Image
import rasterio
import requests
from datetime import datetime
import logging
from pathlib import Path

# Set environment variable for segmentation_models BEFORE importing it
os.environ['SM_FRAMEWORK'] = 'tf.keras'
import segmentation_models as sm
import keras

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Vegetation Segmentation API",
    description="AI-powered vegetation segmentation from aerial imagery",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories
UPLOAD_DIR = Path("uploads")
RESULTS_DIR = Path("results")
MODEL_DIR = Path("models")
UPLOAD_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

# Mount static files for results
app.mount("/results", StaticFiles(directory="results"), name="results")

# Global model variable
model = None

# Model configuration
PATCH_SIZE = 512
BACKBONE = "resnet34"
N_CLASSES = 7
VEGETATION_CLASSES = [1, 2, 3, 4, 5, 6]  # All non-background classes as vegetation

# In-memory task storage
tasks = {}


# Pydantic models
class ImageUrlRequest(BaseModel):
    url: HttpUrl
    threshold: Optional[float] = 0.5

    @validator('threshold')
    def validate_threshold(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('Threshold must be between 0.0 and 1.0')
        return v

class SegmentationResponse(BaseModel):
    task_id: str
    status: str
    message: str
    created_at: datetime

def load_model():
    """Load the trained vegetation segmentation model"""
    global model
    model_path = MODEL_DIR / "model7.keras"

    try:
        if not model_path.exists():
            logger.error(f"Model not found at {model_path}")
            raise FileNotFoundError(f"Model file not found: {model_path}")

        # Configure TensorFlow
        gpus = tf.config.list_physical_devices('GPU')
        if gpus:
            try:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                logger.info(f"Found {len(gpus)} GPU(s), memory growth enabled")
            except RuntimeError as e:
                logger.warning(f"Could not set memory growth: {e}")
        else:
            logger.info("No GPU found, using CPU")
            tf.config.threading.set_intra_op_parallelism_threads(4)
            tf.config.threading.set_inter_op_parallelism_threads(2)

        # Load model
        logger.info(f"Loading model from {model_path}...")
        try:
            model = keras.saving.load_model(str(model_path), compile=False)
        except (TypeError, AttributeError):
            model = tf.keras.models.load_model(str(model_path), compile=False)

        logger.info(f"Model loaded successfully")
        logger.info(f"Input shape: {model.input_shape}")
        logger.info(f"Output shape: {model.output_shape}")
        return True

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise RuntimeError(f"Could not load model7.keras: {e}")

def extract_patches(image, patch_size=512):
    """Extract overlapping patches from image for processing"""
    h, w, c = image.shape
    stride = patch_size

    # Pad if image is smaller than patch size
    if h < patch_size or w < patch_size:
        pad_h = max(0, patch_size - h)
        pad_w = max(0, patch_size - w)
        image = np.pad(image, ((0, pad_h), (0, pad_w), (0, 0)), mode='reflect')
        h, w, c = image.shape

    patches = []
    positions = []

    # Extract patches
    for y in range(0, h - patch_size + 1, stride):
        for x in range(0, w - patch_size + 1, stride):
            patch = image[y:y + patch_size, x:x + patch_size, :]
            patches.append(patch)
            positions.append((y, x))

    # Handle edges
    if h % patch_size != 0:
        y = h - patch_size
        for x in range(0, w - patch_size + 1, stride):
            if (y, x) not in positions:
                patches.append(image[y:y + patch_size, x:x + patch_size, :])
                positions.append((y, x))

    if w % patch_size != 0:
        x = w - patch_size
        for y in range(0, h - patch_size + 1, stride):
            if (y, x) not in positions:
                patches.append(image[y:y + patch_size, x:x + patch_size, :])
                positions.append((y, x))

    # Bottom-right corner
    if h % patch_size != 0 and w % patch_size != 0:
        y, x = h - patch_size, w - patch_size
        if (y, x) not in positions:
            patches.append(image[y:y + patch_size, x:x + patch_size, :])
            positions.append((y, x))

    return np.array(patches), positions, (h, w, c)


def reconstruct_from_patches(predictions, positions, original_shape, patch_size=512):
    """Reconstruct full image from patch predictions"""
    h, w, _ = original_shape
    output_mask = np.zeros((h, w), dtype=np.float32)
    count_mask = np.zeros((h, w), dtype=np.float32)

    for pred, (y, x) in zip(predictions, positions):
        output_mask[y:y + patch_size, x:x + patch_size] += pred
        count_mask[y:y + patch_size, x:x + patch_size] += 1

    output_mask = output_mask / np.maximum(count_mask, 1)
    return output_mask.astype(np.uint8)


def segment_image_with_patches(image_array, model, patch_size=512, backbone='resnet34', batch_size=8):
    """Segment full image using patch-based approach"""
    start_time = datetime.now()
    original_shape = image_array.shape
    logger.info(f"Processing image of shape {original_shape}")

    # Preprocess image
    preprocess_input = sm.get_preprocessing(backbone)
    preprocessed_image = preprocess_input(image_array.astype(np.float32))

    # Extract patches
    patches, positions, padded_shape = extract_patches(preprocessed_image, patch_size)
    logger.info(f"Extracted {len(patches)} patches")

    # Run prediction
    predictions = model.predict(patches, batch_size=batch_size, verbose=1)
    predicted_masks = np.argmax(predictions, axis=-1)

    # Reconstruct full mask
    full_mask = reconstruct_from_patches(predicted_masks, positions, padded_shape, patch_size)
    full_mask = full_mask[:original_shape[0], :original_shape[1]]

    processing_time = (datetime.now() - start_time).total_seconds()
    logger.info(f"Segmentation completed in {processing_time:.2f}s")
    logger.info(f"Unique classes: {np.unique(full_mask)}")

    return full_mask

async def process_image_file(file_path: Path, task_id: str, threshold: float = 0.5):
    """Process uploaded image file using trained model"""
    try:
        start_time = datetime.now()

        if model is None:
            raise RuntimeError("Model not loaded")

        # Update task status
        tasks[task_id]["status"] = "processing"
        tasks[task_id]["progress"] = 30
        tasks[task_id]["message"] = "Loading image..."

        # Load image
        if str(file_path).lower().endswith(('.tif', '.tiff')):
            with rasterio.open(file_path) as src:
                image_array = src.read()
                if image_array.shape[0] <= 4:
                    image_array = np.transpose(image_array, (1, 2, 0))
                if image_array.shape[2] > 3:
                    image_array = image_array[:, :, :3]
        else:
            image = Image.open(file_path)
            image_array = np.array(image.convert('RGB'))

        original_shape = image_array.shape[:2]
        logger.info(f"Loaded image with shape: {image_array.shape}")

        # Update progress
        tasks[task_id]["progress"] = 50
        tasks[task_id]["message"] = "Running segmentation..."

        # Run segmentation
        segmentation_mask = segment_image_with_patches(
            image_array, model, PATCH_SIZE, BACKBONE, batch_size=8
        )

        # Create binary vegetation mask
        binary_mask = np.isin(segmentation_mask, VEGETATION_CLASSES).astype(np.float32)

        # Update progress
        tasks[task_id]["progress"] = 80
        tasks[task_id]["message"] = "Generating results..."

        # Calculate vegetation percentage
        vegetation_percentage = (binary_mask.sum() / binary_mask.size) * 100

        # Save results
        result_path = RESULTS_DIR / f"{task_id}_result.png"
        cv2.imwrite(str(result_path), binary_mask.astype(np.uint8) * 255)

        segmentation_path = RESULTS_DIR / f"{task_id}_segmentation.png"
        segmentation_vis = (segmentation_mask * (255 // N_CLASSES)).astype(np.uint8)
        cv2.imwrite(str(segmentation_path), segmentation_vis)

        # Create overlay
        overlay_path = RESULTS_DIR / f"{task_id}_overlay.png"
        overlay = image_array.copy()
        overlay[binary_mask > 0] = [0, 255, 0]
        blended = cv2.addWeighted(image_array, 0.7, overlay, 0.3, 0)
        cv2.imwrite(str(overlay_path), cv2.cvtColor(blended, cv2.COLOR_RGB2BGR))

        processing_time = (datetime.now() - start_time).total_seconds()

        # Update task with results
        tasks[task_id].update({
            "status": "completed",
            "progress": 100,
            "message": "Segmentation completed",
            "result": {
                "vegetation_percentage": round(vegetation_percentage, 2),
                "processing_time": round(processing_time, 2),
                "method": f"AI Model ({N_CLASSES} classes)",
                "result_mask_url": f"/results/{task_id}_result.png",
                "overlay_url": f"/results/{task_id}_overlay.png",
                "segmentation_url": f"/results/{task_id}_segmentation.png",
                "image_dimensions": original_shape,
                "unique_classes": [int(c) for c in np.unique(segmentation_mask)]
            }
        })

        logger.info(f"Successfully processed image {task_id}")
        logger.info(f"Vegetation coverage: {vegetation_percentage:.2f}%")

    except Exception as e:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["message"] = f"Processing error: {str(e)}"
        logger.error(f"Error processing image {task_id}: {e}")

async def process_image_from_url(url: str, task_id: str, threshold: float = 0.5):
    """Process image from URL"""
    try:
        if model is None:
            raise RuntimeError("Model not loaded")

        tasks[task_id]["status"] = "downloading"
        tasks[task_id]["progress"] = 10
        tasks[task_id]["message"] = "Downloading image..."

        # Download image
        response = requests.get(str(url), timeout=30)
        response.raise_for_status()

        # Save downloaded image
        input_path = UPLOAD_DIR / f"{task_id}_input"
        with open(input_path, "wb") as f:
            f.write(response.content)

        # Process the image
        await process_image_file(input_path, task_id, threshold)

    except Exception as e:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["message"] = f"Error processing URL: {str(e)}"
        logger.error(f"Error processing URL {url}: {e}")


# API Endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    logger.info("Starting Vegetation Segmentation API...")
    try:
        model_loaded = load_model()
        if model_loaded:
            logger.info("API ready with model7.keras")
            logger.info(f"Patch size: {PATCH_SIZE}x{PATCH_SIZE}")
            logger.info(f"Classes: {N_CLASSES}")
    except Exception as e:
        logger.error(f"CRITICAL: Failed to load model7.keras: {e}")
        logger.error("Please copy model7.keras to backend/models/")
        raise


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Vegetation Segmentation API",
        "version": "1.0.0",
        "model_loaded": model is not None,
        "model_info": {
            "patch_size": PATCH_SIZE,
            "backbone": BACKBONE,
            "n_classes": N_CLASSES,
            "vegetation_classes": VEGETATION_CLASSES
        } if model is not None else None
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "model_loaded": True
    }


@app.post("/segment/upload")
async def segment_uploaded_image(
        background_tasks: BackgroundTasks,
        file: UploadFile = File(...),
        threshold: Optional[float] = 0.5
):
    """Upload and segment an image file"""
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.tif', '.tiff'}
    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Validate file size (max 50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024
    file_size = await file.read()
    if len(file_size) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
    await file.seek(0)

    # Validate threshold
    if not 0.0 <= threshold <= 1.0:
        raise HTTPException(status_code=400, detail="Threshold must be between 0.0 and 1.0")

    # Generate task ID
    task_id = str(uuid.uuid4())

    # Initialize task
    tasks[task_id] = {
        "task_id": task_id,
        "status": "uploading",
        "progress": 0,
        "message": "Uploading file...",
        "created_at": datetime.now()
    }

    try:
        # Save uploaded file
        file_path = UPLOAD_DIR / f"{task_id}_{file.filename}"
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)

        # Start background processing
        background_tasks.add_task(process_image_file, file_path, task_id, threshold)

        return SegmentationResponse(
            task_id=task_id,
            status="processing",
            message="Image uploaded successfully. Processing started.",
            created_at=datetime.now()
        )

    except Exception as e:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["message"] = f"Upload error: {str(e)}"
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/segment/url")
async def segment_image_from_url(background_tasks: BackgroundTasks, request: ImageUrlRequest):
    """Process image from URL"""
    task_id = str(uuid.uuid4())

    # Initialize task
    tasks[task_id] = {
        "task_id": task_id,
        "status": "queued",
        "progress": 0,
        "message": "Task queued for processing...",
        "created_at": datetime.now()
    }

    # Start background processing
    background_tasks.add_task(process_image_from_url, request.url, task_id, request.threshold)

    return {
        "task_id": task_id,
        "status": "queued",
        "message": "URL processing started",
        "created_at": datetime.now()
    }


@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get task status"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    task_data = tasks[task_id]
    return {
        "task_id": task_id,
        "status": task_data["status"],
        "progress": task_data.get("progress"),
        "message": task_data["message"],
        "result": task_data.get("result")
    }


@app.get("/tasks")
async def list_tasks(limit: int = 10, status: Optional[str] = None):
    """List tasks"""
    filtered_tasks = []
    for task in tasks.values():
        if status is None or task["status"] == status:
            filtered_tasks.append(task)
    filtered_tasks.sort(key=lambda x: x["created_at"], reverse=True)
    return {"tasks": filtered_tasks[:limit]}


@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete task"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        for pattern in [f"{task_id}_*"]:
            for directory in [UPLOAD_DIR, RESULTS_DIR]:
                for file_path in directory.glob(pattern):
                    file_path.unlink(missing_ok=True)
        del tasks[task_id]
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting task: {str(e)}")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, timeout_keep_alive=600)
