import React, {useCallback, useState} from 'react';
import {useDropzone} from 'react-dropzone';
import {
    Box,
    VStack,
    Text,
    Icon,
    Button,
    Progress,
    Alert,
    AlertIcon,
    HStack,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    FormLabel,
    useToast,
} from '@chakra-ui/react';
import {FaCloudUploadAlt, FaFile} from 'react-icons/fa';
import {apiClient} from '../api/client';

interface FileUploadProps {
    onTaskStart: (taskId: string) => void;
    disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({onTaskStart, disabled = false}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [threshold, setThreshold] = useState(0.5);
    const toast = useToast();

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;

            const file = acceptedFiles[0];

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff'];
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
            const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

            if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
                toast({
                    title: 'Invalid file type',
                    description: 'Please upload JPEG, PNG, TIFF, or GeoTIFF files only.',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

            // Validate file size (50MB)
            if (file.size > 50 * 1024 * 1024) {
                toast({
                    title: 'File too large',
                    description: 'Please upload files smaller than 50MB.',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

            setIsUploading(true);
            setUploadProgress(0);

            // Progress simulation interval
            let progressInterval: NodeJS.Timeout | null = null;

            try {
                // Simulate upload progress (stops at 90%)
                progressInterval = setInterval(() => {
                    setUploadProgress((prev) => Math.min(prev + 10, 90));
                }, 200);

                const response = await apiClient.uploadFile(file, threshold);

                // Upload successful - complete progress
                if (progressInterval) {
                    clearInterval(progressInterval);
                    progressInterval = null;
                }
                setUploadProgress(100);

                setTimeout(() => {
                    setIsUploading(false);
                    setUploadProgress(0);
                    onTaskStart(response.task_id);
                }, 500);

                toast({
                    title: 'Upload successful!',
                    description: 'Your image is being processed...',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });

            } catch (error: any) {
                // Clean up progress interval on error
                if (progressInterval) {
                    clearInterval(progressInterval);
                    progressInterval = null;
                }
                setIsUploading(false);
                setUploadProgress(0);

                // Handle different error types
                let errorMessage = 'Upload failed. Please try again.';
                let errorTitle = 'Upload failed';

                if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                    errorTitle = 'Request timeout';
                    errorMessage = 'The server took too long to respond. The image might be too large or the server is busy. Please try again with a smaller image or wait a moment.';
                } else if (error.response?.status === 503) {
                    errorTitle = 'Service unavailable';
                    errorMessage = 'The segmentation model is not loaded. Please contact the administrator.';
                } else if (error.response?.data?.detail) {
                    errorMessage = error.response.data.detail;
                } else if (error.message) {
                    errorMessage = error.message;
                }

                toast({
                    title: errorTitle,
                    description: errorMessage,
                    status: 'error',
                    duration: 8000,
                    isClosable: true,
                });
            }
        },
        [threshold, onTaskStart, toast]
    );

    const {getRootProps, getInputProps, isDragActive, isDragReject} = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.tif', '.tiff']
        },
        maxFiles: 1,
        disabled: disabled || isUploading,
    });

    const getBorderColor = () => {
        if (isDragReject) return 'red.300';
        if (isDragActive) return 'vegetation.400';
        return 'gray.300';
    };

    const getBgColor = () => {
        if (isDragReject) return 'red.50';
        if (isDragActive) return 'vegetation.50';
        return 'gray.50';
    };

    return (
        <VStack spacing={4} w="full">
            {/* Threshold Slider */}
            <Box w="full">
                <FormLabel>Segmentation Threshold: {threshold}</FormLabel>
                <Slider
                    value={threshold}
                    onChange={setThreshold}
                    min={0.1}
                    max={0.9}
                    step={0.1}
                    isDisabled={disabled || isUploading}
                >
                    <SliderTrack>
                        <SliderFilledTrack bg="vegetation.400"/>
                    </SliderTrack>
                    <SliderThumb/>
                </Slider>
                <Text fontSize="sm" color="gray.500" mt={1}>
                    Lower values detect more vegetation, higher values are more selective
                </Text>
            </Box>

            {/* Upload Area */}
            <Box
                {...getRootProps()}
                w="full"
                h="200px"
                border="2px dashed"
                borderColor={getBorderColor()}
                borderRadius="lg"
                bg={getBgColor()}
                cursor={disabled || isUploading ? 'not-allowed' : 'pointer'}
                transition="all 0.2s"
                _hover={{
                    borderColor: disabled || isUploading ? getBorderColor() : 'vegetation.400',
                    bg: disabled || isUploading ? getBgColor() : 'vegetation.50',
                }}
            >
                <input {...getInputProps()} />
                <VStack justify="center" h="full" spacing={3}>
                    {isUploading ? (
                        <VStack spacing={3} w="80%">
                            <Icon as={FaFile} w={8} h={8} color="vegetation.400"/>
                            <Text color="vegetation.600" fontWeight="medium">
                                Uploading...
                            </Text>
                            <Progress value={uploadProgress} w="full" colorScheme="green" hasStripe/>
                            <Text fontSize="sm" color="gray.500">
                                {uploadProgress}%
                            </Text>
                        </VStack>
                    ) : (
                        <>
                            <Icon
                                as={FaCloudUploadAlt}
                                w={12}
                                h={12}
                                color={isDragActive ? 'vegetation.500' : 'gray.400'}
                            />
                            <VStack spacing={1}>
                                <Text fontWeight="medium" color={isDragActive ? 'vegetation.600' : 'gray.600'}>
                                    {isDragActive ? 'Drop your image here' : 'Drag & drop an image here'}
                                </Text>
                                <Text fontSize="sm" color="gray.400">
                                    or click to browse files
                                </Text>
                            </VStack>
                            <Button
                                size="sm"
                                variant="outline"
                                colorScheme="vegetation"
                                disabled={disabled || isUploading}
                            >
                                Choose File
                            </Button>
                        </>
                    )}
                </VStack>
            </Box>

            {/* Format Info */}
            <Alert status="info" borderRadius="md">
                <AlertIcon/>
                <Text fontSize="sm">
                    Supported formats: JPEG, PNG, TIFF, GeoTIFF (max 50MB)
                </Text>
            </Alert>
        </VStack>
    );
};

export default FileUpload;