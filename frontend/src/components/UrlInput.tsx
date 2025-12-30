import React, {useState} from 'react';
import {
    VStack,
    Input,
    Button,
    FormControl,
    FormLabel,
    FormHelperText,
    Alert,
    AlertIcon,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Text,
    useToast,
} from '@chakra-ui/react';
import {useForm} from 'react-hook-form';
import {apiClient} from '../api/client';

interface UrlInputProps {
    onTaskStart: (taskId: string) => void;
    disabled?: boolean;
}

interface FormData {
    url: string;
}

const UrlInput: React.FC<UrlInputProps> = ({onTaskStart, disabled = false}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [threshold, setThreshold] = useState(0.5);
    const toast = useToast();

    const {
        register,
        handleSubmit,
        formState: {errors},
        reset,
    } = useForm<FormData>();

    const onSubmit = async (data: FormData) => {
        setIsProcessing(true);

        try {
            const response = await apiClient.processUrl({
                url: data.url,
                threshold,
            });

            onTaskStart(response.task_id);
            reset();

            toast({
                title: 'Processing started!',
                description: 'Your image is being downloaded and processed...',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        } catch (error: any) {
            // Handle different error types
            let errorMessage = 'Failed to process URL. Please try again.';
            let errorTitle = 'Processing failed';

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                errorTitle = 'Request timeout';
                errorMessage = 'The server took too long to respond. The image might be too large or unavailable. Please try again.';
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
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={4} w="full">
                {/* Threshold Slider */}
                <FormControl>
                    <FormLabel>Segmentation Threshold: {threshold}</FormLabel>
                    <Slider
                        value={threshold}
                        onChange={setThreshold}
                        min={0.1}
                        max={0.9}
                        step={0.1}
                        isDisabled={disabled || isProcessing}
                    >
                        <SliderTrack>
                            <SliderFilledTrack bg="vegetation.400"/>
                        </SliderTrack>
                        <SliderThumb/>
                    </Slider>
                    <FormHelperText>
                        Lower values detect more vegetation, higher values are more selective
                    </FormHelperText>
                </FormControl>

                {/* URL Input */}
                <FormControl isInvalid={!!errors.url}>
                    <FormLabel>Image URL</FormLabel>
                    <Input
                        {...register('url', {
                            required: 'URL is required',
                            pattern: {
                                value: /^https?:\/\/.+\.(jpg|jpeg|png|tif|tiff)(\?.*)?$/i,
                                message: 'Please enter a valid image URL (JPEG, PNG, TIFF, or GeoTIFF)',
                            },
                        })}
                        placeholder="https://example.com/image.jpg"
                        variant="filled"
                        disabled={disabled || isProcessing}
                    />
                    {errors.url && (
                        <Text color="red.500" fontSize="sm" mt={1}>
                            {errors.url.message}
                        </Text>
                    )}
                    <FormHelperText>
                        Enter a direct link to an image file
                    </FormHelperText>
                </FormControl>

                {/* Submit Button */}
                <Button
                    type="submit"
                    w="full"
                    colorScheme="vegetation"
                    isLoading={isProcessing}
                    loadingText="Processing..."
                    disabled={disabled}
                    size="lg"
                >
                    Process Image
                </Button>

                {/* Info Alert */}
                <Alert status="info" borderRadius="md">
                    <AlertIcon/>
                    <Text fontSize="sm">
                        Supported formats: JPEG, PNG, TIFF, GeoTIFF. The image must be publicly accessible.
                    </Text>
                </Alert>
            </VStack>
        </form>
    );
};

export default UrlInput;