import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 300000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export interface TaskStatus {
    task_id: string;
    status: string;
    progress?: number;
    message: string;
    result?: {
        vegetation_percentage: number;
        processing_time: number;
        method?: string;
        result_mask_url: string;
        overlay_url: string;
        segmentation_url?: string;
        image_dimensions: number[];
        unique_classes?: number[];
    };
}

export interface SegmentationResponse {
    task_id: string;
    status: string;
    message: string;
    result_url?: string;
    vegetation_percentage?: number;
    processing_time?: number;
    created_at: string;
}

export interface UrlRequest {
    url: string;
    threshold?: number;
}

export class ApiClient {
    // Health check
    async healthCheck() {
        const response = await axiosInstance.get('/health');
        return response.data;
    }

    // Upload file for segmentation
    async uploadFile(file: File, threshold: number = 0.5): Promise<SegmentationResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.post(
            `/segment/upload?threshold=${threshold}`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    }

    // Process image from URL
    async processUrl(data: UrlRequest): Promise<SegmentationResponse> {
        const response = await axiosInstance.post('/segment/url', data);
        return response.data;
    }

    // Get task status
    async getTaskStatus(taskId: string): Promise<TaskStatus> {
        const response = await axiosInstance.get(`/tasks/${taskId}`);
        return response.data;
    }

    // List tasks
    async listTasks(limit: number = 10, status?: string) {
        const params: any = {limit};
        if (status) params.status = status;

        const response = await axiosInstance.get('/tasks', {params});
        return response.data;
    }

    // Delete task
    async deleteTask(taskId: string) {
        const response = await axiosInstance.delete(`/tasks/${taskId}`);
        return response.data;
    }

    // Get result file URL
    getResultUrl(filename: string): string {
        return `${API_BASE_URL}/results/${filename}`;
    }
}

export const apiClient = new ApiClient();